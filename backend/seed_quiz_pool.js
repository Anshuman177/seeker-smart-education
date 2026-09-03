const mongoose = require('mongoose');
require('dotenv').config();

const { Subject, Quiz } = require('./models/Education');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    let subject = await Subject.findOne({ name: 'Operating Systems' });
    if (!subject) {
      subject = await Subject.create({
        name: 'Operating Systems',
        category: 'Core Computer Science',
        description: 'Process Management, Deadlocks, Memory Management, and File Systems.',
        topics: [{
          title: 'Process Management',
          description: 'CPU scheduling, Threads, and Concurrency.',
          content: 'A process is a program in execution. The operating system manages processes using Process Control Blocks (PCBs), context switching, and scheduling algorithms like FCFS, SJF, and Round Robin.',
          resources: [{ title: 'OS Silberschatz Guide', url: 'https://os-book.com' }]
        }]
      });
    }

    await Quiz.deleteMany({ topicTitle: 'Process Management' });

    await Quiz.create({
      subjectId: subject._id,
      topicTitle: 'Process Management',
      title: 'Process Scheduling Assessment',
      questions: [
        {
          questionText: 'Which scheduling algorithm is non-preemptive by nature?',
          options: ['Round Robin', 'FCFS (First Come First Serve)', 'SRTF (Shortest Remaining Time First)', 'Preemptive Priority'],
          correctAnswer: 'FCFS (First Come First Serve)',
          explanation: 'FCFS processes requests strictly in arrival order without interrupting running processes.'
        },
        {
          questionText: 'What does PCB stand for in operating systems?',
          options: ['Process Control Block', 'Primary Circuit Board', 'Program Central Base', 'Process Calculation Buffer'],
          correctAnswer: 'Process Control Block',
          explanation: 'PCB stores process state, program counter, CPU registers, and memory management information.'
        },
        {
          questionText: 'Which state transition happens when a running process requests I/O?',
          options: ['Running to Terminated', 'Running to Waiting/Blocked', 'Ready to Running', 'Waiting to Ready'],
          correctAnswer: 'Running to Waiting/Blocked',
          explanation: 'When an active process requests an I/O operation, the OS moves it to Waiting state until the I/O completes.'
        },
        {
          questionText: 'What is a context switch?',
          options: ['Saving CPU state of old process and loading state of new process', 'Changing the RAM frequency', 'Switching monitors', 'Converting user code to assembly'],
          correctAnswer: 'Saving CPU state of old process and loading state of new process',
          explanation: 'Context switching is the mechanism where the kernel saves current process context into PCB and restores the next scheduled process.'
        },
        {
          questionText: 'Which scheduling algorithm is prone to the Convoy Effect?',
          options: ['Round Robin', 'Multi-level Feedback Queue', 'FCFS', 'Shortest Job First'],
          correctAnswer: 'FCFS',
          explanation: 'Convoy Effect occurs in FCFS when a CPU-intensive heavy process blocks many short I/O-bound processes behind it.'
        }
      ]
    });

    console.log('✅ 5-Question Pool seeded with explanations for Process Management!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();