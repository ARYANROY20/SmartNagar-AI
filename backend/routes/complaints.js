import express from 'express';
import multer from 'multer';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  createComplaint,
  analyzeComplaintImage,
  getDuplicateComplaints,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  updateComplaintAssignment,
  updateResolutionProof,
  updateComplaintArchive,
  voteOnComplaint,
  getComments,
  addComment
} from '../controllers/complaintsController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getComplaints);
router.get('/duplicates', getDuplicateComplaints);
router.post('/analyze', verifyFirebaseToken, upload.single('image'), analyzeComplaintImage);
router.get('/:id', getComplaintById);
router.get('/:id/comments', getComments);
router.post('/', verifyFirebaseToken, upload.single('image'), createComplaint);
router.patch('/:id/status', verifyFirebaseToken, updateComplaintStatus);
router.patch('/:id/assignment', verifyFirebaseToken, updateComplaintAssignment);
router.patch('/:id/resolution', verifyFirebaseToken, upload.single('image'), updateResolutionProof);
router.patch('/:id/archive', verifyFirebaseToken, updateComplaintArchive);
router.post('/:id/vote', verifyFirebaseToken, voteOnComplaint);
router.post('/:id/comments', verifyFirebaseToken, addComment);

export default router;
