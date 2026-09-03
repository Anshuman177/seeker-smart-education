const mongoose = require('mongoose');

const LibraryItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  skill: { type: String, required: true },
  type: { type: String, enum: ['Book', 'Lecture Notes', 'Reference Guide'], default: 'Lecture Notes' },
  author: { type: String, default: 'Academic Faculty' },
  content: { type: String, required: true },
  topics: [{ type: String }],
  fullBookUrl: { type: String, default: '' }, // Official verified free book link
  freeSourceProvider: { type: String, default: 'Open Library / Academic Repository' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LibraryItem', LibraryItemSchema);