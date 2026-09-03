const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const { SkillChallenge, SkillAttempt } = require('./models/SkillProof');

async function testSkillProof() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    const student = await User.findOne({ email: 'test@seeker.edu' });

    // 1. Create or Find Python Challenge
    let challenge = await SkillChallenge.findOne({ skillName: 'Python' });
    if (!challenge) {
      challenge = await SkillChallenge.create({
        skillName: 'Python',
        level: 'Intermediate',
        title: 'Core Python & Data Structures Assessment',
        description: 'Prove algorithmic understanding of list comprehensions, dict operations, and complexity.',
        questions: [
          {
            questionText: 'What is the average time complexity of dictionary lookup in Python?',
            options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
            correctAnswerIndex: 2
          },
          {
            questionText: 'Which function converts an iterable into an iterator in Python?',
            options: ['iter()', 'next()', 'loop()', 'range()'],
            correctAnswerIndex: 0
          }
        ]
      });
      console.log('2. SkillChallenge Created');
    }

    // 2. Submit Answers (2/2 correct = 100% accuracy)
    const selectedAnswers = { 0: 2, 1: 0 };
    let score = 0;
    challenge.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) score++;
    });

    const accuracy = Math.round((score / challenge.questions.length) * 100);

    const attempt = await SkillAttempt.create({
      studentId: student._id,
      skillName: challenge.skillName,
      challengeId: challenge._id,
      score,
      totalQuestions: challenge.questions.length,
      accuracy
    });

    console.log('3. SkillAttempt Evaluated & Saved:');
    console.log({
      skill: attempt.skillName,
      score: `${attempt.score}/${attempt.totalQuestions}`,
      accuracy: `${attempt.accuracy}%`
    });

    // 4. Compute Aggregate Profile Level
    const allAttempts = await SkillAttempt.find({ studentId: student._id });
    const avgAcc = Math.round(allAttempts.reduce((a, b) => a + b.accuracy, 0) / allAttempts.length);
    const verifiedLevel = avgAcc >= 80 ? 'Advanced' : avgAcc >= 60 ? 'Intermediate' : 'Beginner';

    console.log('4. Verified Skill Profile Summary:');
    console.log({
      skill: 'Python',
      totalAttempts: allAttempts.length,
      averageAccuracy: `${avgAcc}%`,
      verifiedLevel
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testSkillProof();