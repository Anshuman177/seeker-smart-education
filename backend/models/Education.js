const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  resources: [{ title: String, url: String, type: { type: String, default: 'Documentation' } }]
});

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, default: 'Computer Science' },
  description: { type: String, required: true },
  topics: [TopicSchema],
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true }
});

const QuizSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  topicTitle: { type: String, required: true },
  title: { type: String, required: true },
  questions: [QuestionSchema]
});

const QuizAttemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  topicTitle: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  isWeak: { type: Boolean, default: false },
  details: [{
    questionText: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    explanation: String
  }],
  attemptedAt: { type: Date, default: Date.now }
});

module.exports = {
  Subject: mongoose.model('Subject', SubjectSchema),
  Quiz: mongoose.model('Quiz', QuizSchema),
  QuizAttempt: mongoose.model('QuizAttempt', QuizAttemptSchema)
};