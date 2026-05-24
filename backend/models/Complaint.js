import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: 'Anonymous Citizen' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const timelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  actor: { type: String, default: 'System' },
  createdAt: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' }
  },
  category: {
    type: String,
    enum: ['Road Maintenance', 'Water & Sanitation', 'Electrical & Streetlights', 'Garbage & Waste', 'Public Infrastructure'],
    required: true
  },
  status: {
    type: String,
    enum: ['Reported', 'Pending Review', 'Assigned', 'Scheduled', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Pending Review'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  userId: { type: String, required: true },
  userName: { type: String, default: 'Anonymous' },
  assignedTo: { type: String, default: '' },
  assignedDepartment: { type: String, default: '' },
  taskNotes: { type: String, default: '' },
  dueDate: { type: Date, default: null },
  slaDueDate: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  resolutionImageUrl: { type: String, default: '' },
  resolutionNote: { type: String, default: '' },
  ward: { type: String, default: '' },
  voteCount: { type: Number, default: 0 },
  comments: { type: [commentSchema], default: [] },
  timeline: { type: [timelineSchema], default: [] },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

complaintSchema.virtual('id').get(function getId() {
  return this._id.toString();
});

complaintSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.locationName = ret.location?.address || `Lat: ${ret.location?.lat?.toFixed?.(5) || ret.location?.lat}, Lng: ${ret.location?.lng?.toFixed?.(5) || ret.location?.lng}`;
    ret.latitude = ret.location?.lat;
    ret.longitude = ret.location?.lng;
    ret.upvotesCount = ret.voteCount;
    ret.isOverdue = !!ret.slaDueDate && !['Resolved', 'Rejected'].includes(ret.status) && new Date(ret.slaDueDate) < new Date();
    return ret;
  }
});

export default mongoose.model('Complaint', complaintSchema);
