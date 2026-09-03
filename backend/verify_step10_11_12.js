const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const { SkillAttempt } = require('./models/SkillProof');
const { LearningRequest, LearningSession } = require('./models/StudySwap');

async function testStudySwap() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    // 1. Get or create Student A (Rahul)
    let studentA = await User.findOne({ email: 'rahul@seeker.edu' });
    if (!studentA) {
      const pw = await bcrypt.hash('Password123', 10);
      studentA = await User.create({
        name: 'Rahul Sharma',
        email: 'rahul@seeker.edu',
        password: pw,
        role: 'student',
        college: 'IIT Bombay',
        skillsTeach: ['Python', 'SQL', 'DBMS'],
        skillsLearn: ['React', 'DSA']
      });
    }

    // 2. Get or create Student B (Priya)
    let studentB = await User.findOne({ email: 'priya@seeker.edu' });
    if (!studentB) {
      const pw = await bcrypt.hash('Password123', 10);
      studentB = await User.create({
        name: 'Priya Patel',
        email: 'priya@seeker.edu',
        password: pw,
        role: 'student',
        college: 'BITS Pilani',
        skillsTeach: ['React', 'DSA'],
        skillsLearn: ['Python', 'DBMS']
      });
    }

    // 3. Bidirectional Matching Calculation
    const aTeach = studentA.skillsTeach.map(s => s.toLowerCase());
    const aLearn = studentA.skillsLearn.map(s => s.toLowerCase());
    const bTeach = studentB.skillsTeach.map(s => s.toLowerCase());
    const bLearn = studentB.skillsLearn.map(s => s.toLowerCase());

    const teachMatch = studentB.skillsLearn.filter(s => aTeach.includes(s.toLowerCase()));
    const learnMatch = studentB.skillsTeach.filter(s => aLearn.includes(s.toLowerCase()));

    let matchScore = 0;
    if (teachMatch.length > 0 && learnMatch.length > 0) {
      matchScore = 85 + Math.min(15, (teachMatch.length + learnMatch.length) * 5);
    }

    console.log('2. Match Calculated:');
    console.log({
      studentA: studentA.name,
      studentB: studentB.name,
      matchScore: `${matchScore}%`,
      youTeachThem: teachMatch,
      theyTeachYou: learnMatch
    });

    // 4. Send Request (PENDING)
    const request = await LearningRequest.create({
      senderId: studentA._id,
      receiverId: studentB._id,
      teachSkill: teachMatch[0],
      learnSkill: learnMatch[0],
      matchScore,
      message: 'Let us swap Python for React concepts!'
    });
    console.log('3. Request Created in MongoDB: Status =', request.status);

    // 5. Accept Request & Schedule Session (ACCEPTED -> SCHEDULED)
    request.status = 'ACCEPTED';
    await request.save();

    const session = await LearningSession.create({
      requestId: request._id,
      studentA: studentA._id,
      studentB: studentB._id,
      topicToCover: 'Python Fundamentals <-> React Component Lifecycle',
      scheduledDate: '2026-09-05',
      scheduledTime: '05:00 PM',
      meetingLink: 'https://meet.google.com/new',
      status: 'SCHEDULED'
    });
    console.log('4. Session Scheduled: Status =', session.status);

    // 6. Complete Session & Submit Rating (SCHEDULED -> COMPLETED)
    session.status = 'COMPLETED';
    session.completedAt = new Date();
    session.ratingByA = { score: 5, feedback: 'Priya explained React hooks with great clarity!' };
    session.ratingByB = { score: 5, feedback: 'Rahul helped me master Python OOP!' };
    await session.save();

    console.log('5. Session Completed & Rated in MongoDB:');
    console.log({
      sessionTopic: session.topicToCover,
      status: session.status,
      ratingByRahul: session.ratingByA,
      ratingByPriya: session.ratingByB
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testStudySwap();