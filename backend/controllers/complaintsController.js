import fs from 'fs';
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

async function notifyComplaintOwner(userId, notification) {
  if (!userId) return;

  try {
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      {
        $setOnInsert: {
          firebaseUid: userId,
          email: 'unknown@example.com',
          name: 'Anonymous',
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
      imageUrl = `/uploads/${req.file.filename}`;

      if (!category || !title || !priority) {
        try {
          const imageData = fs.readFileSync(req.file.path, { encoding: 'base64' });
          const aiResult = await analyzeIssueImage(imageData, req.file.mimetype);
          title = title || aiResult.title;
          category = category || aiResult.category;
          priority = priority || aiResult.priority;
        } catch (error) {
          console.error('Gemini image analysis failed:', error.message);
        }
      }
    }

    const complaint = new Complaint({
      title: title || 'Civic issue report',
      description,
      imageUrl,
      location: { lat: parseFloat(lat), lng: parseFloat(lng), address },
      category: category || 'Public Infrastructure',
      assignedDepartment: departmentForCategory(category || 'Public Infrastructure'),
      priority: priority?.toUpperCase?.() || 'MEDIUM',
      status: 'Pending Review',
      userId: req.user.uid,
      userName: req.user.name || req.user.email
    });

    await complaint.save();
    res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function analyzeComplaintImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const imageData = fs.readFileSync(req.file.path, { encoding: 'base64' });
    const aiResult = await analyzeIssueImage(imageData, req.file.mimetype);
    fs.unlink(req.file.path, () => {});
    res.json(aiResult);
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getComplaints(req, res) {
  try {
    const { category, status, priority, userId, limit } = req.query;
    const filter = {};
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

export async function updateComplaintStatus(req, res) {
  try {
    const { status } = req.body;
    const newStatus = normalizeStatus(status);
    const oldComplaint = await Complaint.findById(req.params.id);
    if (!oldComplaint) return res.status(404).json({ error: 'Not found' });

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: newStatus, updatedAt: new Date() },
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
      assignedTo: assignedTo || '',
      assignedDepartment: assignedDepartment || departmentForCategory(existingComplaint.category),
      taskNotes: taskNotes || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      updatedAt: new Date()
    };

    if ((assignedTo || assignedDepartment) && !['Resolved', 'Rejected'].includes(existingComplaint.status)) {
      update.status = 'Assigned';
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!complaint) return res.status(404).json({ error: 'Not found' });

    if (complaint.userId && (assignedTo || assignedDepartment || update.assignedDepartment)) {
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
      userName: req.body.userName || req.user.name || req.user.email || 'Anonymous Citizen',
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
