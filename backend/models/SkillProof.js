const mongoose = require('mongoose');

const SkillQuestionSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topic: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true }
});

const SkillAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  evidenceId: { type: String, unique: true, required: true },
  breakdown: {
    easy: { total: Number, correct: Number, accuracy: Number },
    medium: { total: Number, correct: Number, accuracy: Number },
    hard: { total: Number, correct: Number, accuracy: Number }
  },
  strongTopics: [{ type: String }],
  weakTopics: [{ type: String }],
  completedAt: { type: Date, default: Date.now }
});

module.exports = {
  SkillQuestion: mongoose.model('SkillQuestion', SkillQuestionSchema),
  SkillAssessment: mongoose.model('SkillAssessment', SkillAssessmentSchema)
};