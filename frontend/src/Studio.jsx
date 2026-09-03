import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { 
  FileText, 
  Presentation, 
  Download, 
  Plus, 
  Trash2, 
  Printer, 
  FileCheck,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles
} from 'lucide-react';

export default function Studio() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('doc'); // 'doc' | 'slides'

  // Document State
  const [docTitle, setDocTitle] = useState('SEEKER Study Notes & Summary');
  const [docContent, setDocContent] = useState(
    `# Subject: Computer Networks & Operating Systems\n\n## 1. Key Concept Summary\nExplain core principles discussed during the SEEKER Meet session.\n\n## 2. Code Snippets & Logic\nWrite sample algorithmic notes here.\n\n## 3. Action Items\n- Revise Process Scheduling algorithms\n- Complete SkillProof challenge for verified badge`
  );

  // Slides State
  const [presentationTitle, setPresentationTitle] = useState('Operating Systems Overview');
  const [slides, setSlides] = useState([
    {
      title: 'Operating Systems Overview',
      subtitle: 'Process Scheduling & Memory Architecture',
      points: [
        'Preemptive vs Non-Preemptive Scheduling',
        'Context Switching Overhead',
        'Virtual Memory & Paging'
      ]
    },
    {
      title: 'Context Switch Breakdown',
      subtitle: 'Hardware State Preservation',
      points: [
        'Save CPU registers and Program Counter (PC)',
        'Update Process Control Block (PCB)',
        'Switch memory address space mapping via MMU'
      ]
    }
  ]);

  // In-Browser Live Presentation Mode State
  const [presenting, setPresenting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Add new slide
  const handleAddSlide = () => {
    setSlides([
      ...slides,
      {
        title: `Slide ${slides.length + 1}: Key Topic`,
        subtitle: 'Sub-topic or explanation',
        points: ['Key takeaway point 1', 'Key takeaway point 2']
      }
    ]);
  };

  const handleRemoveSlide = (idx) => {
    if (slides.length <= 1) return;
    setSlides(slides.filter((_, i) => i !== idx));
  };

  const handleSlideChange = (idx, field, val) => {
    const updated = [...slides];
    updated[idx][field] = val;
    setSlides(updated);
  };

  const handlePointsChange = (idx, text) => {
    const updated = [...slides];
    updated[idx].points = text.split('\n').filter(p => p.trim() !== '');
    setSlides(updated);
  };

  // Helper: Convert basic markdown symbols to clean formatted HTML for export
  const formatContentToHTML = (text) => {
    return text
      .split('\n')
      .map((line) => {
        if (line.startsWith('# ')) return `<h1>${line.replace('# ', '')}</h1>`;
        if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
        if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
        if (line.startsWith('- ')) return `<li>${line.replace('- ', '')}</li>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('');
  };

  // 1. Export as Word Document (.doc)
  const exportWordDoc = () => {
    const formattedBody = formatContentToHTML(docContent);
    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${docTitle}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 30px; }
        h1 { color: #312e81; font-size: 18pt; border-bottom: 2px solid #4338ca; padding-bottom: 6px; margin-bottom: 12px; }
        h2 { color: #4338ca; font-size: 14pt; margin-top: 20px; margin-bottom: 6px; }
        h3 { color: #4f46e5; font-size: 12pt; margin-top: 14px; }
        p { font-size: 11pt; margin: 4px 0; }
        li { font-size: 11pt; margin-left: 20px; }
        .meta { color: #64748b; font-size: 9pt; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
      </style>
      </head><body>
      <h1>${docTitle}</h1>
      <div class='meta'>Generated on SEEKER Platform • Author: ${user?.name || 'User'} (${user?.college || 'Engineering Institute'})</div>
      ${formattedBody}
      </body></html>
    `;
    const blob = new Blob(['\ufeff' + htmlHeader], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Export / Print as PDF
  const exportPDF = () => {
    const formattedBody = formatContentToHTML(docContent);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            h1 { color: #1e1b4b; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin-bottom: 6px; font-size: 22pt; }
            h2 { color: #4338ca; margin-top: 20px; margin-bottom: 6px; font-size: 15pt; }
            h3 { color: #4f46e5; margin-top: 14px; font-size: 13pt; }
            p { font-size: 11pt; margin: 4px 0; }
            li { font-size: 11pt; margin-left: 24px; }
            .meta { color: #64748b; font-size: 10pt; margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>${docTitle}</h1>
          <div class="meta">SEEKER Academic Studio • Author: ${user?.name || 'User'} • ${new Date().toLocaleDateString()}</div>
          ${formattedBody}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // 3. Export Presentation Slides as Standalone HTML / Slide Deck
  const exportPresentationHTML = () => {
    const slidesHTML = slides.map((s, idx) => `
      <div class="slide">
        <div class="slide-num">SLIDE ${idx + 1} OF ${slides.length}</div>
        <h2>${s.title}</h2>
        <h3>${s.subtitle}</h3>
        <ul>
          ${s.points.map(p => `<li>${p}</li>`).join('')}
        </ul>
        <div class="slide-footer">SEEKER Peer Knowledge Exchange • ${user?.name || 'User'}</div>
      </div>
    `).join('');

    const presentationPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${presentationTitle} - Slide Deck</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #ffffff; }
          .deck { display: flex; flex-direction: column; align-items: center; gap: 30px; padding: 40px 20px; }
          .slide { width: 800px; height: 450px; background: #1e293b; border: 2px solid #334155; border-radius: 16px; padding: 40px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .slide-num { font-size: 10px; font-weight: bold; color: #818cf8; letter-spacing: 0.1em; }
          h2 { color: #ffffff; margin: 10px 0 4px 0; font-size: 24px; }
          h3 { color: #94a3b8; font-size: 14px; margin: 0 0 20px 0; font-weight: normal; }
          ul { font-size: 16px; line-height: 1.8; color: #cbd5e1; padding-left: 20px; }
          .slide-footer { font-size: 11px; color: #64748b; border-top: 1px solid #334155; padding-top: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="deck">
          ${slidesHTML}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([presentationPage], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presentationTitle.replace(/\s+/g, '_')}_Presentation.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-500/30">
            In-Browser Document &amp; Presentation Studio
          </span>
          <h1 className="text-3xl font-black text-white">SEEKER Studio</h1>
          <p className="text-slate-400 text-sm mt-1">
            Author study guides, generate Word documents, print clean PDFs, and build presentations directly in your browser.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('doc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'doc' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Word &amp; PDF Writer
          </button>
          <button
            onClick={() => setActiveTab('slides')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'slides' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Presentation className="w-4 h-4" /> Slide Deck Builder
          </button>
        </div>
      </div>

      {/* --- TAB 1: Document & PDF Writer --- */}
      {activeTab === 'doc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Editor Side */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Document Body / Notes
              </label>
              <textarea
                rows={16}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Export Actions & Info */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" /> Export Options
              </h3>
              
              <button
                onClick={exportPDF}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>

              <button
                onClick={exportWordDoc}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <FileCheck className="w-4 h-4 text-sky-400" /> Export as Word Document (.doc)
              </button>

              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                Word (.doc) exports format automatically for Microsoft Office, LibreOffice, and Google Docs.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Formatting Ready:
              </span>
              <p>Type markdown headers (<code className="text-indigo-300">#</code>, <code className="text-indigo-300">##</code>) or list items (<code className="text-indigo-300">-</code>). They automatically transform into structured headers and bulleted lists on export.</p>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: Slide Deck Builder --- */}
      {activeTab === 'slides' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Presentation Title
              </label>
              <input
                type="text"
                value={presentationTitle}
                onChange={(e) => setPresentationTitle(e.target.value)}
                className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCurrentSlideIndex(0); setPresenting(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" /> Present Slide Deck
              </button>

              <button
                onClick={handleAddSlide}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Slide
              </button>

              <button
                onClick={exportPresentationHTML}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-4 h-4" /> Download Deck (.html)
              </button>
            </div>
          </div>

          {/* Slides Grid Editor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {slides.map((slide, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Slide {idx + 1} of {slides.length}</span>
                    {slides.length > 1 && (
                      <button
                        onClick={() => handleRemoveSlide(idx)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Slide Headline</label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => handleSlideChange(idx, 'title', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtitle / Context</label>
                    <input
                      type="text"
                      value={slide.subtitle}
                      onChange={(e) => handleSlideChange(idx, 'subtitle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bullet Points (1 per line)</label>
                    <textarea
                      rows={4}
                      value={slide.points.join('\n')}
                      onChange={(e) => handlePointsChange(idx, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 flex justify-between">
                  <span>Presenter: {user?.name || 'User'}</span>
                  <span>SEEKER Slide Deck</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- IN-BROWSER PRESENTATION MODAL --- */}
      {presenting && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 md:p-12 animate-in fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white">{presentationTitle}</h4>
              <p className="text-[11px] text-indigo-400 font-mono">
                SLIDE {currentSlideIndex + 1} OF {slides.length}
              </p>
            </div>
            <button
              onClick={() => setPresenting(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl transition flex items-center gap-1 text-xs"
            >
              <X className="w-4 h-4" /> Exit Fullscreen
            </button>
          </div>

          {/* Slide Stage */}
          <div className="max-w-4xl w-full mx-auto bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 md:p-14 shadow-2xl space-y-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                {slides[currentSlideIndex]?.title}
              </h2>
              <h3 className="text-lg text-indigo-300 font-medium">
                {slides[currentSlideIndex]?.subtitle}
              </h3>
            </div>

            <ul className="space-y-4 pt-4 border-t border-slate-800">
              {slides[currentSlideIndex]?.points.map((pt, i) => (
                <li key={i} className="text-base md:text-lg text-slate-200 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Navigator */}
          <div className="flex items-center justify-between max-w-4xl w-full mx-auto pt-4">
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Slide
            </button>

            <span className="text-xs text-slate-500 font-mono">
              Presenter: {user?.name || 'User'}
            </span>

            <button
              onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg"
            >
              Next Slide <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}