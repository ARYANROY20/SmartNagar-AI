import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Vote from '../models/Vote.js';
import { analyzeIssueImage } from '../services/geminiService.js';

function normalizeStatus(status) {
  if (status === 'Reported') return 'Pending Review';
  return status || 'Pending Review';
}

function departmentForCategory(category) {
  const departments = {
    'Road Maintenance': 'Road Works',
    'Water & Sanitation': 'Water & Sanitation',
    'Electrical & Streetlights': 'Electrical',
    'Garbage & Waste': 'Waste Management',
    'Public Infrastructure': 'Public Infrastructure'
  };
  return departments[category] || 'Public Infrastructure';
}

function slaHoursFor(priority, category, text = '') {
  const priorityHours = {
    URGENT: 18,
    HIGH: 36,
    MEDIUM: 72,
    LOW: 120
  };
  const categoryMultiplier = {
    'Electrical & Streetlights': 0.65,
    'Water & Sanitation': 0.8,
    'Road Maintenance': 1,
    'Garbage & Waste': 1.15,
    'Public Infrastructure': 1.25
  };
  const emergencyPattern = /\b(exposed wire|fallen wire|electric shock|flood|sewage overflow|open manhole|blocked drain|major accident|fire|collapsed|dangerous)\b/i;
  const accessibilityPattern = /\b(school|hospital|main road|junction|market|elderly|children|ambulance|traffic)\b/i;
  let hours = priorityHours[priority] || priorityHours.MEDIUM;
  hours *= categoryMultiplier[category] || 1;
  if (emergencyPattern.test(text)) hours *= 0.55;
  if (accessibilityPattern.test(text)) hours *= 0.8;
  return Math.max(6, Math.round(hours));
}

function dueDateFor(priority, category, text = '', from = new Date()) {
  return new Date(from.getTime() + slaHoursFor(priority, category, text) * 60 * 60 * 1000);
}

function extractWard(address = '') {
  const wardMatch = address.match(/\b(?:ward|zone|sector)\s*[-:#]?\s*([a-z0-9 ]{1,40})/i);
  if (wardMatch) return wardMatch[0].replace(/\s+/g, ' ').trim();
  const parts = address.split(',').map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[1] : parts[0] || 'Unmapped Ward';
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = value => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function titleSimilarity(a = '', b = '') {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(word => word.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(word => word.length > 2));
  if (!wordsA.size || !wordsB.size) return 0;
  const overlap = [...wordsA].filter(word => wordsB.has(word)).length;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

async function findSimilarComplaints({ lat, lng, category, title }) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return [];

  const candidates = await Complaint.find({
    isArchived: { $ne: true },
    status: { $nin: ['Resolved', 'Rejected'] },
    ...(category ? { category } : {})
  }).limit(100);

  return candidates
    .map(complaint => ({
      complaint,
      distance: distanceKm(parsedLat, parsedLng, complaint.location?.lat, complaint.location?.lng),
      similarity: titleSimilarity(title, complaint.title)
    }))
    .filter(item => item.distance <= 0.5 && (!title || item.similarity >= 0.25))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(item => ({
      id: item.complaint.id,
      title: item.complaint.title,
      category: item.complaint.category,
      status: item.complaint.status,
      locationName: item.complaint.location?.address,
      distanceKm: Number(item.distance.toFixed(2)),
      createdAt: item.complaint.createdAt
    }));
}

async function notifyComplaintOwner(userId, notification) {
  if (!userId) return;

  try {
    // Upsert keeps notifications working even if an older complaint references
    // a user record that has not been synced into Mongo yet.
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      {
        $setOnInsert: {
          firebaseUid: userId,
          email: userId,
          name: userId,
          role: 'citizen',
          trustScore: 100
        },
        $push: { notifications: notification }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Could not create complaint notification:', error.message);
  }
}

export async function createComplaint(req, res) {
  try {
    const { description, lat, lng, address } = req.body;
    let title = req.body.title;
    let category = req.body.category;
    let priority = req.body.priority;
    let imageUrl = '';

    if (req.file) {
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      // Images are kept with the complaint document so no local uploads folder
      // is required in production.
      imageUrl = `data:${mimeType};base64,${base64Data}`;

      if (!category || !title || !priority) {
        try {
          // AI only fills fields that the user did not provide manually.
          const imageData = req.file.buffer.toString('base64');
          const aiResult = await analyzeIssueImage(imageData, req.file.mimetype);
          title = title || aiResult.title;
          category = category || aiResult.category;
          priority = priority || aiResult.priority;
        } catch (error) {
          console.error('Gemini image analysis failed:', error.message);
        }
      }
    }

    const normalizedPriority = priority?.toUpperCase?.() || 'MEDIUM';
    const normalizedCategory = category || 'Public Infrastructure';
    const now = new Date();
    const duplicateCandidates = await findSimilarComplaints({ lat, lng, category, title });
    const complaint = new Complaint({
      title: title || description || category || 'Reported issue',
      description,
      imageUrl,
      location: { lat: parseFloat(lat), lng: parseFloat(lng), address },
      category: normalizedCategory,
      assignedDepartment: departmentForCategory(normalizedCategory),
      priority: normalizedPriority,
      status: 'Pending Review',
      slaDueDate: dueDateFor(normalizedPriority, normalizedCategory, `${title || ''} ${description || ''}`, now),
      ward: extractWard(address),
      userId: req.user.uid,
      userName: req.user.name || req.user.email,
      timeline: [{
        status: 'Pending Review',
        message: 'Complaint reported by citizen',
        actor: req.user.name || req.user.email || req.user.uid,
        createdAt: now
      }]
    });

    await complaint.save();
    const response = complaint.toJSON();
    response.duplicateCandidates = duplicateCandidates;
    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getDuplicateComplaints(req, res) {
  try {
    const duplicates = await findSimilarComplaints(req.query);
    res.json(duplicates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function analyzeComplaintImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const imageData = req.file.buffer.toString('base64');
    const aiResult = await analyzeIssueImage(imageData, req.file.mimetype);
    res.json(aiResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getComplaints(req, res) {
  try {
    const { category, status, priority, userId, limit, isArchived } = req.query;
    const filter = {};
    // Normal views hide archived complaints unless the caller asks otherwise.
    if (isArchived === 'true') {
      filter.isArchived = true;
    } else if (isArchived === 'all') {
      // do nothing
    } else {
      filter.isArchived = { $ne: true };
    }
    if (category) filter.category = category;
    if (status) filter.status = normalizeStatus(status);
    if (priority) filter.priority = priority;
    if (userId) filter.userId = userId;

    let query = Complaint.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));
    const complaints = await query;
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getComplaintById(req, res) {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateComplaintArchive(req, res) {
  try {
    const { isArchived } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { isArchived: !!isArchived, updatedAt: new Date() },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateComplaintStatus(req, res) {
  try {
    const { status } = req.body;
    const newStatus = normalizeStatus(status);
    const oldComplaint = await Complaint.findById(req.params.id);
    if (!oldComplaint) return res.status(404).json({ error: 'Not found' });

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: newStatus,
          resolvedAt: newStatus === 'Resolved' ? new Date() : oldComplaint.resolvedAt,
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: newStatus,
            message: `Status changed to ${newStatus}`,
            actor: req.user.name || req.user.email || req.user.uid
          }
        }
      },
      { new: true }
    );

    if (oldComplaint.userId && oldComplaint.status !== newStatus) {
      let scoreDelta = 0;
      if (newStatus === 'Resolved') scoreDelta = 10;
      if (newStatus === 'Rejected') scoreDelta = -10;
      if (oldComplaint.status === 'Resolved') scoreDelta -= 10;
      if (oldComplaint.status === 'Rejected') scoreDelta += 10;

      const notification = {
        title: 'Status Update',
        message: `Your complaint "${oldComplaint.title || oldComplaint.category}" has been updated to: ${newStatus}`,
        unread: true,
        complaintId: oldComplaint.id
      };

      if (newStatus === 'Resolved') {
        notification.title = 'Complaint Resolved!';
        notification.message = `Great news! Your issue "${oldComplaint.title || oldComplaint.category}" has been resolved. Thank you for making the city better.`;
      } else if (newStatus === 'Assigned') {
        notification.title = 'Complaint Assigned';
        notification.message = `Your issue "${oldComplaint.title || oldComplaint.category}" has been assigned to the responsible department.`;
      } else if (newStatus === 'Scheduled') {
        notification.title = 'Maintenance Scheduled';
        notification.message = `We have scheduled maintenance for your report: "${oldComplaint.title || oldComplaint.category}".`;
      } else if (newStatus === 'In Progress') {
        notification.title = 'Work in Progress';
        notification.message = `Authorities are currently working on your issue: "${oldComplaint.title || oldComplaint.category}".`;
      }

      await notifyComplaintOwner(oldComplaint.userId, notification);
      if (scoreDelta !== 0) {
        try {
          await User.findOneAndUpdate({ firebaseUid: oldComplaint.userId }, { $inc: { trustScore: scoreDelta } });
        } catch (error) {
          console.error('Could not update trust score:', error.message);
        }
      }
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateComplaintAssignment(req, res) {
  try {
    const { assignedTo, assignedDepartment, taskNotes, dueDate } = req.body;
    const existingComplaint = await Complaint.findById(req.params.id);
    if (!existingComplaint) return res.status(404).json({ error: 'Not found' });

    const update = {
      $set: {
        assignedTo: assignedTo || '',
        assignedDepartment: assignedDepartment || departmentForCategory(existingComplaint.category),
        taskNotes: taskNotes || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        updatedAt: new Date()
      },
      $push: {
        timeline: {
          status: 'Assigned',
          message: `Assigned to ${assignedTo || assignedDepartment || departmentForCategory(existingComplaint.category)}`,
          actor: req.user.name || req.user.email || req.user.uid
        }
      }
    };

    if ((assignedTo || assignedDepartment) && !['Resolved', 'Rejected'].includes(existingComplaint.status)) {
      update.$set.status = 'Assigned';
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!complaint) return res.status(404).json({ error: 'Not found' });

    if (complaint.userId && (assignedTo || assignedDepartment || update.$set.assignedDepartment)) {
      await notifyComplaintOwner(complaint.userId, {
        title: 'Complaint Assigned',
        message: `Your complaint "${complaint.title || complaint.category}" has been assigned to ${complaint.assignedDepartment || 'the responsible department'}.`,
        unread: true,
        complaintId: complaint.id
      });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateResolutionProof(req, res) {
  try {
    const { note } = req.body;
    let resolutionImageUrl = '';
    if (req.file) {
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      resolutionImageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    const update = {
      $set: {
        resolutionNote: note || '',
        resolvedAt: new Date(),
        status: 'Resolved',
        updatedAt: new Date()
      },
      $push: {
        timeline: {
          status: 'Resolved',
          message: 'Resolution proof uploaded',
          actor: req.user.name || req.user.email || req.user.uid
        }
      }
    };
    if (resolutionImageUrl) update.$set.resolutionImageUrl = resolutionImageUrl;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ error: 'Not found' });

    await notifyComplaintOwner(complaint.userId, {
      title: 'Resolution Proof Added',
      message: `Resolution proof has been uploaded for "${complaint.title || complaint.category}".`,
      unread: true,
      complaintId: complaint.id
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function voteOnComplaint(req, res) {
  try {
    const vote = new Vote({ userId: req.user.uid, complaintId: req.params.id });
    await vote.save();

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $inc: { voteCount: 1 }, updatedAt: new Date() },
      { new: true }
    );

    if (complaint?.userId && complaint.userId !== req.user.uid) {
      await User.findOneAndUpdate({ firebaseUid: complaint.userId }, { $inc: { trustScore: 1 } });
    }

    res.json(complaint);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already voted' });
    res.status(500).json({ error: err.message });
  }
}

export async function getComments(req, res) {
  try {
    const complaint = await Complaint.findById(req.params.id, 'comments');
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    const comments = complaint.comments
      .map(comment => comment.toJSON())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addComment(req, res) {
  try {
    const comment = {
      userId: req.user.uid,
      userName: req.body.userName || req.user.name || req.user.email || req.user.uid,
      text: req.body.text
    };
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: comment }, updatedAt: new Date() },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    res.status(201).json(complaint.comments[complaint.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
