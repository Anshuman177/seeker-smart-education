import React, { useState } from 'react';
import API from './api';
import './MaterialUpload.css';

export default function MaterialUpload() {
  const [files, setFiles] = useState([]);
  const [bookName, setBookName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [topic, setTopic] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

    try {
      setLoading(true);
      const res = await API.post('/api/material/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(res.data.message || 'Files successfully uploaded!');
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

  return (
    <div className="material-upload-container" style={{ padding: '30px', color: '#fff', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Learn From Your Material</h2>
      <p style={{ color: '#aaa' }}>Apni study material (Book pages, PDFs, Notes) yahan upload karein.</p>

      {errorMessage && (
        <div style={{ background: '#ff4d4d', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ background: '#2ecc71', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
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

        {files.length > 0 && (
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              background: loading ? '#555' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Uploading to Server...' : 'Upload & Process Material 🚀'}
          </button>
        )}
      </form>
    </div>
  );
}