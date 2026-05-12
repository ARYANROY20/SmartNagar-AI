import express from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  syncUser,
  requestAdminAccess,
  getUserProfile,
  updateUserProfile,
  getNotifications,
  markNotificationsRead
} from '../controllers/usersController.js';

const router = express.Router();

router.post('/sync', verifyFirebaseToken, syncUser);
router.post('/admin/access', verifyFirebaseToken, requestAdminAccess);
router.get('/:uid', getUserProfile);
router.patch('/:uid', verifyFirebaseToken, updateUserProfile);
router.get('/:uid/notifications', verifyFirebaseToken, getNotifications);
router.patch('/:uid/notifications/read', verifyFirebaseToken, markNotificationsRead);

export default router;
