import express from 'express';
import { getHeatmapData, getSummary } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/heatmap', getHeatmapData);
router.get('/summary', getSummary);

export default router;
