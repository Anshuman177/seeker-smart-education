const mongoose = require('mongoose');
require('dotenv').config();

const { SkillChallenge } = require('./models/SkillProof');

async function seedChallenges() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await SkillChallenge.deleteMany({});

    const challenges = [
      {
        skillName: 'Python',
        level: 'Intermediate',
        title: 'Core Python & Algorithmic Structures',
        description: 'Prove algorithmic understanding of list comprehensions, dictionary operations, and time complexities.',
        questions: [
          {
            questionText: 'What is the average time complexity of dictionary key lookup in Python?',
            options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
            correctAnswerIndex: 2
          },
          {
            questionText: 'Which built-in function converts an iterable into an iterator object?',
            options: ['iter()', 'next()', 'loop()', 'range()'],
            correctAnswerIndex: 0
          },
          {
            questionText: 'What is the output of `[x**2 for x in range(4) if x % 2 == 0]`?',
            options: ['[0, 4]', '[0, 1, 4, 9]', '[1, 9]', '[4, 16]'],
            correctAnswerIndex: 0
          }
        ]
      },
      {
        skillName: 'React',
        level: 'Advanced',
        title: 'State Management & Performance Optimization',
        description: 'Demonstrate mastery over hooks lifecycle, useMemo vs useCallback, and reconciliation.',
        questions: [
          {
            questionText: 'What is the primary purpose of the `useCallback` hook?',
            options: ['To cache the return value of an expensive calculation', 'To memoize a callback function instance between renders', 'To trigger direct DOM mutations', 'To manage WebSocket connections'],
            correctAnswerIndex: 1
          },
          {
            questionText: 'When does `useEffect` cleanup function execute?',
            options: ['Only when the browser window closes', 'Before running the effect next time and on component unmount', 'Immediately after every DOM render synchronously', 'Never if dependencies are empty'],
            correctAnswerIndex: 1
          },
          {
            questionText: 'What algorithm does React use for DOM diffing?',
            options: ['Dijkstra Algorithm', 'React Fiber Reconciliation with Heuristic O(n)', 'Binary Tree Traversal', 'Greedy Search'],
            correctAnswerIndex: 1
          }
        ]
      },
      {
        skillName: 'SQL',
        level: 'Intermediate',
        title: 'Relational Database Queries & Normalization',
        description: 'Test knowledge on complex joins, indexing strategies, and ACID properties.',
        questions: [
          {
            questionText: 'Which SQL clause is used to filter records after aggregation with GROUP BY?',
            options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
            correctAnswerIndex: 1
          },
          {
            questionText: 'What does the "I" stand for in ACID properties?',
            options: ['Integrity', 'Isolation', 'Inheritance', 'Index'],
            correctAnswerIndex: 1
          }
        ]
      }
    ];

    await SkillChallenge.insertMany(challenges);
    console.log(`✅ ${challenges.length} SkillProof Challenges seeded successfully into MongoDB!`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding SkillProof:', err.message);
    process.exit(1);
  }
}

seedChallenges();