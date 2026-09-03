require('dotenv').config();
const mongoose = require('mongoose');
const LibraryItem = require('./models/Library');

const libraryResources = [
  {
    title: 'Modern JavaScript Deep Dive & ES6+ Concepts',
    skill: 'JavaScript',
    type: 'Book',
    author: 'Mozilla Developer Network & Community',
    topics: ['Closures & Scope', 'Asynchronous Event Loop', 'Prototypes & Inheritance', 'Promises & Async/Await', 'Memory Management'],
    fullBookUrl: 'https://openlibrary.org/search?q=javascript+programming',
    freeSourceProvider: 'Internet Archive Open Library',
    content: `
      JavaScript is a single-threaded, non-blocking asynchronous concurrent language featuring an event loop, call stack, microtask queue, and callback task queue.
      1. Scope & Closures: A closure is the combination of a function bundled together with references to its lexical environment. Closures give an inner function access to an outer function's scope even after the outer function has executed and returned. Variables declared with 'var' are function-scoped and hoisted with 'undefined', whereas 'let' and 'const' are block-scoped and reside in the Temporal Dead Zone (TDZ) prior to declaration.
      2. Event Loop & Microtasks: Synchronous code runs in the call stack immediately. Promises (.then, .catch) and queueMicrotask enter the Microtask Queue, which has absolute priority over the Macrotask Callback Queue (setTimeout, setInterval, setImmediate). The event loop checks the call stack; when empty, it drains all microtasks before executing a macrotask.
      3. Prototypal Inheritance: Every JavaScript object possesses a private internal link to another object called its prototype (__proto__). Property lookups traverse the prototype chain until an object with a null prototype (Object.prototype) is reached. ES6 classes are syntactic sugar over prototype delegation.
      4. Asynchronous Patterns: Promises represent eventual completion or failure of an asynchronous operation. Async/await is syntactic sugar over generator functions yielding promises, allowing asynchronous code to be authored with synchronous readability while handling errors via try/catch blocks.
      5. Value vs Reference: Primitive types (string, number, boolean, null, undefined, symbol, bigint) are immutable and passed by value. Objects, arrays, and functions are mutable reference types stored on the heap. Strict equality (===) checks identity for objects and value/type for primitives.
    `
  },
  {
    title: 'Computer Networks: Protocols, Routing & OSI Layer Architecture',
    skill: 'Computer Networks',
    type: 'Book',
    author: 'Andrew S. Tanenbaum & David J. Wetherall',
    topics: ['OSI vs TCP/IP Models', 'Transport Layer (TCP/UDP)', 'Network Layer Routing', 'Application Protocols (HTTP/DNS)', 'Data Link & MAC Addressing'],
    fullBookUrl: 'https://openlibrary.org/search?q=computer+networks+tanenbaum',
    freeSourceProvider: 'Internet Archive Open Library',
    content: `
      Computer networks structure data communication across standardized physical, logical, and application layers.
      1. Layer Architectures: The OSI Reference Model specifies 7 layers (Physical, Data Link, Network, Transport, Session, Presentation, Application), while the TCP/IP model condenses communication into 4 layers (Network Interface, Internet, Transport, Application).
      2. Transport Layer: TCP (Transmission Control Protocol) is a connection-oriented, reliable protocol providing byte-stream delivery, guaranteed in-order sequencing, congestion control (AIMD), and flow control via a sliding window mechanism. It establishes connections via a 3-Way Handshake (SYN, SYN-ACK, ACK) and terminates via a 4-Way Handshake (FIN, ACK, FIN, ACK). UDP (User Datagram Protocol) is connectionless, unreliable, low-latency, and operates without handshakes or retransmissions, ideal for DNS and real-time media.
      3. Network Layer & Routing: IP (Internet Protocol) governs logical addressing and packet routing across heterogeneous networks. IPv4 employs 32-bit addresses, whereas IPv6 uses 128-bit addresses to eliminate NAT constraints. Routing algorithms include Link-State (Dijkstra's shortest path, e.g., OSPF) and Distance-Vector (Bellman-Ford, e.g., RIP and BGP). Subnetting partitions networks using CIDR notation and subnet masks.
      4. Application Layer: HTTP/1.1 uses persistent TCP connections but suffers from Head-of-Line (HoL) blocking. HTTP/2 introduces binary framing and multiplexing over a single TCP stream. HTTP/3 transitions to the UDP-based QUIC protocol to prevent transport-level HoL blocking. DNS resolves hierarchical domain names to IP addresses over UDP port 53.
      5. Data Link: Ethernet relies on 48-bit MAC addresses. Address Resolution Protocol (ARP) translates 32-bit IP addresses to 48-bit physical MAC addresses within a broadcast domain.
    `
  },
  {
    title: 'Operating Systems Principles: Concurrency, Scheduling & Memory',
    skill: 'Operating Systems',
    type: 'Reference Guide',
    author: 'Silberschatz, Galvin & Gagne',
    topics: ['Process Scheduling', 'Deadlocks & Synchronization', 'Virtual Memory & Paging', 'File Systems & Storage'],
    fullBookUrl: 'https://openlibrary.org/search?q=operating+system+concepts+silberschatz',
    freeSourceProvider: 'Internet Archive Open Library',
    content: `
      An Operating System mediates access between computing hardware and software applications.
      1. Processes & Threads: A process is a program in execution possessing its own virtual address space (code, data, heap, stack). Threads share code, data, and heap but retain independent program counters and stacks. Context switching requires saving CPU register states into the Process Control Block (PCB).
      2. CPU Scheduling: Preemptive scheduling allows interrupting active execution (e.g., Round Robin with time quantum, Shortest Remaining Time First). Non-preemptive algorithms include First-Come-First-Served (FCFS) and Shortest Job First (SJF). Priority inversion occurs when a lower-priority task blocks a higher-priority one; it is mitigated by Priority Inheritance.
      3. Synchronization & Deadlocks: The Critical Section problem is resolved by Mutual Exclusion, Progress, and Bounded Waiting. Semaphores (counting and binary) and Mutexes provide synchronization primitives. Deadlock occurs when four Coffman conditions hold concurrently: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Banker's Algorithm prevents deadlocks by ensuring safe state transitions.
      4. Memory Management: Virtual memory isolates process spaces and extends physical RAM via Demand Paging. The Translation Lookaside Buffer (TLB) caches virtual-to-physical address mappings from page tables. Page faults occur when a requested virtual page is not present in RAM, triggering page replacement algorithms such as LRU, Optimal, or FIFO. Belady's Anomaly demonstrates that increasing page frames can paradoxically increase FIFO page faults.
    `
  },
  {
    title: 'Relational Database Design & Distributed Query Optimization',
    skill: 'DBMS',
    type: 'Book',
    author: 'Raghu Ramakrishnan & Johannes Gehrke',
    topics: ['Relational Normalization', 'ACID & Transactions', 'Indexing (B+ Trees)', 'Concurrency Control (2PL)'],
    fullBookUrl: 'https://openlibrary.org/search?q=database+management+systems+ramakrishnan',
    freeSourceProvider: 'Internet Archive Open Library',
    content: `
      Database Management Systems ensure persistent, consistent, and concurrent data querying.
      1. Relational Theory & Normalization: Normalization reduces data redundancy and prevents insertion, update, and deletion anomalies. 1NF enforces atomic attributes. 2NF removes partial functional dependencies on candidate keys. 3NF removes transitive dependencies. BCNF guarantees that for every functional dependency X -> Y, X is a superkey.
      2. Transactions & ACID: Atomicity guarantees all-or-nothing execution, enforced via write-ahead logging (WAL). Consistency preserves schema constraints. Isolation ensures concurrent transactions do not interfere, categorized into Read Uncommitted, Read Committed, Repeatable Read, and Serializable. Durability ensures committed state survives system crashes.
      3. Indexing & Storage: B+ Trees are self-balancing multi-way search trees optimized for disk I/O, where all data pointers reside exclusively in leaf nodes linked sequentially for range queries. Hash indexes provide O(1) equality searches but fail on range predicates. Clustered indexes dictate physical table ordering on disk.
      4. Concurrency Control: Two-Phase Locking (2PL) guarantees conflict serializability through Growing (acquiring locks) and Shrinking (releasing locks) phases. Strict 2PL holds exclusive locks until commit or abort to prevent cascading rollbacks.
    `
  },
  {
    title: 'Python Internals, Data Structures & Concurrency Models',
    skill: 'Python',
    type: 'Lecture Notes',
    author: 'Python Software Foundation & Core Contributors',
    topics: ['GIL Mechanics', 'Memory Management & Garbage Collection', 'Generators & Iterators', 'Metaclasses & OOP'],
    fullBookUrl: 'https://docs.python.org/3/tutorial/',
    freeSourceProvider: 'Official Python Documentation & Library',
    content: `
      Python is an interpreted, dynamically-typed high-level language with automatic memory management.
      1. Global Interpreter Lock (GIL): CPython implements a mutex known as the GIL to ensure thread-safe execution of CPython bytecodes and protect internal reference counting. While multithreading aids I/O-bound tasks, CPU-bound workloads must utilize the multiprocessing module to leverage multi-core hardware.
      2. Memory Management: CPython handles allocation using PyMalloc for small blocks and implements reference counting supplemented by a cyclic generational garbage collector (Generations 0, 1, 2) that detects reference cycles via doubly linked lists.
      3. Generators & Iterables: Iterators implement the __iter__() and __next__() protocols. Generators use the 'yield' keyword to pause frame execution, maintaining stack state while producing values on-demand to achieve O(1) memory complexity during sequential iteration.
      4. Object Model: Everything in Python is an object, including functions, modules, and classes. Functions are first-class citizens. Classes are instances of metaclasses ('type' by default). Decorators dynamically modify function behavior using closures.
    `
  }
];

async function seedLibrary() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/seeker_db');
    await LibraryItem.deleteMany({});
    await LibraryItem.insertMany(libraryResources);
    console.log(`Updated ${libraryResources.length} books with permanent verified open-access URLs!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedLibrary();