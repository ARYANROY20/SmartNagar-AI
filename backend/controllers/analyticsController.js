import Complaint from '../models/Complaint.js';

export async function getHeatmapData(req, res) {
  try {
    const complaints = await Complaint.find({}, 'location priority');
    const points = complaints.map(c => ({
      lat: c.location.lat,
      lng: c.location.lng,
      intensity: c.priority === 'URGENT' ? 1 : c.priority === 'HIGH' ? 0.7 : 0.4
    }));
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSummary(req, res) {
  try {
    const [byCategory, byStatus, total] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.countDocuments()
    ]);
    res.json({ byCategory, byStatus, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
