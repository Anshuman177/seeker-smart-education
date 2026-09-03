const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const { Subject, Quiz, QuizAttempt } = require('./models/Education');

async function testEducation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    // 1. Get test student
    const student = await User.findOne({ email: 'test@seeker.edu' });

    // 2. Create or find subject
    let subject = await Subject.findOne({ name: 'Operating Systems' });
    if (!subject) {
      subject = await Subject.create({
        name: 'Operating Systems',
        category: 'Core Computer Science',
        description: 'Process Management, Deadlocks, Memory Management, and File Systems.',
        topics: [
          {
            title: 'Process Management',
            description: 'CPU scheduling, Threads, and Concurrency.',
            content: 'A process is a program in execution containing program counter, stack, and data section.',
            resources: [{ title: 'Operating Systems Concept Docs', url: 'https://os-book.com' }]
          }
        ]
      });
      console.log('2. Subject & Topics Created');
    }

    // 3. Create Quiz
    let quiz = await Quiz.findOne({ topicTitle: 'Process Management' });
    if (!quiz) {
      quiz = await Quiz.create({
        subjectId: subject._id,
        topicTitle: 'Process Management',
        title: 'Process Scheduling Assessment',
        questions: [
          {
            questionText: 'Which scheduling algorithm is non-preemptive?',
            options: ['Round Robin', 'FCFS (First Come First Serve)', 'SRTF', 'Priority (Preemptive)'],
            correctAnswerIndex: 1
          },
          {
            questionText: 'What is a PCB in operating systems?',
            options: ['Process Control Block', 'Primary Circuit Board', 'Program Central Base', 'None of these'],
            correctAnswerIndex: 0
          }
        ]
      });
      console.log('3. Quiz Created');
    }

    // 4. Simulate a student scoring low (0 out of 2 = 0% -> Weak Topic Trigger)
    const selectedAnswers = { 0: 0, 1: 1 }; // Both incorrect
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) score++;
    });
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const isWeak = percentage < 60;

    const attempt = await QuizAttempt.create({
      studentId: student._id,
      subjectId: subject._id,
      quizId: quiz._id,
      topicTitle: quiz.topicTitle,
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      isWeak
    });

    console.log('4. Quiz Attempt Evaluated & Saved in MongoDB:');
    console.log({
      topic: attempt.topicTitle,
      score: `${attempt.score}/${attempt.totalQuestions}`,
      percentage: `${attempt.percentage}%`,
      isWeak: attempt.isWeak,
      recommendation: attempt.isWeak ? `Recommended: Revise ${attempt.topicTitle}` : 'Good mastery'
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testEducation();