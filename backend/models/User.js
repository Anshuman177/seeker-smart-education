const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  college: { type: String, default: 'Engineering Institute' },
  bio: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  skillsTeach: [{ type: String }],
  skillsLearn: [{ type: String }],
  peerRating: { type: Number, default: 5.0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);