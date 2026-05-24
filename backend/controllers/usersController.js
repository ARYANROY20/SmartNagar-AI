import User from '../models/User.js';

export async function syncUser(req, res) {
  try {
    const { uid, email, name, picture } = req.user;
    // ADMIN_EMAILS lets deployments promote known admins without hardcoding them.
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);
    const isConfiguredAdmin = adminEmails.includes((email || '').toLowerCase());
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email || '',
        name: name || email || uid,
        photoURL: picture || '',
        role: isConfiguredAdmin ? 'admin' : 'citizen'
      });
      await user.save();
    } else if (isConfiguredAdmin && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function requestAdminAccess(req, res) {
  try {
    const configuredCode = process.env.ADMIN_SIGNUP_CODE;
    const { code } = req.body;

    if (!configuredCode) {
      return res.status(500).json({ error: 'Admin signup is not configured' });
    }

    if (!code || code !== configuredCode) {
      return res.status(403).json({ error: 'Invalid admin access code' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      {
        firebaseUid: req.user.uid,
        email: req.user.email || '',
        name: req.user.name || 'Admin',
        photoURL: req.user.picture || '',
        role: 'admin'
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUserProfile(req, res) {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateUserProfile(req, res) {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name;
    if (typeof req.body.photoURL === 'string') updates.photoURL = req.body.photoURL;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.uid },
      updates,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getNotifications(req, res) {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findOne({ firebaseUid: req.params.uid }, 'notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const notifications = user.notifications
      .map(notification => notification.toJSON())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function markNotificationsRead(req, res) {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.notifications.forEach(notification => {
      notification.unread = false;
    });
    await user.save();
    res.json(user.notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function anonymizeUser(req, res) {
  try {
    // Users can anonymize only their own account record.
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.uid },
      {
        name: 'Deleted User',
        email: `deleted_${Date.now()}@local`,
        photoURL: '',
        notifications: []
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User anonymized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendSupportMessage(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const sender = await User.findOne({ firebaseUid: req.user.uid });
    const senderName = sender ? sender.name : (req.user.name || 'A user');
    // Support requests are delivered through admin notifications for now.
    await User.updateMany(
      { role: 'admin' },
      {
        $push: {
          notifications: {
            title: 'Support Request',
            message: `${senderName}: ${message}`,
            unread: true
          }
        }
      }
    );
    res.json({ message: 'Support message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
