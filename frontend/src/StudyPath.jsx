import React, { useState, useEffect } from 'react';
import API from './api';
import { 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  Layers,
  Trash2
} from 'lucide-react';

export default function StudyPath() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async (selectName = null) => {
    try {
      const res = await API.get('/subjects');
      setSubjects(res.data);
      if (res.data.length > 0) {
        const toSelect = selectName 
          ? res.data.find(s => s.name.toLowerCase() === selectName.toLowerCase()) || res.data[0]
          : res.data[0];
        setSelectedSubject(toSelect);
        if (toSelect.topics && toSelect.topics.length > 0) {
          setSelectedTopic(toSelect.topics[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load subjects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomRoadmap = async (e) => {
    if (e) e.preventDefault();
    if (!customTopicInput.trim()) return;

    setGeneratingCustom(true);
    try {
      const res = await API.post('/subjects/generate', { topicName: customTopicInput.trim() });
      await loadSubjects(res.data.name);
      setCustomTopicInput('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate custom roadmap.');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const handleDeleteSubject = async (e, subjectId, subjectName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the "${subjectName}" roadmap?`)) {
      return;
    }

    try {
      await API.delete(`/subjects/${subjectId}`);
      const updated = subjects.filter(s => s._id !== subjectId);
      setSubjects(updated);
      if (selectedSubject?._id === subjectId) {
        setSelectedSubject(updated[0] || null);
        setSelectedTopic(updated[0]?.topics?.[0] || null);
        setQuiz(null);
        setQuizResult(null);
      }
    } catch (err) {
      alert('Failed to delete roadmap.');
    }
  };

  const handleSelectSubject = (sub) => {
    setSelectedSubject(sub);
    setSelectedTopic(sub.topics && sub.topics.length > 0 ? sub.topics[0] : null);
    setQuiz(null);
    setQuizResult(null);
  };

  const handleSelectTopic = (topic) => {
    setSelectedTopic(topic);
    setQuiz(null);
    setQuizResult(null);
  };

  const handleStartQuiz = async () => {
    if (!selectedSubject || !selectedTopic) return;
    try {
      const res = await API.get(`/quizzes/${selectedSubject._id}?topicTitle=${encodeURIComponent(selectedTopic.title)}`);
      setQuiz(res.data);
      setQuizAnswers({});
      setQuizResult(null);
    } catch (err) {
      alert('Quiz not found for this topic.');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    try {
      const res = await API.post('/quizzes/submit', {
        quizId: quiz._id,
        answers: quizAnswers
      });
      setQuizResult(res.data);
    } catch (err) {
      alert('Error submitting quiz.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 text-slate-400">
        <BookOpen className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading study roadmaps...</span>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header & Dynamic Roadmap Creator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-500/30">
            Curriculum &amp; Concept Mastery
          </span>
          <h1 className="text-3xl font-black text-white">StudyPath Roadmaps</h1>
          <p className="text-slate-400 text-sm mt-1">
            Explore sequential subject modules or synthesize a custom learning roadmap on-demand.
          </p>
        </div>

        <form onSubmit={handleGenerateCustomRoadmap} className="flex gap-2 w-full lg:max-w-md">
          <input
            type="text"
            value={customTopicInput}
            onChange={(e) => setCustomTopicInput(e.target.value)}
            placeholder="Want to learn something else? e.g. Machine Learning, DevOps..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={generatingCustom}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generatingCustom ? 'Generating...' : 'Build Roadmap'}
          </button>
        </form>
      </div>

      {/* Subject Navigation Tabs with Delete Action */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {subjects.map((sub) => {
          const isSelected = selectedSubject?._id === sub._id;
          return (
            <div
              key={sub._id}
              onClick={() => handleSelectSubject(sub)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 border cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{sub.name}</span>

              {subjects.length > 1 && (
                <button
                  type="button"
                  title="Remove this Roadmap"
                  onClick={(e) => handleDeleteSubject(e, sub._id, sub.name)}
                  className="opacity-60 hover:opacity-100 hover:text-red-300 p-0.5 rounded transition ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedSubject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Topics / Sequential Curriculum Roadmap */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              {selectedSubject.name} Modules ({selectedSubject.topics?.length || 0})
            </h3>

            {selectedSubject.topics?.map((top, idx) => {
              const isSelected = selectedTopic?.title === top.title;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectTopic(top)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Phase {idx + 1}</span>
                    <h4 className="text-xs font-bold text-white">{top.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{top.description || top.overview}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ml-2 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                </div>
              );
            })}
          </div>

          {/* Right Column: Module Details & Quiz Engine */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTopic && !quiz && !quizResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                      {selectedSubject.name} Module
                    </span>
                    <h2 className="text-2xl font-black text-white">{selectedTopic.title}</h2>
                  </div>
                  <button
                    onClick={handleStartQuiz}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shrink-0"
                  >
                    <HelpCircle className="w-4 h-4" /> Take Topic Quiz
                  </button>
                </div>

                <div className="space-y-4 text-slate-300 text-xs leading-relaxed">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">Overview</h4>
                    <p className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                      {selectedTopic.description || selectedTopic.overview || 'Comprehensive overview for this module.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">Detailed Technical Notes</h4>
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 leading-relaxed space-y-2 whitespace-pre-line text-slate-200">
                      {selectedTopic.content || selectedTopic.detailedNotes || 'Technical notes covering implementation paradigms, error states, and algorithmic complexity.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Quiz Active State */}
            {quiz && !quizResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold text-indigo-400 uppercase">Knowledge Check</span>
                  <h3 className="text-xl font-bold text-white mt-1">{quiz.title}</h3>
                </div>

                <div className="space-y-6">
                  {quiz.questions?.map((q, qIndex) => (
                    <div key={q._id} className="space-y-3">
                      <p className="text-xs font-bold text-slate-200">
                        {qIndex + 1}. {q.questionText}
                      </p>
                      <div className="space-y-2">
                        {q.options?.map((opt, oIndex) => {
                          const isSelected = quizAnswers[q._id] === opt;
                          return (
                            <button
                              key={oIndex}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [q._id]: opt }))}
                              className={`w-full text-left p-3 rounded-xl text-xs font-medium transition border flex items-center justify-between ${
                                isSelected
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setQuiz(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-lg"
                  >
                    Submit Quiz
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Result State */}
            {quizResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-400">Assessment Result</span>
                    <h3 className="text-xl font-black text-white mt-0.5">
                      Score: {quizResult.score} / {quizResult.totalQuestions} ({quizResult.percentage}%)
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    quizResult.isWeak ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {quizResult.isWeak ? 'Needs Revision' : 'Concept Mastered'}
                  </span>
                </div>

                <div className="space-y-3">
                  {quizResult.details?.map((d, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <p className="font-bold text-white">{i + 1}. {d.questionText}</p>
                      <p className={d.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                        Your Answer: {d.userAnswer} ({d.isCorrect ? 'Correct' : 'Wrong'})
                      </p>
                      {!d.isCorrect && <p className="text-slate-400">Correct Answer: {d.correctAnswer}</p>}
                      <p className="text-[11px] text-slate-500 pt-1"><strong>Explanation:</strong> {d.explanation}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setQuiz(null); setQuizResult(null); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  Return to Module Notes
                </button>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}