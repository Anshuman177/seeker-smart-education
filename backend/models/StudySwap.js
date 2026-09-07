const mongoose = require('mongoose');

const LearningRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    skillOffered: {
      type: String,
      required: true,
      trim: true
    },
    skillRequested: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningSession'
    },
    type: {
      type: String,
      enum: ['HOST_CANCELLATION', 'SESSION_SCHEDULED', 'GENERAL'],
      default: 'GENERAL'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

const LearningSessionSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningRequest',
      required: true
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    studentA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    topicToCover: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 1
    },
    scheduledDate: {
      type: String,
      required: true,
      trim: true
    },
    scheduledTime: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true
    },
    hostNotice: {
      reason: { type: String, trim: true },
      message: { type: String, trim: true },
      sentAt: { type: Date }
    },
    chatMessages: [
      {
        senderName: { type: String, trim: true },
        message: { type: String, trim: true },
        sentAt: { type: Date, default: Date.now }
      }
    ],
    sharedNotes: {
      type: String,
      default: ''
    },
    activeCaption: {
      speakerName: { type: String, trim: true },
      originalText: { type: String, trim: true },
      translatedText: { type: String, trim: true },
      sourceLang: { type: String, trim: true },
      updatedAt: { type: Date }
    },
    signals: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        receiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        type: {
          type: String,
          enum: ['offer', 'answer', 'ice-candidate', 'participant-left'],
          required: true
        },
        payload: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        timestamp: {
          type: Number,
          default: Date.now,
          index: true
        },
        acknowledged: {
          type: Boolean,
          default: false
        }
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date }
  },
  { timestamps: false }
);

module.exports = {
  LearningRequest: mongoose.models.LearningRequest || mongoose.model('LearningRequest', LearningRequestSchema),
  LearningSession: mongoose.models.LearningSession || mongoose.model('LearningSession', LearningSessionSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
};