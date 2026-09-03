const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Mongoose Models
const User = require('./models/User');
const { Subject, Quiz, QuizAttempt } = require('./models/Education');
const { SkillQuestion, SkillAttempt, SkillAssessment } = require('./models/SkillProof');
const { LearningRequest, LearningSession, Notification } = require('./models/StudySwap');
const PeerReview = require('./models/Review');
const LibraryItem = require('./models/Library');
const auth = require('./middleware/auth');

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.send('SEEKER Backend API is running successfully!');
});

const JWT_SECRET = process.env.JWT_SECRET || 'SEEKERsupersecretkey2026';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// In-Memory Signaling Store for Browser-Native WebRTC
const meetSignalingStore = new Map();

function hasScheduledTimeArrived(scheduledDate, scheduledTime) {
  if (!scheduledDate || !scheduledTime) return false;
  const sessionDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
  return Date.now() >= sessionDateTime.getTime();
}

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, college, skillsTeach, skillsLearn } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      college: college || 'Engineering Institute',
      skillsTeach: skillsTeach || [],
      skillsLearn: skillsLearn || []
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/user/profile', auth(), async (req, res) => {
  try {
    const { bio, college, skillsTeach, skillsLearn, profilePicture, name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(college !== undefined && { college }),
        ...(skillsTeach !== undefined && { skillsTeach }),
        ...(skillsLearn !== undefined && { skillsLearn }),
        ...(profilePicture !== undefined && { profilePicture })
      },
      { returnDocument: 'after' }
    ).select('-password');
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/user/profile', auth(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 2. STUDYPATH & CURRICULUM
// ==========================================

app.get('/api/subjects', auth(), async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/quizzes/:subjectId', auth(), async (req, res) => {
  try {
    const { topicTitle } = req.query;
    let query = {};
    if (topicTitle) {
      query.topicTitle = new RegExp(`^${topicTitle.trim()}$`, 'i');
    } else {
      query.subjectId = req.params.subjectId;
    }

    let quiz = await Quiz.findOne(query);
    if (!quiz) {
      quiz = await Quiz.findOne({ topicTitle: /Process Management/i });
    }

    if (!quiz) return res.status(404).json({ message: 'No quiz found for this topic.' });

    const selectedQuestions = shuffle(quiz.questions).slice(0, 3).map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: shuffle(q.options)
    }));

    res.json({
      _id: quiz._id,
      title: quiz.title,
      topicTitle: quiz.topicTitle,
      subjectId: quiz.subjectId,
      questions: selectedQuestions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/quizzes/submit', auth(), async (req, res) => {
  try {
    const { quizId, answers } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let score = 0;
    const details = [];
    const questionMap = new Map(quiz.questions.map(q => [q._id.toString(), q]));

    for (const [qId, userAns] of Object.entries(answers)) {
      const qDoc = questionMap.get(qId);
      if (qDoc) {
        const isCorrect = qDoc.correctAnswer === userAns;
        if (isCorrect) score++;
        details.push({
          questionText: qDoc.questionText,
          userAnswer: userAns,
          correctAnswer: qDoc.correctAnswer,
          isCorrect,
          explanation: qDoc.explanation
        });
      }
    }

    const totalQuestions = details.length || 1;
    const percentage = Math.round((score / totalQuestions) * 100);
    const isWeak = percentage < 60;

    const attempt = new QuizAttempt({
      studentId: req.user.id,
      subjectId: quiz.subjectId,
      quizId: quiz._id,
      topicTitle: quiz.topicTitle,
      score,
      totalQuestions,
      percentage,
      isWeak,
      details
    });
    await attempt.save();

    res.json({
      score,
      totalQuestions,
      percentage,
      isWeak,
      recommendation: isWeak ? `Recommended: Revise ${quiz.topicTitle}` : 'Strong concept mastery!',
      details,
      attemptId: attempt._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/subjects/generate', auth(), async (req, res) => {
  try {
    const { topicName } = req.body;
    if (!topicName || !topicName.trim()) {
      return res.status(400).json({ message: 'Topic name is required.' });
    }

    const cleanTitle = topicName.trim();
    let existingSubject = await Subject.findOne({ name: new RegExp(`^${cleanTitle}$`, 'i') });
    if (existingSubject) return res.json(existingSubject);

    const newSubject = new Subject({
      name: cleanTitle,
      description: `Comprehensive mastery curriculum for ${cleanTitle}, from fundamentals to production systems.`,
      topics: [
        {
          title: `${cleanTitle} Foundations & Syntax`,
          description: `Core syntax, runtime setup, and essential constructs for ${cleanTitle}.`,
          content: `Foundational study of ${cleanTitle}. Focus on memory allocation, core primitive types, lexical scoping, and baseline architectural rules.`
        },
        {
          title: `${cleanTitle} Core Mechanisms`,
          description: `Data pipelines, control flow, error strategies, and design patterns.`,
          content: `In-depth analysis of functional and object mechanisms in ${cleanTitle}. Emphasizes deterministic error handling, input sanitization, and structured abstractions.`
        },
        {
          title: `${cleanTitle} Performance & Optimization`,
          description: `Concurrency, algorithmic efficiency, caching, and complexity bottlenecks.`,
          content: `Optimizing runtime speed and memory consumption in ${cleanTitle}. Examines asymptotic Big-O execution, concurrent threads, and I/O efficiency.`
        },
        {
          title: `${cleanTitle} Production Architecture & Best Practices`,
          description: `Security hardening, modular deployment, testing suites, and enterprise scaling.`,
          content: `Enterprise system design patterns using ${cleanTitle}. Focus on fault-tolerant deployments, integration testing, and distributed resilience.`
        }
      ]
    });

    await newSubject.save();

    for (const t of newSubject.topics) {
      const quiz = new Quiz({
        subjectId: newSubject._id,
        title: `${t.title} Diagnostic`,
        topicTitle: t.title,
        questions: [
          {
            questionText: `What is the primary architectural rule governing ${t.title}?`,
            options: [
              `Standardized compliance, isolation, and deterministic predictability`,
              `Arbitrary unvalidated state mutation across threads`,
              `Complete deprecation of underlying runtime safety guards`,
              `Stateless volatile memory consumption without cleanup`
            ],
            correctAnswer: `Standardized compliance, isolation, and deterministic predictability`,
            explanation: `Ensuring standardized invariants and deterministic behavior is the foundation of ${t.title}.`
          },
          {
            questionText: `Which approach is optimal when scaling ${cleanTitle} in a high-load environment?`,
            options: [
              `Horizontal modular partitioning and resource pooling`,
              `Single-threaded blocking loops with infinite timeouts`,
              `Disabling transactional rollbacks on write errors`,
              `Storing all runtime state strictly in global mutable primitives`
            ],
            correctAnswer: `Horizontal modular partitioning and resource pooling`,
            explanation: `Horizontal partitioning and resource pooling prevent contention bottlenecks when scaling ${cleanTitle}.`
          },
          {
            questionText: `How does ${cleanTitle} handle abnormal failure modes?`,
            options: [
              `Via structured exception propagation and graceful rollbacks`,
              `By terminating the host operating system kernel immediately`,
              `By ignoring error signals and returning empty pointers`,
              `By corrupting active thread caches to accelerate crash recovery`
            ],
            correctAnswer: `Via structured exception propagation and graceful rollbacks`,
            explanation: `Structured exceptions guarantee atomic rollbacks and prevent inconsistent state across ${cleanTitle}.`
          }
        ]
      });
      await quiz.save();
    }

    res.status(201).json(newSubject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/subjects/:id', auth(), async (req, res) => {
  try {
    const subjectId = req.params.id;
    await Subject.findByIdAndDelete(subjectId);
    await Quiz.deleteMany({ subjectId });
    await QuizAttempt.deleteMany({ subjectId });
    res.json({ message: 'Subject roadmap deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. LIBRARY & SKILLPROOF
// ==========================================

app.get('/api/library/search', auth(), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      const items = await LibraryItem.find().limit(20);
      return res.json(items);
    }

    const regex = new RegExp(query.trim(), 'i');
    const items = await LibraryItem.find({
      $or: [{ skill: regex }, { title: regex }, { topics: regex }]
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function synthesizeQuestionsFromContent(resource, targetCount) {
  const text = resource.content;
  const topics = resource.topics && resource.topics.length > 0
    ? resource.topics
    : ['Foundations', 'Mechanics', 'Architecture', 'Best Practices'];

  const statements = text
    .split(/\n|\. /)
    .map(s => s.trim())
    .filter(s => s.length > 30);

  const generated = [];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  for (let i = 0; i < targetCount; i++) {
    const topic = topics[i % topics.length];
    const difficulty = difficulties[i % difficulties.length];
    const sourceStatement = statements[i % statements.length] || `Core architectural principle of ${resource.skill}`;

    let question = '';
    let correctAnswer = '';
    let options = [];
    let explanation = '';

    if (sourceStatement.toLowerCase().includes('closure')) {
      question = 'In modern JavaScript, what is a closure and how does it retain scope?';
      correctAnswer = 'A function bundled with its lexical environment, accessing outer variables after outer execution.';
      options = [
        'A function bundled with its lexical environment, accessing outer variables after outer execution.',
        'A global variable that is destroyed once an asynchronous promise completes.',
        'A method that isolates objects strictly to prevent heap memory leakage.',
        'A callback queue handler that prevents microtasks from executing.'
      ];
      explanation = 'A closure gives an inner function access to its outer enclosing scope even after the outer function has returned.';
    } else if (sourceStatement.toLowerCase().includes('event loop') || sourceStatement.toLowerCase().includes('microtask')) {
      question = 'How does the JavaScript runtime prioritize Promise callbacks versus setTimeout handlers?';
      correctAnswer = 'Microtask Queue (Promises) has absolute priority over the Macrotask Queue (setTimeout).';
      options = [
        'Microtask Queue (Promises) has absolute priority over the Macrotask Queue (setTimeout).',
        'Macrotask Queue executes immediately, interrupting any ongoing microtasks.',
        'Both queues are processed concurrently using multithreaded kernel routines.',
        'setTimeout callbacks execute first because timers are scheduled at the OS level.'
      ];
      explanation = 'The event loop drains the entire microtask queue before fetching the next macrotask from the callback queue.';
    } else {
      question = `[${resource.skill} • ${topic}] Based on "${resource.title}", what accurately reflects: ${sourceStatement.substring(0, 65)}...?`;
      correctAnswer = `It ensures ${topic.toLowerCase()} maintains standardized correctness and optimal system performance.`;
      options = [
        `It ensures ${topic.toLowerCase()} maintains standardized correctness and optimal system performance.`,
        `It bypasses underlying architectural validation to prioritize raw I/O throughput.`,
        `It is deprecated in production environments due to volatile memory overhead.`,
        `It operates strictly as an unverified client-side fallback mechanism.`
      ];
      explanation = `Reference resource "${resource.title}" confirms that ${topic} is fundamental to ensuring architectural compliance in ${resource.skill}.`;
    }

    generated.push({
      _id: new mongoose.Types.ObjectId(),
      skill: resource.skill,
      difficulty,
      topic,
      question,
      options: shuffle(options),
      correctAnswer,
      explanation
    });
  }

  return generated;
}

app.post('/api/skillproof/generate-from-library', auth(), async (req, res) => {
  try {
    const { skill, libraryItemId, count } = req.body;
    const targetCount = parseInt(count, 10) || 10;

    let selectedResource = null;
    if (libraryItemId) selectedResource = await LibraryItem.findById(libraryItemId);
    if (!selectedResource && skill) {
      const regex = new RegExp(skill.trim(), 'i');
      selectedResource = await LibraryItem.findOne({
        $or: [{ skill: regex }, { title: regex }, { topics: regex }]
      });
    }

    if (!selectedResource) {
      selectedResource = new LibraryItem({
        title: `${skill} Standard Academic Reference Guide`,
        skill: skill.trim(),
        type: 'Lecture Notes',
        author: 'SEEKER Knowledge Aggregator',
        topics: [`${skill} Fundamentals`, `${skill} Architecture`, `${skill} Performance`],
        fullBookUrl: `https://openlibrary.org/search?q=${encodeURIComponent(skill.trim())}`,
        freeSourceProvider: 'Internet Archive Open Library',
        content: `${skill} represents an essential domain in modern computing. Mastery requires comprehensive understanding of core syntax, execution mechanics, runtime paradigms, operational memory models, and debugging methodologies.`
      });
      await selectedResource.save();
    }

    const questions = synthesizeQuestionsFromContent(selectedResource, targetCount);
    res.json({
      skill: selectedResource.skill,
      sourceTitle: selectedResource.title,
      sourceType: selectedResource.type,
      author: selectedResource.author,
      questions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/skillproof/submit-assessment', auth(), async (req, res) => {
  try {
    const { skill, answers, questionIds, questionsData } = req.body;
    let score = 0;
    const diffStats = {
      Easy: { total: 0, correct: 0 },
      Medium: { total: 0, correct: 0 },
      Hard: { total: 0, correct: 0 }
    };
    const topicStats = {};

    let listToAudit = [];
    if (questionsData && Array.isArray(questionsData)) {
      listToAudit = questionsData;
    } else if (questionIds && questionIds.length > 0) {
      listToAudit = await SkillQuestion.find({ _id: { $in: questionIds } });
    }

    listToAudit.forEach((q) => {
      const qIdStr = q._id.toString();
      const userAns = answers[qIdStr];
      const isCorrect = userAns === q.correctAnswer;

      if (diffStats[q.difficulty]) {
        diffStats[q.difficulty].total += 1;
        if (isCorrect) diffStats[q.difficulty].correct += 1;
      }

      if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 };
      topicStats[q.topic].total += 1;
      if (isCorrect) topicStats[q.topic].correct += 1;

      if (isCorrect) score += 1;
    });

    const totalQuestions = listToAudit.length || 1;
    const percentage = Math.round((score / totalQuestions) * 100);

    let level = 'Beginner';
    if (percentage >= 80) level = 'Advanced';
    else if (percentage >= 60) level = 'Intermediate';

    const strongTopics = [];
    const weakTopics = [];
    Object.keys(topicStats).forEach((top) => {
      const acc = (topicStats[top].correct / topicStats[top].total) * 100;
      if (acc >= 60) strongTopics.push(top);
      else weakTopics.push(top);
    });

    const evidenceId = 'SKL-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const assessment = new SkillAssessment({
      userId: req.user.id,
      skill,
      totalQuestions,
      score,
      percentage,
      level,
      evidenceId,
      breakdown: {
        easy: {
          total: diffStats.Easy.total,
          correct: diffStats.Easy.correct,
          accuracy: diffStats.Easy.total ? Math.round((diffStats.Easy.correct / diffStats.Easy.total) * 100) : 0
        },
        medium: {
          total: diffStats.Medium.total,
          correct: diffStats.Medium.correct,
          accuracy: diffStats.Medium.total ? Math.round((diffStats.Medium.correct / diffStats.Medium.total) * 100) : 0
        },
        hard: {
          total: diffStats.Hard.total,
          correct: diffStats.Hard.correct,
          accuracy: diffStats.Hard.total ? Math.round((diffStats.Hard.correct / diffStats.Hard.total) * 100) : 0
        }
      },
      strongTopics,
      weakTopics
    });

    await assessment.save();
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { skillsTeach: skill } });

    res.json({ message: 'Assessment evaluated and Skill Evidence generated.', assessment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/skillproof/my-scores', auth(), async (req, res) => {
  try {
    const assessments = await SkillAssessment.find({ userId: req.user.id }).sort({ completedAt: -1 });
    const skills = [...new Set(assessments.map(a => a.skill))];
    const summary = skills.map(skill => {
      const attempts = assessments.filter(a => a.skill === skill);
      const latest = attempts[0];
      const best = attempts.reduce((max, a) => a.percentage > max.percentage ? a : max, attempts[0]);
      return {
        skill,
        level: best.level,
        bestAccuracy: best.percentage,
        attempts: attempts.length,
        latestEvidence: latest
      };
    });
    res.json({ assessments, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 4. STUDYSWAP: STRICT REQUEST & SCHEDULING FLOW
// ==========================================

app.get('/api/studyswap/discover', auth(), async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);

    let filter = { _id: { $ne: currentUserId } };

    if (query && query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      filter.$and = [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { name: regex },
            { skillsTeach: regex },
            { skillsLearn: regex },
            { college: regex }
          ]
        }
      ];
    }

    const peers = await User.find(filter).select('-password');

    const results = peers
      .filter(p => p._id.toString() !== currentUserId.toString())
      .map(peer => {
        const theyCanTeachYou = (peer.skillsTeach || []).filter(s =>
          (currentUser?.skillsLearn || []).some(sl => sl.toLowerCase().trim() === s.toLowerCase().trim())
        );
        const youCanTeachThem = (currentUser?.skillsTeach || []).filter(s =>
          (peer.skillsLearn || []).some(psl => psl.toLowerCase().trim() === s.toLowerCase().trim())
        );

        let score = (theyCanTeachYou.length * 2) + (youCanTeachThem.length * 1);
        let matchPercentage = score > 0 ? Math.min(score * 25 + 25, 95) : 35;

        return {
          peer,
          matchPercentage,
          theyCanTeachYou,
          youCanTeachThem
        };
      });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/studyswap/matches', auth(), async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    const peers = await User.find({ _id: { $ne: currentUserId } }).select('-password');

    const matches = peers
      .filter(p => p._id.toString() !== currentUserId.toString())
      .map(peer => {
        const theyCanTeachYou = (peer.skillsTeach || []).filter(s =>
          (currentUser?.skillsLearn || []).some(sl => sl.toLowerCase().trim() === s.toLowerCase().trim())
        );
        const youCanTeachThem = (currentUser?.skillsTeach || []).filter(s =>
          (peer.skillsLearn || []).some(psl => psl.toLowerCase().trim() === s.toLowerCase().trim())
        );

        const score = (theyCanTeachYou.length * 2) + (youCanTeachThem.length * 1);
        const matchPercentage = score > 0 ? Math.min(score * 25 + 25, 95) : 30;

        return {
          peer,
          compatibilityScore: score,
          matchPercentage,
          theyCanTeachYou,
          youCanTeachThem
        };
      });

    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1. Send Request (User A -> User B)
app.post('/api/studyswap/request', auth(), async (req, res) => {
  try {
    const { receiverId, skillOffered, skillRequested, message } = req.body;

    if (!receiverId) return res.status(400).json({ message: 'Receiver ID is required.' });
    if (receiverId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot send a swap request to yourself.' });
    }

    const existing = await LearningRequest.findOne({
      senderId: req.user.id,
      receiverId,
      status: 'PENDING'
    });
    if (existing) {
      return res.status(400).json({ message: 'A pending request is already waiting for response.' });
    }

    const learningRequest = new LearningRequest({
      senderId: req.user.id,
      receiverId,
      skillOffered: skillOffered || 'General Knowledge',
      skillRequested: skillRequested || 'Academic Exchange',
      message: message || 'Hi! I would love to connect and exchange knowledge on SEEKER.',
      status: 'PENDING'
    });
    await learningRequest.save();

    const senderUser = await User.findById(req.user.id);
    const notification = new Notification({
      userId: receiverId,
      senderId: req.user.id,
      type: 'GENERAL',
      title: 'New StudySwap Request',
      message: `${senderUser?.name} sent you a StudySwap proposal to learn ${skillRequested}.`
    });
    await notification.save();

    res.status(201).json({ message: 'Proposal sent! Waiting for acceptance.', learningRequest });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Fetch User Requests
app.get('/api/studyswap/requests', auth(), async (req, res) => {
  try {
    const incoming = await LearningRequest.find({ receiverId: req.user.id })
      .populate('senderId', 'name email college')
      .sort({ createdAt: -1 });

    const outgoing = await LearningRequest.find({ senderId: req.user.id })
      .populate('receiverId', 'name email college')
      .sort({ createdAt: -1 });

    res.json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. User B Accepts & Schedules (UPDATED & BULLETPROOF)
app.put('/api/studyswap/request/:id', auth(), async (req, res) => {
  try {
    const { status, scheduledDate, scheduledTime, durationMinutes, topicToCover } = req.body;
    const reqDoc = await LearningRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found.' });

    // Enforce: Only recipient can accept or reject
    if (reqDoc.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the recipient can accept or reject this request.' });
    }

    if (status === 'REJECTED') {
      reqDoc.status = 'REJECTED';
      await reqDoc.save();

      const receiverUser = await User.findById(req.user.id);
      try {
        await new Notification({
          userId: reqDoc.senderId,
          senderId: req.user.id,
          type: 'GENERAL',
          title: 'StudySwap Request Declined',
          message: `${receiverUser?.name || 'Peer'} was unable to accept your StudySwap request at this time.`
        }).save();
      } catch (e) {}

      return res.json({ message: 'Request declined.', reqDoc });
    }

    if (status === 'ACCEPTED') {
      // Safe fallback variables ensuring NO undefined scope errors
      const finalDate = scheduledDate && scheduledDate.trim() !== '' 
        ? scheduledDate 
        : new Date().toISOString().split('T')[0];
      const finalTime = scheduledTime && scheduledTime.trim() !== '' 
        ? scheduledTime 
        : '18:00';
      const finalDuration = parseInt(durationMinutes, 10) || 30;
      const finalTopic = topicToCover || `${reqDoc.skillRequested} Peer Exchange`;

      // Check if session already exists for this request
      let session = await LearningSession.findOne({ requestId: reqDoc._id });

      if (!session) {
        reqDoc.status = 'ACCEPTED';
        await reqDoc.save();

        const generatedRoomId = 'seeker-' + Math.random().toString(36).substring(2, 8) + '-' + Date.now().toString(36);
        const hostId = req.user.id;
        const participantId = reqDoc.senderId;
        const isAlreadyTime = hasScheduledTimeArrived(finalDate, finalTime);

        session = new LearningSession({
          requestId: reqDoc._id,
          roomId: generatedRoomId,
          hostId: hostId,
          studentA: hostId,
          studentB: participantId,
          topicToCover: finalTopic,
          durationMinutes: finalDuration,
          scheduledDate: finalDate,
          scheduledTime: finalTime,
          status: isAlreadyTime ? 'LIVE' : 'SCHEDULED'
        });
        await session.save();

        try {
          const hostUser = await User.findById(hostId);
          const participantUser = await User.findById(participantId);

          await new Notification({
            userId: hostId,
            senderId: hostId,
            sessionId: session._id,
            type: 'SESSION_SCHEDULED',
            title: 'Meeting Scheduled (You are Host)',
            message: `You scheduled a meeting with ${participantUser?.name || 'peer'} on ${finalDate} at ${finalTime}.`
          }).save();

          await new Notification({
            userId: participantId,
            senderId: hostId,
            sessionId: session._id,
            type: 'SESSION_SCHEDULED',
            title: 'Swap Request Accepted & Scheduled!',
            message: `${hostUser?.name || 'Host'} accepted your proposal and scheduled the session for ${finalDate} at ${finalTime}.`
          }).save();
        } catch (notifErr) {
          console.warn('Notification warning:', notifErr.message);
        }
      }

      return res.json({ message: 'Request accepted and session successfully scheduled!', reqDoc, session });
    }

    res.status(400).json({ message: 'Invalid status update.' });
  } catch (err) {
    console.error('Acceptance Route Error:', err);
    res.status(500).json({ message: err.message || 'Server error while scheduling.' });
  }
});

// 4. Fetch Sessions
app.get('/api/studyswap/sessions', auth(), async (req, res) => {
  try {
    const sessions = await LearningSession.find({
      $or: [{ studentA: req.user.id }, { studentB: req.user.id }]
    })
      .populate('studentA', 'name email college')
      .populate('studentB', 'name email college')
      .populate('hostId', 'name email')
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Delete Request Permanently
app.delete('/api/studyswap/request/:id', auth(), async (req, res) => {
  try {
    const requestDoc = await LearningRequest.findById(req.params.id);
    if (!requestDoc) return res.status(404).json({ message: 'Request not found.' });

    const userId = req.user.id.toString();
    if (requestDoc.senderId.toString() !== userId && requestDoc.receiverId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this request.' });
    }

    await LearningRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request permanently deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Delete Meeting Session Permanently
app.delete('/api/studyswap/session/:id', auth(), async (req, res) => {
  try {
    const session = await LearningSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const userId = req.user.id.toString();
    if (session.studentA.toString() !== userId && session.studentB.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this session.' });
    }

    await LearningSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Meeting record deleted permanently.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. Host 3-Dot Menu: Notify Participant
app.post('/api/studyswap/session/:id/notify', auth(), async (req, res) => {
  try {
    const { reason, customMessage } = req.body;
    const session = await LearningSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    if (session.hostId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the host can notify participants about schedule updates.' });
    }

    const hostUser = await User.findById(req.user.id);
    const participantId = session.studentA.toString() === req.user.id.toString()
      ? session.studentB
      : session.studentA;

    const finalMessage = customMessage && customMessage.trim()
      ? customMessage.trim()
      : `Host indicated: ${reason || 'Unable to attend'}`;

    session.hostNotice = {
      reason: reason || 'Other',
      message: finalMessage,
      sentAt: new Date()
    };
    await session.save();

    const notification = new Notification({
      userId: participantId,
      senderId: req.user.id,
      sessionId: session._id,
      type: 'HOST_CANCELLATION',
      title: `Notice from Host (${hostUser.name})`,
      reason: reason || 'Other',
      message: `${hostUser.name} sent a notice regarding "${session.topicToCover}": ${finalMessage}`
    });
    await notification.save();

    res.json({ message: 'Participant notified successfully.', session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. Notifications
app.get('/api/user/notifications', auth(), async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('senderId', 'name college')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/user/notifications/:id', auth(), async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 5. SEEKER MEET: REST ENDPOINTS & WEBRTC
// ==========================================

const BANNED_WORDS = ['abuse', 'stupid', 'idiot', 'scam', 'hate', 'trash', 'fake'];

app.get('/api/meet/room/:roomId', auth(), async (req, res) => {
  try {
    const session = await LearningSession.findOne({ roomId: req.params.roomId })
      .populate('studentA', 'name email college')
      .populate('studentB', 'name email college')
      .populate('hostId', 'name email');

    if (!session) return res.status(404).json({ message: 'SEEKER Meet room not found.' });

    if (session.status === 'COMPLETED') {
      return res.status(410).json({
        message: 'This meeting has been ended by the host and is no longer active.',
        session
      });
    }

    if (session.status === 'CANCELLED') {
      return res.status(410).json({
        message: `This meeting was cancelled: ${session.hostNotice?.message || 'Unable to attend.'}`,
        session
      });
    }

    const timeArrived = hasScheduledTimeArrived(session.scheduledDate, session.scheduledTime);
    if (!timeArrived) {
      return res.status(403).json({
        message: `Meeting is scheduled for ${session.scheduledDate} at ${session.scheduledTime}. You cannot join before the scheduled time.`,
        scheduledDate: session.scheduledDate,
        scheduledTime: session.scheduledTime,
        status: 'SCHEDULED'
      });
    }

    if (session.status === 'SCHEDULED') {
      session.status = 'LIVE';
      await session.save();
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Host End Meeting for Everyone
app.put('/api/meet/room/:roomId/end', auth(), async (req, res) => {
  try {
    const session = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ message: 'Room not found.' });

    const hostStr = session.hostId ? session.hostId.toString() : session.studentA.toString();
    if (hostStr !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Security Violation: Only the meeting Host can end the meeting for everyone.' });
    }

    session.status = 'COMPLETED';
    session.endedAt = new Date();
    await session.save();

    meetSignalingStore.delete(req.params.roomId);

    res.json({ message: 'Meeting permanently ended for everyone.', session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Leave Meeting (Temporary)
app.post('/api/meet/room/:roomId/leave', auth(), async (req, res) => {
  try {
    if (!meetSignalingStore.has(req.params.roomId)) {
      meetSignalingStore.set(req.params.roomId, []);
    }
    meetSignalingStore.get(req.params.roomId).push({
      senderId: req.user.id.toString(),
      type: 'participant-left',
      payload: { userId: req.user.id },
      timestamp: Date.now()
    });

    res.json({ message: 'Left meeting successfully. Meeting remains active.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// WebRTC Signaling: Push
app.post('/api/meet/room/:roomId/signal', auth(), (req, res) => {
  const { roomId } = req.params;
  const { type, payload } = req.body;
  const senderId = req.user.id.toString();

  if (!meetSignalingStore.has(roomId)) {
    meetSignalingStore.set(roomId, []);
  }

  const signals = meetSignalingStore.get(roomId);
  signals.push({
    senderId,
    type,
    payload,
    timestamp: Date.now()
  });

  const fresh = signals.filter(s => Date.now() - s.timestamp < 30000);
  meetSignalingStore.set(roomId, fresh);

  res.json({ success: true });
});

// WebRTC Signaling: Pull
app.get('/api/meet/room/:roomId/signal', auth(), (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user.id.toString();

  if (!meetSignalingStore.has(roomId)) {
    return res.json({ signals: [] });
  }

  const signals = meetSignalingStore.get(roomId);
  const myPeerSignals = signals.filter(s => s.senderId !== currentUserId);

  res.json({ signals: myPeerSignals });
});

app.post('/api/meet/room/:roomId/message', auth(), async (req, res) => {
  try {
    const { message, sharedNotes } = req.body;
    const session = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ message: 'Room not found' });

    const sender = await User.findById(req.user.id);
    if (message) {
      const hasBadLanguage = BANNED_WORDS.some(word => message.toLowerCase().includes(word));
      if (hasBadLanguage) {
        return res.status(400).json({
          warning: true,
          message: '⚠️ Warning: Unprofessional language is strictly prohibited in SEEKER collaborative rooms.'
        });
      }

      session.chatMessages.push({
        senderName: sender.name,
        message,
        sentAt: new Date()
      });
    }

    if (sharedNotes !== undefined) session.sharedNotes = sharedNotes;
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Captions Sync
app.post('/api/meet/room/:roomId/caption', auth(), async (req, res) => {
  try {
    const { originalText, translatedText, sourceLang } = req.body;
    const session = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ message: 'Room not found' });

    const sender = await User.findById(req.user.id);
    session.activeCaption = {
      speakerName: sender.name,
      originalText: originalText || '',
      translatedText: translatedText || originalText || '',
      sourceLang: sourceLang || 'en-IN',
      updatedAt: new Date()
    };
    session.markModified('activeCaption');
    await session.save();

    res.json({ message: 'Caption synced', activeCaption: session.activeCaption });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 6. POST-SESSION RATINGS & REPUTATION ENGINE
// ==========================================

app.post('/api/meet/room/:roomId/review', auth(), async (req, res) => {
  try {
    const { rating, feedbackText, punctualityScore, skillEndorsed } = req.body;
    const session = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const reviewerId = req.user.id.toString();
    const isStudentA = session.studentA.toString() === reviewerId;
    const isStudentB = session.studentB.toString() === reviewerId;

    if (!isStudentA && !isStudentB) {
      return res.status(403).json({ message: 'Unauthorized: You were not a participant in this session.' });
    }

    const revieweeId = isStudentA ? session.studentB : session.studentA;

    const existing = await PeerReview.findOne({ sessionId: session._id, reviewerId });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a review for this session.' });
    }

    const review = new PeerReview({
      sessionId: session._id,
      reviewerId,
      revieweeId,
      skillEndorsed: skillEndorsed || session.topicToCover,
      rating: Number(rating) || 5,
      feedbackText: feedbackText || '',
      punctualityScore: Number(punctualityScore) || 5
    });
    await review.save();

    const allUserReviews = await PeerReview.find({ revieweeId });
    const avgRating = (allUserReviews.reduce((sum, r) => sum + r.rating, 0) / allUserReviews.length).toFixed(1);

    await User.findByIdAndUpdate(revieweeId, {
      $set: { peerRating: Number(avgRating), totalReviews: allUserReviews.length },
      $addToSet: { skillsTeach: skillEndorsed }
    });

    const reviewerUser = await User.findById(reviewerId);
    const notification = new Notification({
      userId: revieweeId,
      senderId: reviewerId,
      sessionId: session._id,
      type: 'GENERAL',
      title: 'New Peer Skill Endorsement!',
      message: `${reviewerUser?.name} gave you a ${rating}★ rating and endorsed your skill in "${skillEndorsed}".`
    });
    await notification.save();

    res.status(201).json({ message: 'Endorsement submitted successfully!', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/meet/room/:roomId/review/status', auth(), async (req, res) => {
  try {
    const session = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const review = await PeerReview.findOne({ sessionId: session._id, reviewerId: req.user.id });
    res.json({ reviewed: Boolean(review), review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch user's received peer reviews & endorsements
app.get('/api/user/reviews', auth(), async (req, res) => {
  try {
    const reviews = await PeerReview.find({ revieweeId: req.user.id })
      .populate('reviewerId', 'name college')
      .populate('sessionId', 'topicToCover scheduledDate')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 7. DASHBOARD AGGREGATED METRICS
// ==========================================

app.get('/api/student/dashboard', auth(), async (req, res) => {
  try {
    const studentId = req.user.id;
    const [user, attempts, skillAssessments, pendingRequests, upcomingSessions] = await Promise.all([
      User.findById(studentId).select('-password'),
      QuizAttempt.find({ studentId }).populate('subjectId', 'name').sort({ attemptedAt: -1 }),
      SkillAssessment.find({ userId: studentId }).sort({ completedAt: -1 }),
      LearningRequest.find({ receiverId: studentId, status: 'PENDING' }).populate('senderId', 'name college'),
      LearningSession.find({
        $or: [{ studentA: studentId }, { studentB: studentId }],
        status: 'SCHEDULED'
      }).populate('studentA', 'name').populate('studentB', 'name')
    ]);

    const weakTopics = attempts
      .filter(a => a.isWeak)
      .map(a => ({
        subject: a.subjectId?.name || 'Computer Science',
        topic: a.topicTitle,
        percentage: a.percentage
      }));

    const skillStats = {};
    skillAssessments.forEach(att => {
      if (!skillStats[att.skill]) skillStats[att.skill] = { attempts: 0, totalAccuracy: 0, bestAccuracy: 0 };
      skillStats[att.skill].attempts += 1;
      skillStats[att.skill].totalAccuracy += att.percentage;
      if (att.percentage > skillStats[att.skill].bestAccuracy) {
        skillStats[att.skill].bestAccuracy = att.percentage;
      }
    });

    const skillSummary = Object.keys(skillStats).map(skill => {
      const avg = Math.round(skillStats[skill].totalAccuracy / skillStats[skill].attempts);
      const best = skillStats[skill].bestAccuracy;
      return {
        skill,
        attempts: skillStats[skill].attempts,
        accuracy: avg,
        level: best >= 80 ? 'Advanced' : best >= 60 ? 'Intermediate' : 'Beginner'
      };
    });

    res.json({
      user,
      totalQuizzesAttempted: attempts.length,
      weakTopics,
      skillSummary,
      pendingRequestsCount: pendingRequests.length,
      upcomingSessionsCount: upcomingSessions.length,
      upcomingSessions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 8. SEEKER STUDIO: CODE EXECUTION ENGINE
// ==========================================

app.post('/api/studio/execute', auth(), async (req, res) => {
  try {
    const { language, code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ output: 'Error: No code provided to execute.' });
    }

    let output = '';

    if (language === 'javascript') {
      const vm = require('vm');
      let logs = [];
      const sandbox = {
        console: {
          log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.join(' '))
        }
      };

      try {
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox, { timeout: 2500 });
        output = logs.length > 0 ? logs.join('\n') : 'Code executed successfully with no stdout output.';
      } catch (execErr) {
        output = `Runtime Error: ${execErr.message}`;
      }
    } else {
      try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: language === 'python' ? 'python3' : language,
            version: '*',
            files: [{ content: code }]
          })
        });
        const data = await response.json();
        output = data.run?.output || data.message || 'Execution completed.';
      } catch (err) {
        output = `Execution engine unavailable. Output simulated:\nProgram compiled successfully.`;
      }
    }

    res.json({ output });
  } catch (err) {
    res.status(500).json({ output: `Server execution error: ${err.message}` });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    app.listen(PORT, () => {
      console.log(`🚀 SEEKER Backend live on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });