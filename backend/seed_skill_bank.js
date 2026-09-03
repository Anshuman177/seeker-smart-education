const mongoose = require('mongoose');
require('dotenv').config();

const { SkillQuestion } = require('./models/SkillProof');

const pool = [
  // PYTHON
  { skill: 'Python', difficulty: 'Easy', questionText: 'Which of the following is an immutable data type in Python?', options: ['List', 'Dictionary', 'Tuple', 'Set'], correctAnswer: 'Tuple', explanation: 'Tuples cannot be modified after creation, making them immutable.' },
  { skill: 'Python', difficulty: 'Easy', questionText: 'What is the correct file extension for Python files?', options: ['.py', '.python', '.pyt', '.pt'], correctAnswer: '.py', explanation: 'Standard Python source files use the .py extension.' },
  { skill: 'Python', difficulty: 'Easy', questionText: 'Which function is used to get the length of a list?', options: ['size()', 'len()', 'length()', 'count()'], correctAnswer: 'len()', explanation: 'len() returns the number of items in an iterable.' },
  { skill: 'Python', difficulty: 'Medium', questionText: 'What is the average time complexity of dictionary lookup in Python?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], correctAnswer: 'O(1)', explanation: 'Python dictionaries use hash tables offering average O(1) time complexity.' },
  { skill: 'Python', difficulty: 'Medium', questionText: 'Which built-in function converts an iterable into an iterator object?', options: ['iter()', 'next()', 'loop()', 'range()'], correctAnswer: 'iter()', explanation: 'iter() retrieves an iterator from any collection supporting the iteration protocol.' },
  { skill: 'Python', difficulty: 'Medium', questionText: 'What will `[x**2 for x in range(5) if x % 2 == 0]` produce?', options: ['[0, 4, 16]', '[0, 1, 4, 9, 16]', '[4, 16]', '[1, 9]'], correctAnswer: '[0, 4, 16]', explanation: '0, 2, 4 squared yields 0, 4, and 16.' },
  { skill: 'Python', difficulty: 'Hard', questionText: 'How does the Global Interpreter Lock (GIL) affect multi-threaded CPU-bound programs?', options: ['It doubles multi-core performance', 'It prevents true parallel execution of bytecode on multiple cores', 'It automatically offloads computation to GPU', 'It eliminates all memory leaks'], correctAnswer: 'It prevents true parallel execution of bytecode on multiple cores', explanation: 'GIL ensures only one thread executes Python bytecode at a time, limiting multi-core CPU scaling.' },
  { skill: 'Python', difficulty: 'Hard', questionText: 'What is the difference between `@staticmethod` and `@classmethod`?', options: ['No difference', '@classmethod receives the class (`cls`) as first argument; @staticmethod receives neither `self` nor `cls`', '@staticmethod cannot be called on instances', '@classmethod creates a singleton'], correctAnswer: '@classmethod receives the class (`cls`) as first argument; @staticmethod receives neither `self` nor `cls`', explanation: 'Class methods bind to the class object, whereas static methods behave as isolated utility functions inside the class namespace.' },

  // JAVASCRIPT
  { skill: 'JavaScript', difficulty: 'Easy', questionText: 'Which keyword declares a block-scoped re-assignable variable in modern JS?', options: ['var', 'let', 'const', 'global'], correctAnswer: 'let', explanation: 'let is block-scoped and allows re-assignment unlike const.' },
  { skill: 'JavaScript', difficulty: 'Easy', questionText: 'What does `typeof null` evaluate to in JavaScript?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctAnswer: '"object"', explanation: 'This is a historical quirk and bug in JavaScript since its first implementation.' },
  { skill: 'JavaScript', difficulty: 'Medium', questionText: 'What is the event loop phase responsible for running resolved Promise microtasks?', options: ['Timer Phase', 'Microtask Queue', 'I/O Polling Phase', 'Check/setImmediate Phase'], correctAnswer: 'Microtask Queue', explanation: 'Promise reactions run in the Microtask Queue immediately after the current macrotask finishes.' },
  { skill: 'JavaScript', difficulty: 'Medium', questionText: 'What is a Closure in JavaScript?', options: ['A way to close browser windows', 'A function combined with references to its lexical environment', 'A method to terminate async loops', 'A strictly private JSON object'], correctAnswer: 'A function combined with references to its lexical environment', explanation: 'Closures allow inner functions to access outer scope variables even after the outer function has executed.' },
  { skill: 'JavaScript', difficulty: 'Hard', questionText: 'What happens when you use `Object.freeze()` on an object with nested child objects?', options: ['It deep freezes all nested objects automatically', 'It freezes only top-level properties; nested objects remain mutable (shallow freeze)', 'It throws a TypeError', 'It converts properties to Symbols'], correctAnswer: 'It freezes only top-level properties; nested objects remain mutable (shallow freeze)', explanation: 'Object.freeze is shallow by default and requires recursive traversal for deep immutability.' },
  { skill: 'JavaScript', difficulty: 'Hard', questionText: 'How does `WeakMap` differ from a standard `Map`?', options: ['Keys must be objects and are held weakly without preventing garbage collection', 'It is synchronous while Map is asynchronous', 'It allows duplicate primitive keys', 'It provides a `.size` property'], correctAnswer: 'Keys must be objects and are held weakly without preventing garbage collection', explanation: 'WeakMap enables memory cleanup when key objects are no longer referenced elsewhere.' },

  // DBMS
  { skill: 'DBMS', difficulty: 'Easy', questionText: 'What does SQL stand for?', options: ['Structured Query Language', 'Sequential Question Language', 'Standard Query Logic', 'Simple Queue Language'], correctAnswer: 'Structured Query Language', explanation: 'SQL is the standard language for relational database systems.' },
  { skill: 'DBMS', difficulty: 'Easy', questionText: 'Which SQL command is used to remove a table and its structure permanently?', options: ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], correctAnswer: 'DROP', explanation: 'DROP removes the table definition and all its data from the database catalog.' },
  { skill: 'DBMS', difficulty: 'Medium', difficulty: 'Medium', questionText: 'Which normal form eliminates transitive dependency?', options: ['1NF', '2NF', '3NF', 'BCNF'], correctAnswer: '3NF', explanation: 'Third Normal Form (3NF) requires 2NF and that no non-prime attribute is transitively dependent on the primary key.' },
  { skill: 'DBMS', difficulty: 'Medium', questionText: 'What does the "I" represent in ACID transactions?', options: ['Integrity', 'Isolation', 'Indexing', 'Inheritance'], correctAnswer: 'Isolation', explanation: 'Isolation ensures concurrent transactions execute without interfering with one another.' },
  { skill: 'DBMS', difficulty: 'Hard', questionText: 'Which concurrency issue does Two-Phase Locking (2PL) guarantee to prevent?', options: ['Deadlocks', 'Non-serializable schedules', 'Network latency', 'Disk fragmentation'], correctAnswer: 'Non-serializable schedules', explanation: 'Rigorous 2PL guarantees serializability of concurrent transaction execution.' },

  // REACT
  { skill: 'React', difficulty: 'Easy', questionText: 'What function is used to create state in React Functional Components?', options: ['createState()', 'useState()', 'initComponentState()', 'useContext()'], correctAnswer: 'useState()', explanation: 'useState is the primary hook for adding state variables to function components.' },
  { skill: 'React', difficulty: 'Medium', questionText: 'What is the purpose of `useMemo` in React?', options: ['To cache the computed value of an expensive calculation across renders', 'To manage WebSocket streams', 'To create global singletons', 'To directly mutate the DOM tree'], correctAnswer: 'To cache the computed value of an expensive calculation across renders', explanation: 'useMemo memoizes recalculations until specified dependencies change.' },
  { skill: 'React', difficulty: 'Hard', questionText: 'In React Fiber architecture, what allows React to pause and resume work?', options: ['Generator Functions', 'Cooperative multitasking with linked-list Fiber node units of work', 'Web Workers', 'Microtask Queue yielding'], correctAnswer: 'Cooperative multitasking with linked-list Fiber node units of work', explanation: 'Fiber organizes rendering work into discrete linked-list nodes yielding execution to the browser main thread.' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    await SkillQuestion.deleteMany({});
    await SkillQuestion.insertMany(pool);
    console.log(`✅ ${pool.length} Multi-Difficulty Skill Questions Seeded!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();