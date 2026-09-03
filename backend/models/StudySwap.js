const mongoose = require('mongoose');

const LearningRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillOffered: { type: String, required: true },
  skillRequested: { type: String, required: true },
  message: { type: String },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession' },
  type: { type: String, enum: ['HOST_CANCELLATION', 'SESSION_SCHEDULED', 'GENERAL'], default: 'GENERAL' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  reason: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const LearningSessionSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningRequest', required: true },
  roomId: { type: String, required: true, unique: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Host
  studentB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Participant
  topicToCover: { type: String, required: true },
  durationMinutes: { type: Number, default: 30 },
  scheduledDate: { type: String, required: true }, // YYYY-MM-DD
  scheduledTime: { type: String, required: true }, // HH:mm (24hr)
  status: { type: String, enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
  hostNotice: {
    reason: { type: String },
    message: { type: String },
    sentAt: { type: Date }
  },
  chatMessages: [
    {
      senderName: String,
      message: String,
      sentAt: { type: Date, default: Date.now }
    }
  ],
  sharedNotes: { type: String, default: '' },
  activeCaption: {
    speakerName: String,
    originalText: String,
    translatedText: String,
    sourceLang: String,
    updatedAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

module.exports = {
  LearningRequest: mongoose.models.LearningRequest || mongoose.model('LearningRequest', LearningRequestSchema),
  LearningSession: mongoose.models.LearningSession || mongoose.model('LearningSession', LearningSessionSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
};