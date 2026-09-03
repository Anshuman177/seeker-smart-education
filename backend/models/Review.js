const mongoose = require('mongoose');

const PeerReviewSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillEndorsed: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  feedbackText: { type: String, default: '' },
  punctualityScore: { type: Number, min: 1, max: 5, default: 5 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PeerReview || mongoose.model('PeerReview', PeerReviewSchema);