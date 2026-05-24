import Complaint from '../models/Complaint.js';

export async function getHeatmapData(req, res) {
  try {
    const complaints = await Complaint.find({}, 'location priority');
    // Priority becomes heat intensity so urgent issues stand out on the map.
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
    // Run independent aggregate queries together to keep the dashboard snappy.
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

export async function getWardAnalytics(req, res) {
  try {
    const wards = await Complaint.aggregate([
      { $match: { isArchived: { $ne: true } } },
      {
        $group: {
          _id: { $ifNull: ['$ward', 'Unmapped Ward'] },
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: ['$status', ['Resolved', 'Rejected']] }] },
                    { $lt: ['$slaDueDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          urgent: { $sum: { $cond: [{ $in: ['$priority', ['URGENT', 'HIGH']] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 8 }
    ]);

    res.json(wards.map(ward => ({
      ward: ward._id || 'Unmapped Ward',
      total: ward.total,
      resolved: ward.resolved,
      overdue: ward.overdue,
      urgent: ward.urgent
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
