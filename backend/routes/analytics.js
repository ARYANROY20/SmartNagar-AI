import express from 'express';
import { getHeatmapData, getSummary, getWardAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/heatmap', getHeatmapData);
router.get('/summary', getSummary);
router.get('/wards', getWardAnalytics);

export default router;
