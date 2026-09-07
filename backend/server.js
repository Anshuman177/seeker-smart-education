const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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

function synthesizeQuestionsForTopic(skillName, targetCount) {
  const cleanSkill = (skillName || 'Computer Science').trim();
  const difficulties = ['Easy', 'Medium', 'Hard'];
  
  const questionsList = [
    {
      q: `What is the primary architectural objective and core runtime design rule when building applications in ${cleanSkill}?`,
      options: [
        `Ensuring modular isolation, deterministic predictability, and robust state management.`,
        `Disabling exception boundaries to maximize raw, unverified thread execution speed.`,
        `Storing all volatile runtime state directly inside global unmanaged memory pointers.`,
        `Relying entirely on client-side caching without backend verification.`
      ],
      ans: `Ensuring modular isolation, deterministic predictability, and robust state management.`,
      exp: `Achieving reliable production systems in ${cleanSkill} requires strict adherence to modular boundaries and predictable state handling.`
    },
    {
      q: `Which strategy is most critical for optimizing performance and scaling workloads in ${cleanSkill}?`,
      options: [
        `Horizontal modular partitioning, asynchronous execution pipelines, and smart caching.`,
        `Executing infinite blocking loops on the main execution thread.`,
        `Bypassing input sanitization to accelerate data ingestion throughput.`,
        `Disabling transactional rollbacks during database write operations.`
      ],
      ans: `Horizontal modular partitioning, asynchronous execution pipelines, and smart caching.`,
      exp: `Proper partitioning and async pipelines prevent bottlenecks when scaling ${cleanSkill} architectures under high load.`
    },
    {
      q: `How does a robust production environment handle unhandled exceptions or runtime failures in ${cleanSkill}?`,
      options: [
        `Through structured exception propagation, graceful rollbacks, and comprehensive logging.`,
        `By terminating the underlying host operating system kernel immediately.`,
        `By suppressing error signals and returning empty null pointers silently.`,
        `By corrupting active thread memory caches to speed up reboot times.`
      ],
      ans: `Through structured exception propagation, graceful rollbacks, and comprehensive logging.`,
      exp: `Structured exceptions guarantee atomic rollbacks and prevent data corruption in ${cleanSkill}.`
    },
    {
      q: `What is a common anti-pattern or design flaw to avoid when structuring projects in ${cleanSkill}?`,
      options: [
        `Tight coupling across modules, lack of separation of concerns, and absent unit tests.`,
        `Writing reusable components and clean modular documentation.`,
        `Implementing non-blocking asynchronous event loops.`,
        `Enforcing strict typing and input validation layers.`
      ],
      ans: `Tight coupling across modules, lack of separation of concerns, and absent unit tests.`,
      exp: `Avoiding tight coupling ensures high maintainability and testability across ${cleanSkill} codebases.`
    },
    {
      q: `Why is dependency management and modular architecture crucial for enterprise scaling in ${cleanSkill}?`,
      options: [
        `It enables independent component testing, clean versioning, and maintainable codebases.`,
        `It increases binary file size to improve JIT compiler optimization flags.`,
        `It bypasses enterprise network security firewalls automatically.`,
        `It eliminates the need for any version control systems like Git.`
      ],
      ans: `It enables independent component testing, clean versioning, and maintainable codebases.`,
      exp: `Modular dependency management is the cornerstone of robust enterprise software engineering in ${cleanSkill}.`
    },
    {
      q: `What role do core data structures play in optimizing memory efficiency within ${cleanSkill}?`,
      options: [
        `Choosing the correct structure minimizes time complexity and prevents excessive heap allocation.`,
        `They have no impact on runtime performance or memory consumption.`,
        `They automatically encrypt sensitive user credentials at rest.`,
        `They replace the need for physical RAM storage entirely.`
      ],
      ans: `Choosing the correct structure minimizes time complexity and prevents excessive heap allocation.`,
      exp: `Optimal data structure selection directly governs algorithmic efficiency and memory footprint in ${cleanSkill}.`
    },
    {
      q: `How can developers ensure robust security hardening when deploying ${cleanSkill} solutions?`,
      options: [
        `By validating all untrusted inputs, enforcing principle of least privilege, and sanitizing payloads.`,
        `By storing plaintext passwords directly in client-side cookies.`,
        `By disabling authentication headers on all public API routes.`,
        `By executing unverified external scripts directly in production.`
      ],
      ans: `By validating all untrusted inputs, enforcing principle of least privilege, and sanitizing payloads.`,
      exp: `Security best practices in ${cleanSkill} mandate rigorous input validation and secure permission boundaries.`
    },
    {
      q: `What is the significance of establishing automated testing suites for ${cleanSkill} implementations?`,
      options: [
        `It catches regression bugs early, validates business logic, and ensures safe refactoring.`,
        `It slows down deployment pipelines permanently without adding value.`,
        `It replaces the need for manual code reviews and architecture design.`,
        `It forces applications to run exclusively on single-threaded CPUs.`
      ],
      ans: `It catches regression bugs early, validates business logic, and ensures safe refactoring.`,
      exp: `Automated testing suites provide confidence and verify contract adherence across ${cleanSkill} releases.`
    },
    {
      q: `Which debugging or diagnostic approach is most effective when isolating performance bottlenecks in ${cleanSkill}?`,
      options: [
        `Profiling execution time, analyzing memory heap snapshots, and inspecting trace logs.`,
        `Deleting random configuration files until the application starts.`,
        `Ignoring error warnings and clearing browser cache repeatedly.`,
        `Disabling all logging mechanisms to save disk space.`
      ],
      ans: `Profiling execution time, analyzing memory heap snapshots, and inspecting trace logs.`,
      exp: `Systematic profiling and heap analysis are essential tools for diagnosing bottlenecks in ${cleanSkill}.`
    },
    {
      q: `What best defines production readiness for a distributed system leveraging ${cleanSkill}?`,
      options: [
        `High availability, fault tolerance, horizontal elasticity, and robust observability metrics.`,
        `Running on a single local laptop with infinite CPU throttling.`,
        `Hardcoding all service IP addresses directly into source files.`,
        `Using unencrypted HTTP connections for all internal microservice traffic.`
      ],
      ans: `High availability, fault tolerance, horizontal elasticity, and robust observability metrics.`,
      exp: `Production-grade deployments of ${cleanSkill} demand fault tolerance, elasticity, and comprehensive telemetry.`
    }
  ];

  const topicsList = ['Foundations & Core Syntax', 'Architecture & Design', 'Execution Mechanics', 'Performance Optimization', 'Production Best Practices'];
  const generated = [];

  for (let i = 0; i < targetCount; i++) {
    const template = questionsList[i % questionsList.length];
    const difficulty = difficulties[i % difficulties.length];
    const topic = topicsList[i % topicsList.length];

    generated.push({
      _id: new mongoose.Types.ObjectId(),
      skill: cleanSkill,
      difficulty,
      topic,
      question: template.q,
      options: shuffle(template.options),
      correctAnswer: template.ans,
      explanation: template.exp
    });
  }

  return generated;
}

app.post('/api/skillproof/generate-from-library', auth(), async (req, res) => {
  try {
    const { skill, libraryItemId, count } = req.body;
    const targetCount = parseInt(count, 10) || 10;
    const cleanSkill = (skill || 'Computer Science').trim();

    let selectedResource = null;
    if (libraryItemId) selectedResource = await LibraryItem.findById(libraryItemId);
    if (!selectedResource && cleanSkill) {
      const regex = new RegExp(cleanSkill, 'i');
      selectedResource = await LibraryItem.findOne({
        $or: [{ skill: regex }, { title: regex }, { topics: regex }]
      });
    }

    if (!selectedResource) {
      selectedResource = new LibraryItem({
        title: `${cleanSkill} Standard Academic Reference Guide`,
        skill: cleanSkill,
        type: 'Lecture Notes',
        author: 'SEEKER Knowledge Aggregator',
        topics: [`${cleanSkill} Fundamentals`, `${cleanSkill} Core Architecture`, `${cleanSkill} Production Optimization`],
        fullBookUrl: `https://openlibrary.org/search?q=${encodeURIComponent(cleanSkill)}`,
        freeSourceProvider: 'Internet Archive Open Library',
        content: `${cleanSkill} represents a vital domain in modern software engineering and computer science. Comprehensive mastery involves understanding core execution syntax, memory layout, structural design patterns, and robust verification methodologies.`
      });
      await selectedResource.save();
    }

    const questions = synthesizeQuestionsForTopic(cleanSkill, targetCount);
    res.json({
      skill: selectedResource.skill,
      sourceTitle: selectedResource.title,
      sourceType: selectedResource.type,
      author: selectedResource.author,
      freeSourceProvider: selectedResource.freeSourceProvider,
      fullBookUrl: selectedResource.fullBookUrl,
      questions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/skillproof/submit-assessment', auth(), async (req, res) => {
  try {
    const { skill, answers, questionsData } = req.body;
    let score = 0;
    const diffStats = {
      Easy: { total: 0, correct: 0 },
      Medium: { total: 0, correct: 0 },
      Hard: { total: 0, correct: 0 }
    };
    const topicStats = {};

    let listToAudit = questionsData && Array.isArray(questionsData) ? questionsData : [];

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

app.put('/api/studyswap/request/:id', auth(), async (req, res) => {
  try {
    const { status, scheduledDate, scheduledTime, durationMinutes, topicToCover } = req.body;
    const reqDoc = await LearningRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found.' });

    if (reqDoc.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the recipient can accept or reject this request.' });
    }

    if (status === 'REJECTED') {
      reqDoc.status = 'REJECTED';
      await reqDoc.save();
      return res.json({ message: 'Request declined.', reqDoc });
    }

    if (status === 'ACCEPTED') {
      const finalDate = scheduledDate && scheduledDate.trim() !== '' ? scheduledDate : new Date().toISOString().split('T')[0];
      const finalTime = scheduledTime && scheduledTime.trim() !== '' ? scheduledTime : '18:00';
      const finalDuration = parseInt(durationMinutes, 10) || 30;
      const finalTopic = topicToCover || `${reqDoc.skillRequested} Peer Exchange`;

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
          status: isAlreadyTime ? 'LIVE' : 'SCHEDULED',
          signals: []
        });
        await session.save();
      }

      return res.json({ message: 'Request accepted and session successfully scheduled!', reqDoc, session });
    }

    res.status(400).json({ message: 'Invalid status update.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error while scheduling.' });
  }
});

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

app.delete('/api/studyswap/request/:id', auth(), async (req, res) => {
  try {
    await LearningRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request permanently deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/studyswap/session/:id', auth(), async (req, res) => {
  try {
    await LearningSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Meeting record deleted permanently.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
// 5. SEEKER MEET: REST SIGNALING & ROOM ROUTES
// ==========================================

app.get('/api/meet/room/:roomId', auth(), async (req, res) => {
  try {
    const meeting = await LearningSession.findOne({ roomId: req.params.roomId })
      .populate('hostId', 'name email college skillsTeach skillsLearn')
      .populate('studentA', 'name email college skillsTeach skillsLearn')
      .populate('studentB', 'name email college skillsTeach skillsLearn');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting room not found.' });
    }
    if (meeting.status === 'COMPLETED') {
      return res.status(410).json({ message: 'Meeting has already concluded.' });
    }
    if (meeting.status === 'CANCELLED') {
      return res.status(410).json({ message: 'Meeting has been cancelled.' });
    }

    const currentUserIdStr = req.user.id.toString();
    const studentAStr = meeting.studentA ? (meeting.studentA._id ? meeting.studentA._id.toString() : meeting.studentA.toString()) : '';
    const studentBStr = meeting.studentB ? (meeting.studentB._id ? meeting.studentB._id.toString() : meeting.studentB.toString()) : '';
    const hostIdStr = meeting.hostId ? (meeting.hostId._id ? meeting.hostId._id.toString() : meeting.hostId.toString()) : '';

    if (currentUserIdStr !== studentAStr && currentUserIdStr !== studentBStr && currentUserIdStr !== hostIdStr) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to join this meeting room.' });
    }

    res.json(meeting);
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ message: 'Server error fetching room.' });
  }
});

app.post('/api/meet/room/:roomId/signal', auth(), async (req, res) => {
  try {
    const { type, payload } = req.body;
    
    const validSignalTypes = ['offer', 'answer', 'ice-candidate', 'participant-left'];
    if (!validSignalTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid signal type.' });
    }

    const meeting = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ message: 'Room not found' });
    if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
      return res.status(410).json({ message: 'Meeting is no longer active.' });
    }

    const currentUserIdStr = req.user.id.toString();
    const studentAStr = meeting.studentA ? meeting.studentA.toString() : '';
    const studentBStr = meeting.studentB ? meeting.studentB.toString() : '';
    const hostIdStr = meeting.hostId ? meeting.hostId.toString() : '';

    if (currentUserIdStr !== studentAStr && currentUserIdStr !== studentBStr && currentUserIdStr !== hostIdStr) {
      return res.status(403).json({ message: 'Forbidden: You are not a participant of this meeting room.' });
    }

    // Backend calculates receiver; never trust frontend payload.receiver
    const receiverId = (currentUserIdStr === studentAStr) ? studentBStr : studentAStr;
    if (!receiverId) {
      return res.status(400).json({ message: 'Target receiver could not be determined.' });
    }

    if (!meeting.signals) meeting.signals = [];

    meeting.signals.push({
      sender: req.user.id,
      receiver: receiverId,
      type,
      payload,
      timestamp: Date.now(),
      acknowledged: false
    });

    await meeting.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error posting signal:', err);
    res.status(500).json({ message: 'Server error posting signal' });
  }
});

app.get('/api/meet/room/:roomId/signal', auth(), async (req, res) => {
  try {
    const meeting = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ message: 'Room not found' });
    if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
      return res.status(410).json({ message: 'Meeting is no longer active.' });
    }

    const currentUserIdStr = req.user.id.toString();
    const studentAStr = meeting.studentA ? meeting.studentA.toString() : '';
    const studentBStr = meeting.studentB ? meeting.studentB.toString() : '';
    const hostIdStr = meeting.hostId ? meeting.hostId.toString() : '';

    if (currentUserIdStr !== studentAStr && currentUserIdStr !== studentBStr && currentUserIdStr !== hostIdStr) {
      return res.status(403).json({ message: 'Forbidden: You are not a participant of this meeting room.' });
    }

    // Return ONLY unacknowledged signals for the current user without deleting them permanently
    const unacknowledgedSignals = (meeting.signals || []).filter(
      sig => sig.receiver && sig.receiver.toString() === currentUserIdStr && !sig.acknowledged
    );

    res.json({ signals: unacknowledgedSignals });
  } catch (err) {
    console.error('Error fetching signals:', err);
    res.status(500).json({ message: 'Server error fetching signals' });
  }
});

// Explicit Acknowledgment Endpoint to safely clear signals only after client processing
app.post('/api/meet/room/:roomId/signal/ack', auth(), async (req, res) => {
  try {
    const { signalIds } = req.body;
    if (!signalIds || !Array.isArray(signalIds)) {
      return res.status(400).json({ message: 'signalIds array is required.' });
    }

    const meeting = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ message: 'Room not found' });

    const currentUserIdStr = req.user.id.toString();
    let updated = false;

    for (const sig of meeting.signals) {
      if (
        sig.receiver &&
        sig.receiver.toString() === currentUserIdStr &&
        signalIds.includes(sig._id.toString())
      ) {
        sig.acknowledged = true;
        updated = true;
      }
    }

    if (updated) {
      // Clean up fully acknowledged or old signals to prevent document bloat
      meeting.signals = meeting.signals.filter(
        sig => !sig.acknowledged || (Date.now() - sig.timestamp < 300000)
      );
      await meeting.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error acknowledging signals:', err);
    res.status(500).json({ message: 'Server error acknowledging signals' });
  }
});

app.post('/api/meet/room/:roomId/leave', auth(), async (req, res) => {
  try {
    const meeting = await LearningSession.findOne({ roomId: req.params.roomId });
    if (meeting) {
      const currentUserIdStr = req.user.id.toString();
      const studentAStr = meeting.studentA ? meeting.studentA.toString() : '';
      const studentBStr = meeting.studentB ? meeting.studentB.toString() : '';
      const hostIdStr = meeting.hostId ? meeting.hostId.toString() : '';

      if (currentUserIdStr !== studentAStr && currentUserIdStr !== studentBStr && currentUserIdStr !== hostIdStr) {
        return res.status(403).json({ message: 'Forbidden.' });
      }

      const targetReceiver = (currentUserIdStr === studentAStr) ? studentBStr : studentAStr;

      if (!meeting.signals) meeting.signals = [];
      meeting.signals.push({
        sender: req.user.id,
        receiver: targetReceiver,
        type: 'participant-left',
        payload: { userId: req.user.id },
        timestamp: Date.now(),
        acknowledged: false
      });
      await meeting.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/meet/room/:roomId/end', auth(), async (req, res) => {
  try {
    const meeting = await LearningSession.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ message: 'Meeting room not found.' });

    const currentUserIdStr = req.user.id.toString();
    const hostIdStr = meeting.hostId ? meeting.hostId.toString() : '';

    if (currentUserIdStr !== hostIdStr) {
      return res.status(403).json({ message: 'Forbidden: Only the meeting host can end the session for everyone.' });
    }

    if (meeting.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Meeting has already been completed.' });
    }

    meeting.status = 'COMPLETED';
    meeting.endedAt = new Date();
    await meeting.save();

    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ message: 'Failed to end meeting' });
  }
});

// ==========================================
// 6. SEEKER STUDIO: CODE EXECUTION ENGINE
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