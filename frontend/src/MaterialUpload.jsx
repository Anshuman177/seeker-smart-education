import React, { useState } from 'react';
import API from './api';
import './MaterialUpload.css';

export default function MaterialUpload() {
  const [files, setFiles] = useState([]);
  const [bookName, setBookName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [topic, setTopic] = useState('');
  const [questionsCount, setQuestionsCount] = useState(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState('');
  const [questionMode, setQuestionMode] = useState('auto'); // 'auto', 'existing', 'custom'

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [analysisData, setAnalysisData] = useState(null);
  const [analyzingLoading, setAnalyzingLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  // File selection handler with validation
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setErrorMessage('');
    setSuccessMessage('');

    const validFiles = selectedFiles.filter((file) => {
      const isValidType =
        file.type === 'application/pdf' ||
        file.type.startsWith('image/') ||
        file.type.includes('document') ||
        file.type.includes('text');

      const isValidSize = file.size <= 10 * 1024 * 1024;

      if (!isValidType) {
        setErrorMessage('Kuch files unsupported type ki hain. Kripya PDF ya Images upload karein.');
        return false;
      }
      if (!isValidSize) {
        setErrorMessage('File size bahut badi hai. Har file 10MB se kam honi chahiye.');
        return false;
      }
      return true;
    });

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setAnalysisData(null);

    if (files.length === 0) {
      setErrorMessage('Kripya kam se kam ek study material file select karein.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('bookName', bookName);
    formData.append('authorName', authorName);
    formData.append('topic', topic);
    formData.append('questionsCount', questionMode === 'custom' ? 0 : questionsCount);
    formData.append('marksPerQuestion', marksPerQuestion);
    formData.append('questionMode', questionMode);

    try {
      setLoading(true);
      const res = await API.post('/material/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(res.data.message || 'Study material successfully uploaded and ready for learning! 🚀');
      const uploadedMaterialId = res.data.materialId;

      if (uploadedMaterialId) {
        fetchMaterialAnalysis(uploadedMaterialId);
      }

      setFiles([]);
      setBookName('');
      setAuthorName('');
      setTopic('');
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.response?.data?.error || 'Server error during file upload. Dobara koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialAnalysis = async (id) => {
    try {
      setAnalyzingLoading(true);
      const res = await API.get(`/material/analyze/${id}`);
      setAnalysisData(res.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setErrorMessage(err.response?.data?.error || 'Material upload ho gaya, lekin analysis load karne mein error aaya.');
    } finally {
      setAnalyzingLoading(false);
    }
  };

  // Handler to generate and start quiz based on uploaded material
  const handleStartQuiz = async () => {
    if (!analysisData || !analysisData.materialId) return;
    try {
      setQuizLoading(true);
      const res = await API.get(`/material/quiz/${analysisData.materialId}`);
      console.H('Generated Material Quiz:', res.data);
      alert(`Quiz generated successfully! Total questions: ${res.data.questions.length}. Redirecting to assessment...`);
    } catch (err) {
      console.error('Quiz generation error:', err);
      setErrorMessage('Material quiz generate karne mein error aaya.');
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className="material-upload-container" style={{ padding: '30px', color: '#fff', maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      <h2>Learn From Your Material</h2>
      <p style={{ color: '#aaa' }}>Apni study material (Book pages, PDFs, Notes) yahan upload karein.</p>

      {errorMessage && (
        <div style={{ background: '#ff4d4d', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px', marginTop: '10px' }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ background: '#2ecc71', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px', marginTop: '10px' }}>
          {successMessage}
        </div>
      )}

      {/* ANALYSIS DISPLAY SECTION — DYNAMIC & CONDITIONALLY RENDERED */}
      {analysisData && (
        <div style={{ background: '#1e1e2f', padding: '25px', borderRadius: '8px', border: '1px solid #4f46e5', marginTop: '20px', marginBottom: '30px' }}>
          <h3 style={{ color: '#818cf8', marginBottom: '15px' }}>📖 What is this material about?</h3>
          <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#ddd', marginBottom: '20px' }}>
            {analysisData.about}
          </p>

          <h4 style={{ color: '#38bdf8', marginBottom: '10px' }}>🔍 Important Concepts:</h4>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
            {analysisData.importantConcepts.map((concept, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{concept}</li>
            ))}
          </ul>

          <h4 style={{ color: '#38bdf8', marginBottom: '10px' }}>📌 Important Points:</h4>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
            {analysisData.importantPoints.map((point, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{point}</li>
            ))}
          </ul>

          {analysisData.diagramExplanation && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#38bdf8', marginBottom: '8px' }}>📊 Diagram Explanation:</h4>
              <p style={{ color: '#ccc', lineHeight: '1.4' }}>{analysisData.diagramExplanation}</p>
            </div>
          )}

          {analysisData.graphExplanation && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#38bdf8', marginBottom: '8px' }}>📈 Graph Explanation:</h4>
              <p style={{ color: '#ccc', lineHeight: '1.4' }}>{analysisData.graphExplanation}</p>
            </div>
          )}

          {analysisData.formulaExplanation && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#38bdf8', marginBottom: '8px' }}>🧮 Formula Explanation:</h4>
              <p style={{ color: '#ccc', lineHeight: '1.4' }}>{analysisData.formulaExplanation}</p>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '12px', background: '#252538', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#aaa' }}>
            <span>Question Mode: <strong style={{ color: '#38bdf8' }}>{analysisData.questionMode?.toUpperCase()}</strong></span>
            {analysisData.questionMode !== 'custom' && (
              <span>Target Questions: <strong>{analysisData.questionsCount} per section</strong></span>
            )}
          </div>

          {/* QUIZ GENERATION CTA BUTTON */}
          {analysisData.questionMode !== 'custom' && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={quizLoading}
                style={{
                  padding: '12px 24px',
                  background: quizLoading ? '#555' : '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: quizLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                  width: '100%'
                }}
              >
                {quizLoading ? 'Generating Material Quiz...' : `🎯 Take Material Assessment Quiz (${analysisData.questionsCount || 5} Questions)`}
              </button>
            </div>
          )}
        </div>
      )}

      {analyzingLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#818cf8', fontWeight: 'bold' }}>
          ⚡ Analyzing uploaded material, reading actual document content, and extracting concepts...
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ background: '#1e1e2f', padding: '20px', borderRadius: '8px', border: '1px dashed #444' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Study Material Upload (Multiple files/pages allowed):
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ marginBottom: '15px', display: 'block' }}
          />

          <div style={{ display: 'grid', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Book Name (Optional)"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff' }}
            />
            <input
              type="text"
              placeholder="Author Name (Optional)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff' }}
            />
            <input
              type="text"
              placeholder="Topic / Subject (Optional)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#ccc', fontWeight: 'bold' }}>
              Question Approach Selection:
            </label>
            <select
              value={questionMode}
              onChange={(e) => setQuestionMode(e.target.value)}
              style={{ width: '100%', padding: '9px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff', marginBottom: '12px' }}
            >
              <option value="auto">Auto-Decide (Smart material-based questions)</option>
              <option value="existing">Use Existing Questions from Material (if available)</option>
              <option value="custom">Custom (Hide/Disable Question Section)</option>
            </select>
          </div>

          {questionMode !== 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #333', paddingTop: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#ccc' }}>
                  Questions per section:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#ccc' }}>
                  Marks per question (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 Marks"
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#2a2a3d', border: '1px solid #444', color: '#fff' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div style={{ marginTop: '20px' }}>
          <h3>Uploaded Files Preview ({files.length} files)</h3>
          {files.length === 0 ? (
            <p style={{ color: '#777' }}>Abhi koi file select nahi ki gayi hai.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {files.map((file, index) => (
                <li key={index} style={{ background: '#252538', padding: '10px', marginBottom: '8px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{file.name}</span>
                    <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '10px' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || files.length === 0}
          style={{
            marginTop: '25px',
            width: '100%',
            padding: '14px',
            background: files.length === 0 ? '#333' : (loading ? '#555' : '#4f46e5'),
            color: files.length === 0 ? '#777' : '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: files.length === 0 || loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}
        >
          {loading ? 'Uploading & Analyzing...' : 'Upload & Process Material 🚀'}
        </button>
      </form>
    </div>
  );
}