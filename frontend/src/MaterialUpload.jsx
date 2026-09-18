import React, { useState } from 'react';
import './MaterialUpload.css';

export default function MaterialUpload() {
  const [files, setFiles] = useState([]);
  const [bookName, setBookName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [topic, setTopic] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // File selection handler with validation
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setErrorMessage('');

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

  return (
    <div className="material-upload-container" style={{ padding: '30px', color: '#fff', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Learn From Your Material</h2>
      <p style={{ color: '#aaa' }}>Apni study material (Book pages, PDFs, Notes) yahan upload karein.</p>

      {errorMessage && (
        <div style={{ background: '#ff4d4d', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {errorMessage}
        </div>
      )}

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
    </div>
  );
}