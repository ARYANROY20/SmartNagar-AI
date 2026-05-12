import express from 'express';
import multer from 'multer';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  createComplaint,
  analyzeComplaintImage,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  updateComplaintAssignment,
  voteOnComplaint,
  getComments,
  addComment
} from '../controllers/complaintsController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', getComplaints);
router.post('/analyze', verifyFirebaseToken, upload.single('image'), analyzeComplaintImage);
router.get('/:id', getComplaintById);
router.get('/:id/comments', getComments);
router.post('/', verifyFirebaseToken, upload.single('image'), createComplaint);
router.patch('/:id/status', verifyFirebaseToken, updateComplaintStatus);
router.patch('/:id/assignment', verifyFirebaseToken, updateComplaintAssignment);
router.post('/:id/vote', verifyFirebaseToken, voteOnComplaint);
router.post('/:id/comments', verifyFirebaseToken, addComment);

export default router;
