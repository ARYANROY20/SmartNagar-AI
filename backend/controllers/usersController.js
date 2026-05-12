import User from '../models/User.js';

export async function syncUser(req, res) {
  try {
    const { uid, email, name, picture } = req.user;
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email || '',
        name: name || 'Anonymous',
        photoURL: picture || '',
        role: email === 'asadhasan1709@gmail.com' ? 'admin' : 'citizen'
      });
      await user.save();
    } else if (email === 'asadhasan1709@gmail.com' && user.role !== 'admin') {
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
