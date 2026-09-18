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
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Naya state analysis view ke liye
  const [analysisData, setAnalysisData] = useState(null);
  const [analyzingLoading, setAnalyzingLoading] = useState(false);

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

      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit per file

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

  // Remove individual file option
  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  // Submit / Upload handler to backend
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
    formData.append('questionsCount', questionsCount);
    formData.append('marksPerQuestion', marksPerQuestion);

    try {
      setLoading(true);
      const res = await API.post('/material/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(res.data.message || 'Study material successfully uploaded and ready for learning! 🚀');
      const uploadedMaterialId = res.data.materialId;

      // Jaise hi upload ho, turant material analyze karne ki API call lagayein
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

  // Material Analyze karne ki function
  const fetchMaterialAnalysis = async (id) => {
    try {
      setAnalyzingLoading(true);
      const res = await API.get(`/material/analyze/${id}`);
      setAnalysisData(res.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setErrorMessage('Material upload ho gaya, lekin analysis load karne mein error aaya.');
    } finally {
      setAnalyzingLoading(false);
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

      {/* AGAR ANALYSIS DATA MIL GAYA HAI TOH "WHAT IS THIS MATERIAL ABOUT?" SECTION DIKHAYEIN */}
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
          <ul style={{ paddingLeft: '20px', color: '#ccc' }}>
            {analysisData.importantPoints.map((point, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{point}</li>
            ))}
          </ul>

          <div style={{ marginTop: '20px', padding: '12px', background: '#252538', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#aaa' }}>
            <span>Target Questions: <strong>{analysisData.questionsCount} per section</strong></span>
            <span>Assigned Marks: <strong>{analysisData.marksPerQuestion || 'Auto-decided'}</strong></span>
          </div>
        </div>
      )}

      {analyzingLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#818cf8', fontWeight: 'bold' }}>
          ⚡ Analyzing uploaded material and extracting concepts...
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