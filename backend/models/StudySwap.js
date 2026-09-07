const mongoose = require('mongoose');/*
|--------------------------------------------------------------------------
| Learning Request
|--------------------------------------------------------------------------
*/const LearningRequestSchema = new mongoose.Schema(
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
  {
    timestamps: false
  }
);/*
|--------------------------------------------------------------------------
| Notification
|--------------------------------------------------------------------------
*/const NotificationSchema = new mongoose.Schema(
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
      enum: [
        'HOST_CANCELLATION',
        'SESSION_SCHEDULED',
        'GENERAL'
      ],
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
  {
    timestamps: false
  }
);/*
|--------------------------------------------------------------------------
| Learning Session
|--------------------------------------------------------------------------
*/const LearningSessionSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | StudySwap relationship
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Users
    |--------------------------------------------------------------------------
    */

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Existing database field names preserved
    // to avoid breaking existing StudySwap data.
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

    /*
    |--------------------------------------------------------------------------
    | Session Details
    |--------------------------------------------------------------------------
    */

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
      enum: [
        'SCHEDULED',
        'LIVE',
        'COMPLETED',
        'CANCELLED'
      ],
      default: 'SCHEDULED',
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Host Notice
    |--------------------------------------------------------------------------
    */

    hostNotice: {
      reason: {
        type: String,
        trim: true
      },

      message: {
        type: String,
        trim: true
      },

      sentAt: {
        type: Date
      }
    },

    /*
    |--------------------------------------------------------------------------
    | Chat
    |--------------------------------------------------------------------------
    */

    chatMessages: [
      {
        senderName: {
          type: String,
          trim: true
        },

        message: {
          type: String,
          trim: true
        },

        sentAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    /*
    |--------------------------------------------------------------------------
    | Shared Notes
    |--------------------------------------------------------------------------
    */

    sharedNotes: {
      type: String,
      default: ''
    },

    /*
    |--------------------------------------------------------------------------
    | Active Caption
    |--------------------------------------------------------------------------
    */

    activeCaption: {
      speakerName: {
        type: String,
        trim: true
      },

      originalText: {
        type: String,
        trim: true
      },

      translatedText: {
        type: String,
        trim: true
      },

      sourceLang: {
        type: String,
        trim: true
      },

      updatedAt: {
        type: Date
      }
    },

    /*
    |--------------------------------------------------------------------------
    | WebRTC Signaling
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Every signal has:
    | - automatic _id
    | - sender
    | - receiver
    | - type
    | - payload
    | - timestamp
    |
    | This allows the REST polling system to deliver the correct
    | WebRTC signal to the correct user.
    |
    */

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
          enum: [
            'offer',
            'answer',
            'ice-candidate',
            'participant-left'
          ],
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
        }
      }
    ],

    /*
    |--------------------------------------------------------------------------
    | Session Lifecycle
    |--------------------------------------------------------------------------
    */

    createdAt: {
      type: Date,
      default: Date.now
    },

    endedAt: {
      type: Date
    }
  },
  {
    timestamps: false
  }
);/*
|--------------------------------------------------------------------------
| Models
|--------------------------------------------------------------------------
*/module.exports = {
  LearningRequest:
    mongoose.models.LearningRequest ||
    mongoose.model(
      'LearningRequest',
      LearningRequestSchema
    ),

  LearningSession:
    mongoose.models.LearningSession ||
    mongoose.model(
      'LearningSession',
      LearningSessionSchema
    ),

  Notification:
    mongoose.models.Notification ||
    mongoose.model(
      'Notification',
      NotificationSchema
    )
};