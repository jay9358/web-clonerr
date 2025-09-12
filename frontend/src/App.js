import React, { useState, useEffect } from 'react';
import './App.css';
import CustomEditor from './CustomEditor';
function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [clonedHtml, setClonedHtml] = useState('');
  const [error, setError] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [viewMode, setViewMode] = useState('iframe'); // 'iframe' or 'studio'

  // Check backend status on component mount (throttled, stop when connected)
  useEffect(() => {
    let inFlight = false;
    let interval = null;
    const checkBackendStatus = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch('https://web-clonerr-56fz.vercel.app/api/health', { cache: 'no-store' });
          if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK') {
            setBackendStatus('connected');
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          } else {
            setBackendStatus('disconnected');
          }
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        console.log('Backend health check failed:', error);
        setBackendStatus('disconnected');
      } finally {
        inFlight = false;
      }
    };

    // Initial check
    checkBackendStatus();
    // Throttled polling every 30s until connected
    interval = setInterval(checkBackendStatus, 30000);
    return () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setClonedHtml('');

    try {
      console.log('Making request to /api/crawl with URL:', url.trim());
      const response = await fetch('https://web-clonerr-56fz.vercel.app/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is HTML (backend not running)
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.log('Non-JSON response:', responseText.substring(0, 200));
        throw new Error('Backend server is not running. Please start the backend server first.');
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setClonedHtml(data.html);
        console.log('Cloned HTML:', data.html);
        setOriginalUrl(data.url);
      } else {
        setError(data.error || 'Failed to clone website');
      }
    } catch (err) {
      console.error('Request error:', err);
      if (err.message.includes('Backend server is not running')) {
        setError('Backend server is not running. Please start the backend server first.');
      } else if (err.message.includes('Unexpected token')) {
        setError('Backend server is not running. Please start the backend server first.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to backend server. Please make sure it\'s running on port 5000.');
      } else {
        setError('Network error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setClonedHtml('');
    setError('');
    setOriginalUrl('');
    setViewMode('iframe');
  };

  return (
    <div className="App">
      <header className="App-header">
        
       
        
        <form onSubmit={handleSubmit} className="url-form">
          <div className="input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="url-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="clone-button"
              disabled={loading || !url.trim()}
            >
              {loading ? '🔄 Cloning...' : '🚀 Clone'}
            </button>
            {clonedHtml && (
              <button 
                type="button" 
                onClick={handleClear}
                className="clear-button"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            <div className="spinner"></div>
            <p>Capturing website with Puppeteer...</p>
            <small>This may take a few seconds</small>
          </div>
        )}
      </header>

      {clonedHtml && (
        <main className="cloned-content">
        <div className="content-header">
          <h2>📄 Cloned Website</h2>
          <p className="original-url">
            Original: <a href={originalUrl} target="_blank" rel="noopener noreferrer">
              {originalUrl}
            </a>
          </p>
          
          <div className="view-mode-toggle">
            <button 
              className={`mode-button ${viewMode === 'iframe' ? 'active' : ''}`}
              onClick={() => setViewMode('iframe')}
            >
              🖼️ Iframe View
            </button>
            <button 
              className={`mode-button ${viewMode === 'studio' ? 'active' : ''}`}
              onClick={() => setViewMode('studio')}
            >
              🎨 Visual Editor
            </button>
          </div>
        </div>
          
          {viewMode === 'iframe' ? (
            <div className="iframe-container">
              <iframe
                srcDoc={clonedHtml}
                title="Cloned Website"
                className="cloned-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-top-navigation-by-user-activation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />

            </div>
          ) : (
            <div className="studio-container">
              <CustomEditor htmlContent={clonedHtml} originalUrl={originalUrl} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
