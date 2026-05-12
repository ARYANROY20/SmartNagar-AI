import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  unread: { type: Boolean, default: true },
  complaintId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.virtual('id').get(function getId() {
  return this._id.toString();
});

notificationSchema.virtual('isNew')
  .get(function getIsNew() {
    return this.unread;
  })
  .set(function setIsNew(value) {
    this.unread = value;
  });

notificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, default: 'Anonymous' },
  photoURL: { type: String, default: '' },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  trustScore: { type: Number, default: 100 },
  notifications: { type: [notificationSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
