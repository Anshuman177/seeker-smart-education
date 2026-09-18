const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  bookName: { 
    type: String, 
    default: '' 
  },
  authorName: { 
    type: String, 
    default: '' 
  },
  topic: { 
    type: String, 
  default: '' 
  },
  files: [
    {
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: Buffer, required: true } // Binary data safe rahega
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Exactly 7 days from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic deletion
  }
});

module.exports = mongoose.model('Material', materialSchema);