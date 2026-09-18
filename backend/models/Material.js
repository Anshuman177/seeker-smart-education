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
  questionsCount: {
    type: Number,
    default: 5
  },
  marksPerQuestion: {
    type: String,
    default: ''
  },
  files: [
    {
      originalName: String,
      mimeType: String,
      size: Number,
      data: Buffer
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // 7 days TTL expiry as per project rules
  }
});

module.exports = mongoose.model('Material', materialSchema);