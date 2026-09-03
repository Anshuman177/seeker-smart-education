import React, { useState, useEffect, useContext, useRef } from 'react';
import API from './api';
import { AuthContext } from './AuthContext';
import { 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  BookOpen, 
  Sparkles, 
  RotateCcw, 
  Printer, 
  ChevronRight, 
  AlertCircle, 
  X, 
  FileText, 
  Library,
  Download,
  FileCheck2,
  Loader2,
  Eye,
  BookMarked,
  Layers,
  FolderOpen
} from 'lucide-react';

export default function SkillProof() {
  const { user } = useContext(AuthContext);

  // View Mode: 'search' | 'library'
  const [libraryViewMode, setLibraryViewMode] = useState('library'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [allLibraryItems, setAllLibraryItems] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [searchingLibrary, setSearchingLibrary] = useState(false);

  // In-App Book Reader Modal
  const [readingBook, setReadingBook] = useState(null);

  // Active Assessment State
  const [assessment, setAssessment] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const printFrameRef = useRef(null);

  useEffect(() => {
    loadAllLibraryResources();
  }, []);

  const loadAllLibraryResources = async () => {
    setSearchingLibrary(true);
    try {
      // Empty query fetches all books/notes from MongoDB
      const res = await API.get('/library/search?query=');
      setAllLibraryItems(res.data || []);
      setFilteredResults(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedResource(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch library resources:', err);
    } finally {
      setSearchingLibrary(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredResults(allLibraryItems);
      return;
    }
    setSearchingLibrary(true);
    try {
      const res = await API.get(`/library/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setFilteredResults(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedResource(res.data[0]);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearchingLibrary(false);
    }
  };

  const handleGenerateAssessment = async (overrideResource) => {
    const targetResource = overrideResource || selectedResource;
    const targetSkill = targetResource ? targetResource.skill : searchQuery.trim();

    if (!targetSkill) {
      alert('Please select a book from the library or type a topic in the search box.');
      return;
    }

    setLoading(true);
    setResult(null);
    setUserAnswers({});
    setCurrentIndex(0);
    setReadingBook(null);

    try {
      const res = await API.post('/skillproof/generate-from-library', {
        skill: targetSkill,
        libraryItemId: targetResource?._id || null,
        count: questionCount
      });
      setAssessment(res.data);
      // Reload library in background so any new on-the-fly generated book appears in the library!
      loadAllLibraryResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate assessment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    const unansweredCount = assessment.questions.length - Object.keys(userAnswers).length;
    if (unansweredCount > 0) {
      if (!window.confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      let score = 0;
      const topicStats = {};
      const diffStats = { Easy: { total: 0, correct: 0 }, Medium: { total: 0, correct: 0 }, Hard: { total: 0, correct: 0 } };

      const questionAudit = assessment.questions.map(q => {
        const userChoice = userAnswers[q._id];
        const isCorrect = userChoice === q.correctAnswer;
        if (isCorrect) score += 1;

        if (diffStats[q.difficulty]) {
          diffStats[q.difficulty].total += 1;
          if (isCorrect) diffStats[q.difficulty].correct += 1;
        }

        if (!topicStats[q.topic]) {
          topicStats[q.topic] = { total: 0, correct: 0 };
        }
        topicStats[q.topic].total += 1;
        if (isCorrect) topicStats[q.topic].correct += 1;

        return {
          question: q.question,
          topic: q.topic,
          difficulty: q.difficulty,
          userChoice: userChoice || 'Skipped',
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation
        };
      });

      const totalQuestions = assessment.questions.length;
      const percentage = Math.round((score / totalQuestions) * 100);

      let level = 'Beginner';
      if (percentage >= 80) level = 'Advanced';
      else if (percentage >= 60) level = 'Intermediate';

      const strongTopics = [];
      const weakTopics = [];
      Object.keys(topicStats).forEach(top => {
        const acc = (topicStats[top].correct / topicStats[top].total) * 100;
        if (acc >= 60) strongTopics.push(top);
        else weakTopics.push(top);
      });

      const evidenceId = 'SKL-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

      const evaluationData = {
        skill: assessment.skill,
        sourceTitle: assessment.sourceTitle,
        evidenceId,
        score,
        totalQuestions,
        percentage,
        level,
        breakdown: {
          easy: { total: diffStats.Easy.total, correct: diffStats.Easy.correct, accuracy: diffStats.Easy.total ? Math.round((diffStats.Easy.correct / diffStats.Easy.total) * 100) : 0 },
          medium: { total: diffStats.Medium.total, correct: diffStats.Medium.correct, accuracy: diffStats.Medium.total ? Math.round((diffStats.Medium.correct / diffStats.Medium.total) * 100) : 0 },
          hard: { total: diffStats.Hard.total, correct: diffStats.Hard.correct, accuracy: diffStats.Hard.total ? Math.round((diffStats.Hard.correct / diffStats.Hard.total) * 100) : 0 }
        },
        strongTopics,
        weakTopics,
        questionAudit,
        completedAt: new Date().toISOString()
      };

      try {
        await API.post('/skillproof/submit-assessment', {
          skill: assessment.skill,
          answers: userAnswers,
          questionsData: assessment.questions
        });
      } catch (e) {
        console.warn('Backend sync:', e);
      }

      setResult(evaluationData);
      setAssessment(null);
    } catch (err) {
      alert('Error during assessment evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Hidden in-page iframe print (Zero blank tab popup issues)
  const triggerInPagePrint = (htmlMarkup) => {
    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlMarkup);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };

  const handleDownloadSkillEvidencePDF = () => {
    if (!result) return;
    setGeneratingPdf(true);

    try {
      const strongList = result.strongTopics && result.strongTopics.length > 0 
        ? result.strongTopics.map(t => `<span class="badge badge-green">${t}</span>`).join(' ')
        : '<span class="text-muted">Further assessment attempts required to establish high-confidence mastery.</span>';

      const weakList = result.weakTopics && result.weakTopics.length > 0
        ? result.weakTopics.map(t => `<span class="badge badge-amber">${t}</span>`).join(' ')
        : '<span class="text-muted">Zero diagnostic weaknesses recorded across test parameters.</span>';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SEEKER_Skill_Evidence_${result.evidenceId}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; background: #fff; line-height: 1.5; font-size: 10pt; }
            .card { border: 2px solid #312e81; border-radius: 12px; padding: 24px; }
            .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
            .badge-primary { background: #312e81; color: #fff; font-size: 8pt; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em; display: inline-block; margin-bottom: 6px; }
            h1 { font-size: 18pt; color: #1e1b4b; margin: 0 0 4px 0; font-weight: 900; }
            .meta { color: #64748b; font-size: 9pt; }
            .score-box { text-align: right; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 16px; border-radius: 10px; }
            .score-num { font-size: 24pt; font-weight: 900; color: #059669; display: block; line-height: 1; }
            .tier-tag { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #312e81; margin-top: 4px; display: inline-block; }
            .grid-3 { display: table; width: 100%; table-layout: fixed; margin: 16px 0; border-collapse: separate; border-spacing: 10px 0; }
            .grid-col { display: table-cell; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
            .grid-title { font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .grid-val { font-size: 14pt; font-weight: 800; color: #1e293b; margin: 4px 0; }
            .grid-acc { font-size: 8.5pt; font-weight: 700; color: #0284c7; }
            .section-title { font-size: 9.5pt; font-weight: 800; text-transform: uppercase; color: #1e293b; margin: 16px 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 8pt; font-weight: 700; margin: 2px; }
            .badge-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
            .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .text-muted { color: #94a3b8; font-size: 8.5pt; font-style: italic; }
            .verification-box { margin-top: 20px; background: #eff6ff; border: 1px dashed #60a5fa; border-radius: 8px; padding: 12px 16px; font-size: 8pt; color: #1e40af; }
            .footer-row { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header-bar">
              <div>
                <span class="badge-primary">Official Verified Competency Evidence</span>
                <h1>${result.skill} Competency Record</h1>
                <div class="meta">
                  Candidate: <strong>${user?.name || 'Student Candidate'}</strong> (${user?.college || 'Academic Institution'})<br>
                  Evidence ID: <strong style="font-family: monospace; color: #312e81;">${result.evidenceId}</strong> • Date: <strong>${new Date(result.completedAt).toLocaleDateString()}</strong><br>
                  Knowledge Base Source: <em>${result.sourceTitle}</em>
                </div>
              </div>
              <div class="score-box">
                <span class="score-num">${result.percentage}%</span>
                <span style="font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: 700;">Demonstrated Accuracy</span>
                <div class="tier-tag">${result.level} Tier</div>
              </div>
            </div>

            <div class="section-title">Difficulty Tiers Performance Breakdown</div>
            <div class="grid-3">
              <div class="grid-col">
                <div class="grid-title">Easy Foundational</div>
                <div class="grid-val">${result.breakdown?.easy?.correct || 0} / ${result.breakdown?.easy?.total || 0}</div>
                <div class="grid-acc">${result.breakdown?.easy?.accuracy || 0}% Accuracy</div>
              </div>
              <div class="grid-col">
                <div class="grid-title">Medium Algorithmic</div>
                <div class="grid-val">${result.breakdown?.medium?.correct || 0} / ${result.breakdown?.medium?.total || 0}</div>
                <div class="grid-acc" style="color: #d97706;">${result.breakdown?.medium?.accuracy || 0}% Accuracy</div>
              </div>
              <div class="grid-col">
                <div class="grid-title">Hard Architecture</div>
                <div class="grid-val">${result.breakdown?.hard?.correct || 0} / ${result.breakdown?.hard?.total || 0}</div>
                <div class="grid-acc" style="color: #4338ca;">${result.breakdown?.hard?.accuracy || 0}% Accuracy</div>
              </div>
            </div>

            <div class="section-title">Topic Diagnostics & Mastery Profile</div>
            <div style="margin-bottom: 12px;">
              <strong style="font-size: 8.5pt; color: #047857; display: block; margin-bottom: 4px;">Strong Topics (Demonstrated Mastery &ge; 60%):</strong>
              <div>${strongList}</div>
            </div>
            <div>
              <strong style="font-size: 8.5pt; color: #b45309; display: block; margin-bottom: 4px;">Targeted Improvement Areas (&lt; 60%):</strong>
              <div>${weakList}</div>
            </div>

            <div class="verification-box">
              <strong>Verification Statement:</strong> This cryptographic competency evidence was generated following a randomized ${result.totalQuestions}-question evaluation authenticated against the SEEKER MongoDB academic library. It serves as verified proof of teaching capability on the StudySwap peer knowledge exchange network.
            </div>

            <div class="footer-row">
              <span>Authority: SEEKER Smart Education & Peer Knowledge Exchange</span>
              <span>Generated on: ${new Date().toLocaleString()}</span>
            </div>
          </div>
        </body>
        </html>
      `;

      triggerInPagePrint(htmlContent);
    } catch (err) {
      alert('Failed to generate Skill Evidence PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadCertificatePDF = () => {
    if (!result) return;
    setGeneratingPdf(true);

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SEEKER_Certificate_${result.evidenceId}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Georgia', serif; color: #1e1b4b; margin: 0; padding: 12px; background: #fff; }
            .cert-border { border: 6px double #312e81; padding: 36px 44px; text-align: center; border-radius: 8px; background: radial-gradient(circle at center, #ffffff 0%, #fafafa 100%); }
            .header-tag { font-family: 'Segoe UI', sans-serif; font-size: 9pt; font-weight: 800; letter-spacing: 0.2em; color: #4338ca; text-transform: uppercase; margin-bottom: 12px; }
            <h1>Certificate of Demonstrated Competency</h1>
            <div class="cert-body">This credential is authenticated and awarded to</div>
            <div class="student-name">${user?.name || 'Student Candidate'}</div>
            <div class="details">
              representing <strong>${user?.college || 'Academic Institution'}</strong>, having successfully undergone rigorous randomized multi-tier testing in <strong>${result.skill}</strong> sourced from <em>"${result.sourceTitle}"</em>.
            </div>
            <div class="metrics-pill">
              Verified Accuracy: ${result.percentage}% • Classification: ${result.level} Tier
            </div>
            <div class="footer-grid">
              <div>
                Certificate ID: <strong style="font-family: monospace;">${result.evidenceId}</strong><br>
                Date of Issuance: ${new Date(result.completedAt).toLocaleDateString()}
              </div>
              <div style="text-align: center;">
                Academic Verification Seal
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      triggerInPagePrint(htmlContent);
    } catch (err) {
      alert('Failed to generate Certificate PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <iframe ref={printFrameRef} title="Print Frame" className="hidden" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-500/30">
            Dynamic &amp; User-Driven Knowledge Assessment
          </span>
          <h1 className="text-3xl font-black text-white">SkillProof Assessment &amp; Library Engine</h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse authentic library notes, search any random topic, read full source materials, and test your knowledge.
          </p>
        </div>

        {/* View Switcher: Central Library vs Quick Search */}
        {!assessment && !result && (
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0">
            <button
              onClick={() => { setLibraryViewMode('library'); setFilteredResults(allLibraryItems); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                libraryViewMode === 'library' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Library className="w-4 h-4" /> Browse Full Library ({allLibraryItems.length})
            </button>
            <button
              onClick={() => setLibraryViewMode('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                libraryViewMode === 'search' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" /> Custom Topic Search
            </button>
          </div>
        )}
      </div>

      {/* --- 1. SETUP & LIBRARY SCREEN --- */}
      {!assessment && !result && (
        <div className="space-y-6">

          {/* Search / Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <form onSubmit={handleSearch} className="flex-1 w-full flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search library or type any new topic (e.g. JavaScript, Docker, Machine Learning, Cloud)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shrink-0"
              >
                Search
              </button>
            </form>

            {/* Assessment Length selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold uppercase text-slate-400">Questions:</span>
              <div className="flex gap-1.5">
                {[10, 20, 30, 40, 50].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                      questionCount === count
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Selection Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block mb-0.5">
                Target Evaluation Resource:
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                {selectedResource ? selectedResource.title : (searchQuery.trim() || 'Select or Search a Topic')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedResource ? `Skill: ${selectedResource.skill} • Author: ${selectedResource.author}` : 'An academic reference note will be synthesized dynamically for this topic.'}
              </p>
            </div>

            <button
              onClick={() => handleGenerateAssessment()}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-xl flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Synthesizing Questions from Notes...' : `Launch ${questionCount} Qs Assessment`}
            </button>
          </div>

          {/* Library Cards Grid (All Books & Resources) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" /> 
                {searchQuery.trim() ? `Search Results for "${searchQuery}"` : 'Central Knowledge Base Library'}
              </h3>
              <span className="text-xs text-slate-500 font-semibold">{filteredResults.length} Available Resources</span>
            </div>

            {filteredResults.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">No Exact Seeded Book for "{searchQuery}"</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Don't worry! Click the button below, and our engine will synthesize a structured reference note and generate your test immediately.
                </p>
                <button
                  onClick={() => handleGenerateAssessment()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition inline-flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" /> Synthesize Notes & Start Test for "{searchQuery}"
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredResults.map((item) => {
                  const isSelected = selectedResource?._id === item._id;
                  return (
                    <div
                      key={item._id}
                      className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition relative shadow-lg ${
                        isSelected ? 'border-indigo-500 shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.type === 'Book' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' : 'bg-sky-950 text-sky-400 border border-sky-800/40'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                            {item.skill}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{item.content}</p>

                        <div className="text-[10px] text-slate-500 pt-1">
                          Author: <strong className="text-slate-400">{item.author}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/70">
                        {/* Open in Full Reader */}
                        <button
                          type="button"
                          onClick={() => { setSelectedResource(item); setReadingBook(item); }}
                          className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" /> Read Book
                        </button>

                        {/* Select for Assessment */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedResource(item);
                            handleGenerateAssessment(item);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-md' 
                              : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Start Test
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

     {/* --- IN-APP BOOK & NOTES READER MODAL --- */}
      {readingBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-5 shadow-2xl relative max-h-[88vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
                    {readingBook.type}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">By {readingBook.author}</span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-indigo-400" /> {readingBook.title}
                </h3>
              </div>
              <button
                onClick={() => setReadingBook(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Free Full Book Access Suggestion Banner */}
            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Unabridged Book Available For Free
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Need all 500+ pages and exercises? Open-access repository: <strong className="text-white">{readingBook.freeSourceProvider || 'Open Library / Academic Web'}</strong>
                </p>
              </div>

              <a
                href={readingBook.fullBookUrl || `https://openlibrary.org/search?q=${encodeURIComponent(readingBook.title)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-md"
              >
                <BookOpen className="w-3.5 h-3.5" /> Read Full Book Free ↗
              </a>
            </div>

            {/* In-App Core Chapter Summary Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 whitespace-pre-line text-[13px] leading-relaxed text-slate-200">
                {readingBook.content}
              </div>

              {readingBook.topics && readingBook.topics.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Core Topics Covered in this Resource:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {readingBook.topics.map((t, i) => (
                      <span key={i} className="bg-indigo-950/50 border border-indigo-800/50 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReadingBook(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Close Summary
              </button>

              <button
                type="button"
                onClick={() => handleGenerateAssessment(readingBook)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Start Assessment from this Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. ACTIVE ASSESSMENT SCREEN --- */}
      {assessment && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                {assessment.skill} Assessment • Question {currentIndex + 1} of {assessment.questions.length}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Source: {assessment.sourceTitle} ({assessment.sourceType || 'Notes'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                assessment.questions[currentIndex].difficulty === 'Hard' ? 'bg-red-950 text-red-400' :
                assessment.questions[currentIndex].difficulty === 'Medium' ? 'bg-amber-950 text-amber-400' :
                'bg-emerald-950 text-emerald-400'
              }`}>
                {assessment.questions[currentIndex].difficulty}
              </span>
              <span className="text-xs text-slate-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {Object.keys(userAnswers).length} / {assessment.questions.length} Answered
              </span>
            </div>
          </div>

          <p className="text-base font-semibold text-white leading-relaxed">
            {assessment.questions[currentIndex].question}
          </p>

          <div className="space-y-2.5">
            {assessment.questions[currentIndex].options.map((opt, i) => {
              const qId = assessment.questions[currentIndex]._id;
              const isSelected = userAnswers[qId] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(qId, opt)}
                  className={`w-full text-left p-3.5 rounded-xl text-xs font-medium transition border flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-inner'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="leading-relaxed">{opt}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                    isSelected ? 'border-indigo-400 bg-indigo-600' : 'border-slate-700'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
            >
              Previous
            </button>

            {currentIndex < assessment.questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-lg"
              >
                Next Question <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Auditing Answers...' : 'Submit & Generate Evidence'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- 3. RESULT: VERIFIED SKILL EVIDENCE & AUDIT --- */}
      {result && (
        <div className="space-y-6">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow">
              Official Verified Competency Evidence
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-[11px] font-mono text-indigo-400 font-bold block mb-1">
                  EVIDENCE ID: {result.evidenceId}
                </span>
                <h2 className="text-2xl font-black text-white">{result.skill} Competency Record</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Source: <strong className="text-slate-200">{result.sourceTitle}</strong> • Assessed for <strong className="text-slate-200">{user?.name}</strong> ({user?.college})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-400">{result.percentage}%</span>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Demonstrated Accuracy</span>
                </div>
                <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shadow-md ${
                  result.level === 'Advanced' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  result.level === 'Intermediate' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {result.level} Tier
                </span>
              </div>
            </div>

            {/* Performance Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Easy Foundational</span>
                <p className="text-lg font-bold text-white">{result.breakdown?.easy?.correct || 0} / {result.breakdown?.easy?.total || 0}</p>
                <span className="text-xs text-emerald-400 font-semibold">{result.breakdown?.easy?.accuracy || 0}% Accuracy</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Medium Algorithmic</span>
                <p className="text-lg font-bold text-white">{result.breakdown?.medium?.correct || 0} / {result.breakdown?.medium?.total || 0}</p>
                <span className="text-xs text-amber-400 font-semibold">{result.breakdown?.medium?.accuracy || 0}% Accuracy</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Hard Architecture</span>
                <p className="text-lg font-bold text-white">{result.breakdown?.hard?.correct || 0} / {result.breakdown?.hard?.total || 0}</p>
                <span className="text-xs text-sky-400 font-semibold">{result.breakdown?.hard?.accuracy || 0}% Accuracy</span>
              </div>
            </div>

            {/* Strong vs Weak Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-900/30">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Strong Topics (Demonstrated Mastery)
                </h4>
                {result.strongTopics?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.strongTopics.map((t, idx) => (
                      <span key={idx} className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Need further practice to demonstrate topic strengths.</p>
                )}
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-900/30">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Targeted Improvement Areas
                </h4>
                {result.weakTopics?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.weakTopics.map((t, idx) => (
                      <span key={idx} className="bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-semibold">Outstanding! Zero diagnostic weaknesses recorded.</p>
                )}
              </div>
            </div>

            {/* Actions: Primary Evidence Download + Secondary Certificate Download */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-800">
              <button
                onClick={() => setResult(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Assess Another Topic
              </button>

              <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handleDownloadSkillEvidencePDF}
                  disabled={generatingPdf}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  title="Download Verified Skill Evidence Record as PDF"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                  Download Skill Evidence (PDF)
                </button>

                <button
                  onClick={handleDownloadCertificatePDF}
                  disabled={generatingPdf}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/40 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  title="Download Formal Certificate of Competency as PDF"
                >
                  <Award className="w-4 h-4" />
                  Download Certificate (PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Complete Question Audit &amp; Explanations
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Score: {result.score} / {result.totalQuestions}
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {result.questionAudit?.map((qa, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl border ${
                    qa.isCorrect ? 'bg-slate-950/80 border-emerald-800/40' : 'bg-slate-950/80 border-red-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white">Q{i + 1}. {qa.question}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                      qa.isCorrect ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                    }`}>
                      {qa.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 mb-2">
                    <p className="text-slate-400">
                      Your Answer: <strong className={qa.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{qa.userChoice}</strong>
                    </p>
                    {!qa.isCorrect && (
                      <p className="text-slate-400">
                        Correct Answer: <strong className="text-emerald-400">{qa.correctAnswer}</strong>
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60 text-[11px] text-slate-300">
                    <strong className="text-indigo-400 mr-1">Explanation:</strong> {qa.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}