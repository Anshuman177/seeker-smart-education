const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    // Find test user
    let user = await User.findOne({ email: 'test@seeker.edu' });
    if (!user) {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      user = await User.create({
        name: 'Test Student',
        email: 'test@seeker.edu',
        password: hashedPassword,
        role: 'student',
        college: 'Engineering Institute'
      });
      console.log('2. Test User Created');
    } else {
      console.log('2. Test User Found');
    }

    // Direct Database Update Test for Step 4 & 5 (Profile + Teach/Learn Skills)
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        bio: 'Aspiring Full Stack Engineer',
        skillsTeach: ['Python', 'SQL', 'DBMS'],
        skillsLearn: ['React', 'Node.js', 'DSA']
      },
      { new: true }
    ).select('-password');

    console.log('3. Skills & Profile Updated Successfully:');
    console.log({
      name: updatedUser.name,
      college: updatedUser.college,
      bio: updatedUser.bio,
      skillsTeach: updatedUser.skillsTeach,
      skillsLearn: updatedUser.skillsLearn
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runTest();