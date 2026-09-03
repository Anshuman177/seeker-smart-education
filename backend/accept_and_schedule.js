const mongoose = require('mongoose');
require('dotenv').config();

const { LearningRequest, LearningSession } = require('./models/StudySwap');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const reqDoc = await LearningRequest.findOne({ status: 'PENDING' }).sort({ createdAt: -1 });
    if (!reqDoc) {
      console.log('No pending swap request found.');
      process.exit(0);
    }

    reqDoc.status = 'ACCEPTED';
    await reqDoc.save();

    const roomId = 'seeker-' + Math.random().toString(36).substring(2, 8) + '-' + Date.now().toString(36);

    const session = new LearningSession({
      requestId: reqDoc._id,
      roomId,
      studentA: reqDoc.senderId,
      studentB: reqDoc.receiverId,
      topicToCover: `${reqDoc.skillOffered} & ${reqDoc.skillRequested} Peer Exchange`,
      durationMinutes: 45,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '18:30',
      status: 'SCHEDULED'
    });

    await session.save();
    console.log('✅ Request ACCEPTED & SEEKER Meet Session Created!');
    console.log(`Room ID: ${roomId}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();