import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  createdAt: { type: Date, default: Date.now }
});

voteSchema.index({ userId: 1, complaintId: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);
