import React, { useState, useEffect, useMemo } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import * as csso from 'csso';

// --------------------------
// Safe CSS parser with fallback
// --------------------------
function safeMinifyCSS(css) {
  if (!css || typeof css !== 'string') return '';
  try {
    const { css: minified } = csso.minify(css, { restructure: false });
    return minified;
  } catch (err) {
    console.warn('⚠️ CSS parse error, using fallback:', err.message);

    // Try to auto-fix unclosed blocks
    let fixed = css;
    const openCount = (css.match(/{/g) || []).length;
    const closeCount = (css.match(/}/g) || []).length;
    if (openCount > closeCount) {
      fixed += '}'.repeat(openCount - closeCount);
    }

    try {
      const { css: minified } = csso.minify(fixed, { restructure: false });
      return minified;
    } catch {
      return css; // last fallback
    }
  }
}

// --------------------------
// Rewrite relative url(...) in CSS to absolute
// --------------------------
function absolutizeCssUrls(css, baseUrl) {
  if (!css || !baseUrl) return css || '';
  // Matches url('...'), url("..."), url(...), ignoring data: and absolute protocols
  const urlRegex = /url\(\s*(["'])?([^)"']+)(["'])?\s*\)/gi;
  return css.replace(urlRegex, (match, open, url, close) => {
    const trimmed = url.trim();
    if (/^(data:|https?:|\/\/)/i.test(trimmed)) return match;
    try {
      const abs = new URL(trimmed, baseUrl).toString();
      return `url(${abs})`;
    } catch {
      return match;
    }
  });
}

// --------------------------
// Studio Viewer Component
// --------------------------
const StudioViewer = ({ htmlContent, originalUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --------------------------
  // HTML Parser + Cleanup (no iframe)
  // --------------------------
  const parseHtml = (rawHtml) => {
    if (!rawHtml || typeof rawHtml !== 'string') {
      setError('No valid HTML content provided');
      return { bodyContent: '', inlineStyles: '', externalStyles: [], externalScripts: [] };
    }

    try {
      const parser = new DOMParser();
      const dom = parser.parseFromString(rawHtml, 'text/html');

      // Remove inline <script> tags to avoid execution order issues before jQuery
      Array.from(dom.querySelectorAll('script:not([src])')).forEach((el) => el.remove());

      // Body content fallback
      const bodyContent = dom.body?.innerHTML?.trim() || '<h1>No content found</h1>';

      // Inline <style> blocks
      const inlineStyles = Array.from(dom.querySelectorAll('style'))
        .map((style) => safeMinifyCSS(style.textContent || ''))
        .filter(Boolean)
        .join('\n');

      // External CSS links (resolve relative using originalUrl if present)
      const externalStyles = Array.from(dom.querySelectorAll('link[rel="stylesheet"]'))
        .map((link) => link.getAttribute('href'))
        .filter(Boolean)
        .map((href) => {
          try {
            return originalUrl ? new URL(href, originalUrl).toString() : href;
          } catch {
            return href;
          }
        });

      // External scripts, skip inline and duplicates
      const seen = new Set();
      const externalScripts = Array.from(dom.querySelectorAll('script[src]'))
        .map((script) => script.getAttribute('src'))
        .filter((src) => src && !seen.has(src) && seen.add(src))
        .map((src) => {
          try {
            return originalUrl ? new URL(src, originalUrl).toString() : src;
          } catch {
            return src;
          }
        });

      return { bodyContent, inlineStyles, externalStyles, externalScripts };
    } catch (err) {
      console.error('❌ Failed to parse HTML:', err);
      setError('Failed to parse provided HTML');
      return { bodyContent: rawHtml, inlineStyles: '', externalStyles: [], externalScripts: [] };
    }
  };

  let { bodyContent, inlineStyles, externalStyles, externalScripts } = htmlContent
    ? parseHtml(htmlContent)
    : { bodyContent: '', inlineStyles: '', externalStyles: [], externalScripts: [] };

  // Absolutize inline CSS url(...) to the original page URL context
  inlineStyles = useMemo(() => absolutizeCssUrls(inlineStyles, originalUrl), [inlineStyles, originalUrl]);

  // Prepare a Blob URL for inline CSS so it's placed in <head> inside canvas
  const inlineCssUrl = useMemo(() => {
    if (!inlineStyles) return null;
    try {
      const blob = new Blob([inlineStyles], { type: 'text/css' });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [inlineStyles]);

  // Ensure jQuery is present before any inline scripts of the cloned HTML
  const hasJquery = useMemo(() => (externalScripts || []).some((src) => /jquery/i.test(src)), [externalScripts]);
  const jqueryCdn = 'https://code.jquery.com/jquery-3.6.0.min.js';

  // Compose initial component HTML without any iframe wrapper
  const initialComponent = useMemo(() => (
    `${!hasJquery ? `<script src="${jqueryCdn}"></script>` : ''}${bodyContent || '<h1>Empty Page</h1>'}`
  ), [hasJquery, bodyContent]);

  // --------------------------
  // GrapesJS Studio Options
  // --------------------------
  const studioOptions = useMemo(() => ({
    project: {
      type: 'web',
      default: {
        pages: [
          {
            name: 'Cloned Website (Direct HTML)',
            component: initialComponent,
          },
        ],
      },
      // Try to ensure no persistent storage is used by Studio project system
      storage: { type: 'none' },
    },
    storageManager: false,
    assetManager: { upload: false, add: false },
    cssComposer: { clearOnRender: true },
    panels: {
      defaults: [
        { id: 'layers', visible: true },
        { id: 'style-manager', visible: true },
        { id: 'trait-manager', visible: true },
        { id: 'block-manager', visible: true },
      ],
    },
    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '768px', widthMedia: '992px' },
        { name: 'Mobile', width: '320px', widthMedia: '768px' },
      ],
    },
    canvas: {
      styles: (inlineCssUrl ? [inlineCssUrl] : []).concat(externalStyles || []),
      scripts: (!hasJquery ? [jqueryCdn] : []).concat(externalScripts || []),
    },
  }), [initialComponent, externalStyles, externalScripts, hasJquery, inlineCssUrl]);

  // --------------------------
  // Loader (simulate async init)
  // --------------------------
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [htmlContent]);

  if (isLoading) {
    return (
      <div className="studio-loading">
        <div className="spinner"></div>
        <p>Loading visual editor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="studio-error">
        <p>❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="studio-container">
      <div className="studio-header">
        <h3>🎨 Visual Editor (Direct HTML)</h3>
        <p>
          View and edit the cloned website:{' '}
          {originalUrl ? (
            <a href={originalUrl} target="_blank" rel="noopener noreferrer">
              {originalUrl}
            </a>
          ) : (
            <span>(no source URL)</span>
          )}
        </p>
        <div className="content-info">
          <span className="info-badge">📄 {bodyContent?.length || 0} chars</span>
          <span className="info-badge">🎨 {inlineStyles?.length || 0} chars CSS</span>
          <span className="info-badge">🔗 {externalStyles?.length} CSS links</span>
          <span className="info-badge">📜 {externalScripts?.length} JS files</span>
        </div>
      </div>
      <div className="studio-editor">
        <StudioEditor options={studioOptions} />
      </div>
    </div>
  );
};

export default StudioViewer;
