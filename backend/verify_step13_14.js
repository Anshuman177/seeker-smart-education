const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const { Subject, Quiz, QuizAttempt } = require('./models/Education');
const { SkillChallenge, SkillAttempt } = require('./models/SkillProof');
const { LearningRequest, LearningSession } = require('./models/StudySwap');

async function testDashboardAndAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    // 1. Create or Find Admin User
    let admin = await User.findOne({ email: 'admin@seeker.edu' });
    if (!admin) {
      const pw = await bcrypt.hash('AdminPass123', 10);
      admin = await User.create({
        name: 'Portal Administrator',
        email: 'admin@seeker.edu',
        password: pw,
        role: 'admin',
        college: 'Smart Education Council'
      });
      console.log('2. Admin Account Verified');
    }

    // 2. Fetch Rahul's Student Dashboard Aggregation
    const student = await User.findOne({ email: 'rahul@seeker.edu' });
    const [attempts, skillAttempts, upcomingSessions, completedSessions] = await Promise.all([
      QuizAttempt.find({ studentId: student._id }),
      SkillAttempt.find({ studentId: student._id }),
      LearningSession.find({
        $or: [{ studentA: student._id }, { studentB: student._id }],
        status: 'SCHEDULED'
      }),
      LearningSession.find({
        $or: [{ studentA: student._id }, { studentB: student._id }],
        status: 'COMPLETED'
      })
    ]);

    console.log('3. Student Real Aggregated Dashboard (Step 13):');
    console.log({
      studentName: student.name,
      quizzesAttempted: attempts.length,
      verifiedSkills: skillAttempts.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length
    });

    // 3. Fetch Admin Overall Platform Analytics
    const [totalStudents, totalSubjects, totalQuizzes, totalChallenges, totalSessions] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Subject.countDocuments(),
      Quiz.countDocuments(),
      SkillChallenge.countDocuments(),
      LearningSession.countDocuments()
    ]);

    console.log('4. Admin Console Real Platform Analytics (Step 14):');
    console.log({
      totalStudents,
      totalSubjects,
      totalQuizzes,
      totalChallenges,
      totalSessions
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testDashboardAndAdmin();