import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CustomEditor.css';

// Utilities
function generateElementId(index) {
  return `element-${index + 1}`;
}

function collectEditableElements(root) {
  const elements = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const tag = node.tagName?.toLowerCase();
      if (!tag) return NodeFilter.FILTER_REJECT;
      // Include common tags; skip head/meta/style/script/link etc.
      if (['script', 'style', 'link', 'meta', 'head', 'title', 'base'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let current = walker.currentNode;
  while (current) {
    elements.push(current);
    current = walker.nextNode();
  }
  return elements;
}

function outerHtmlOf(node) {
  if (!(node instanceof Element)) return '';
  return node.outerHTML;
}

export default function CustomEditor({ htmlContent, originalUrl }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [hoverElement, setHoverElement] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [regions, setRegions] = useState([]); // eslint-disable-line no-unused-vars
  const [domTree, setDomTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [zoom, setZoom] = useState(0.8); // default zoomed-out canvas for editing context
  const [locked, setLocked] = useState(new Set());

  // Load content into an iframe to mirror CSS/JS behavior of real page
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Build iframe HTML with <base> and jQuery first to ensure typical compatibility
    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlContent || '<!doctype html><html><head></head><body></body></html>', 'text/html');
    // Ensure <base>
    const baseHref = originalUrl || '/';
    const hasBase = !!dom.querySelector('head base');
    if (!hasBase) {
      const base = dom.createElement('base');
      base.setAttribute('href', baseHref);
      dom.head.prepend(base);
    } else if (originalUrl) {
      const base = dom.querySelector('head base');
      base.setAttribute('href', baseHref);
    }

    // Absolutize link/script URLs
    Array.from(dom.querySelectorAll('link[rel="stylesheet"]')).forEach((l) => {
      const href = l.getAttribute('href');
      if (!href) return;
      try { l.setAttribute('href', new URL(href, baseHref).toString()); } catch {}
    });
    Array.from(dom.querySelectorAll('script[src]')).forEach((s) => {
      const src = s.getAttribute('src');
      if (!src) return;
      try { s.setAttribute('src', new URL(src, baseHref).toString()); } catch {}
    });

    // Prepend jQuery if not present
    const hasJq = Array.from(dom.querySelectorAll('script[src]')).some((s) => /jquery/i.test(s.getAttribute('src') || ''));
    if (!hasJq) {
      const jq = dom.createElement('script');
      jq.setAttribute('src', 'https://code.jquery.com/jquery-3.6.0.min.js');
      dom.head.prepend(jq);
    }

    const iframeHtml = '<!doctype html>' + dom.documentElement.outerHTML;
    iframe.srcdoc = iframeHtml;

    function setupIframe() {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Create overlay inside iframe for hover/selection
      let overlay = doc.getElementById('ce-overlay');
      if (!overlay) {
        overlay = doc.createElement('div');
        overlay.id = 'ce-overlay';
        overlay.style.position = 'absolute';
        overlay.style.pointerEvents = 'none';
        overlay.style.border = '2px dashed #3b82f6';
        overlay.style.borderRadius = '4px';
        overlay.style.display = 'none';
        overlay.style.zIndex = '2147483647';
        doc.body.appendChild(overlay);
      }

      // Build registry from iframe body (grouped by nearest section/div region)
      const root = doc.body;
      const REGION_TAGS = new Set(['section', 'div', 'header', 'footer', 'article', 'aside', 'nav']);
      const nodes = collectEditableElements(root);
      const regionMap = new Map(); // Element -> regionId
      const regionMeta = new Map(); // regionId -> { id, label, el }
      let regionCounter = 0;

      function getRegionFor(node) {
        let cur = node.parentElement;
        while (cur && cur !== root) {
          if (cur.tagName && REGION_TAGS.has(cur.tagName.toLowerCase())) return cur;
          cur = cur.parentElement;
        }
        return root;
      }

      function getRegionId(regionEl) {
        if (regionMap.has(regionEl)) return regionMap.get(regionEl);
        const id = regionEl === root ? 'region-root' : `region-${++regionCounter}`;
        regionMap.set(regionEl, id);
        const labelBase = regionEl === root ? 'Document Body' : regionEl.tagName.toLowerCase();
        const idPart = regionEl.id ? `#${regionEl.id}` : '';
        const cls = regionEl.classList && regionEl.classList.length ? `.${Array.from(regionEl.classList).join('.')}` : '';
        const label = `${labelBase}${idPart}${cls}`;
        regionMeta.set(id, { id, label, el: regionEl });
        return id;
      }

      const next = nodes.map((el, idx) => {
        const regionEl = getRegionFor(el);
        const rid = getRegionId(regionEl);
        return {
          id: generateElementId(idx),
          node: el,
          rank: idx + 1,
          locked: false,
          content: outerHtmlOf(el),
          regionId: rid,
        };
      });

      setRegistry(next);
      setRegions(Array.from(regionMeta.values()));

      // Build Webflow-like DOM tree: top-level sections (or divs if no sections). When expanded, show catalogue of ALL descendants
      // Note: tree is based on real descendants, not filtered tags
      function shorten(token, len = 18) {
        if (!token) return '';
        return token.length > len ? token.slice(0, len) + '…' : token;
      }
      function makeLabel(el) {
        const tag = el.tagName.toLowerCase();
        const idPart = el.id ? `#${shorten(el.id, 20)}` : '';
        const cls = el.classList && el.classList.length
          ? `.${Array.from(el.classList).slice(0, 3).map((c) => shorten(c, 16)).join('.')}`
          : '';
        return `${tag}${idPart}${cls}`;
      }
      function buildFullChildren(el) {
        const out = [];
        for (const ch of Array.from(el.children)) {
          if (!(ch instanceof doc.defaultView.Element)) continue;
          out.push({ node: ch, label: makeLabel(ch), children: buildFullChildren(ch) });
        }
        return out;
      }
      // Prefer top-level sections; if none, use top-level divs
      const topCandidates = Array.from(root.children).filter((el) => el instanceof doc.defaultView.Element);
      const topSections = topCandidates.filter((el) => el.tagName.toLowerCase() === 'section');
      const topDivs = topCandidates.filter((el) => el.tagName.toLowerCase() === 'div');
      const topLevel = topSections.length ? topSections : topDivs;
      const tree = topLevel.map((el) => ({ node: el, label: makeLabel(el), children: buildFullChildren(el) }));
      setDomTree(tree);
      // Expand all by default
      const all = new Set();
      (function collect(nodes){ nodes.forEach(n=>{ all.add(n.node); if (n.children && n.children.length) collect(n.children); }); })(tree);
      setExpanded(all);

      // Event listeners inside iframe (optimized)
      let raf = null;
      let lastHover = null;
      const onPointerMove = (e) => {
        const ptX = e.clientX;
        const ptY = e.clientY;
        const target = doc.elementFromPoint(ptX, ptY);
        if (!(target instanceof doc.defaultView.Element)) return;
        if (!root.contains(target)) return;
        if (target === lastHover) return;
        lastHover = target;
        if (raf) return;
        raf = doc.defaultView.requestAnimationFrame(() => {
          raf = null;
          setHoverElement(lastHover);
        });
      };
      const onMouseLeave = () => setHoverElement(null);
      const onClick = (e) => {
        const target = e.target instanceof doc.defaultView.Element ? e.target : null;
        if (!target || !root.contains(target)) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedElement(target);
      };
      doc.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
      doc.addEventListener('mouseleave', onMouseLeave, true);
      doc.addEventListener('click', onClick, true);

      // After initial render, block further network activity to keep visual only
      const BLOCK_DELAY_MS = 1500;
      const injectBlockers = () => {
        try {
          const blocker = doc.createElement('script');
          blocker.type = 'text/javascript';
          blocker.text = `
            try {
              (function(){
                const w = window;
                // Block fetch
                if (w.fetch) w.fetch = function(){ return Promise.reject(new Error('Blocked by visual-only mode')); };
                // Block XHR
                if (w.XMLHttpRequest) {
                  const XHRp = w.XMLHttpRequest.prototype;
                  try { XHRp.open = function(){ return; }; } catch(e){}
                  try { XHRp.send = function(){ return; }; } catch(e){}
                  try { XHRp.setRequestHeader = function(){ return; }; } catch(e){}
                }
                // Block navigator.sendBeacon
                if (w.navigator && w.navigator.sendBeacon) {
                  try { w.navigator.sendBeacon = function(){ return false; }; } catch(e){}
                }
                // Block WebSocket & EventSource
                try { w.WebSocket = function(){ throw new Error('Blocked by visual-only mode'); }; } catch(e){}
                try { w.EventSource = function(){ throw new Error('Blocked by visual-only mode'); }; } catch(e){}
                // Stop timers
                try { w.setInterval = function(){ return 0; }; w.setTimeout = function(){ return 0; }; } catch(e){}
                // Prevent further image/font/link loads
                try {
                  const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
                  if (imgDesc && imgDesc.set) Object.defineProperty(HTMLImageElement.prototype, 'src', { set: function(_){} });
                } catch(e){}
                try {
                  const linkDesc = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
                  if (linkDesc && linkDesc.set) Object.defineProperty(HTMLLinkElement.prototype, 'href', { set: function(_){} });
                } catch(e){}
                try {
                  const scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                  if (scriptDesc && scriptDesc.set) Object.defineProperty(HTMLScriptElement.prototype, 'src', { set: function(_){} });
                } catch(e){}
              })();
            } catch(err) {}
          `;
          doc.documentElement.appendChild(blocker);
        } catch {}
      };

      const t = window.setTimeout(injectBlockers, BLOCK_DELAY_MS);

      return () => {
        doc.removeEventListener('pointermove', onPointerMove, true);
        doc.removeEventListener('mouseleave', onMouseLeave, true);
        doc.removeEventListener('click', onClick, true);
        try { window.clearTimeout(t); } catch(e){}
      };
    }

    const onLoad = () => {
      cleanupListeners = setupIframe();
      // Suppress noisy errors from page scripts inside iframe (visual only)
      try {
        const doc = iframe.contentDocument;
        const errBlock = doc.createElement('script');
        errBlock.text = `
          (function(){
            const w = window;
            const noop = function(){};
            w.addEventListener('error', function(e){ e.preventDefault && e.preventDefault(); return false; }, true);
            w.addEventListener('unhandledrejection', function(e){ e.preventDefault && e.preventDefault(); return false; }, true);
            // Guard querySelector with empty selector
            const _qS = Document.prototype.querySelector;
            Document.prototype.querySelector = function(sel){ if(!sel){ return null; } return _qS.call(this, sel); };
            const _qSA = Document.prototype.querySelectorAll;
            Document.prototype.querySelectorAll = function(sel){ if(!sel){ return []; } return _qSA.call(this, sel); };
          })();
        `;
        doc.documentElement.appendChild(errBlock);
      } catch {}
    };

    let cleanupListeners = null;
    iframe.addEventListener('load', onLoad);
    // If already loaded (fast path)
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      cleanupListeners = setupIframe();
    }

    return () => {
      iframe.removeEventListener('load', onLoad);
      if (cleanupListeners) cleanupListeners();
      // Reset selection state when reloading
      setHoverElement(null);
      setSelectedElement(null);
      setRegistry([]);
    };
  }, [htmlContent, originalUrl]);

  // Keep content in registry up to date when ranks/locks change
  useEffect(() => {
    setRegistry((prev) => prev.map((item) => ({ ...item, content: outerHtmlOf(item.node) })));
  }, [selectedElement]);

  // Hover/selection overlay positioning inside iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const overlay = doc.getElementById('ce-overlay');
    const target = hoverElement || selectedElement;
    if (!overlay) return;
    if (!target) {
      overlay.style.display = 'none';
      return;
    }
    const rect = target.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = `${rect.left + doc.defaultView.scrollX}px`;
    overlay.style.top = `${rect.top + doc.defaultView.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.setAttribute('data-mode', hoverElement ? 'hover' : 'selected');
  }, [hoverElement, selectedElement]);

  // Remove legacy host document listeners (handled inside iframe)

  // Selected item metadata removed (not used in current UI)

  // eslint-disable-next-line no-unused-vars
  const leftListTags = useMemo(() => new Set(['div', 'section']), []);
  // eslint-disable-next-line no-unused-vars
  const groupedByRegion = useMemo(() => new Map(), []);

  // Visible regions derived from groupedByRegion (not used directly in current UI)

  function toggleExpand(nodeRef) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeRef)) next.delete(nodeRef); else next.add(nodeRef);
      return next;
    });
  }

  function toggleLockNode(nodeRef) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(nodeRef)) next.delete(nodeRef); else next.add(nodeRef);
      return next;
    });
  }

  function renderTree(nodes, level = 0) {
    return (
      <div className="ce-tree" style={{ paddingLeft: level ? 10 : 0 }}>
        {nodes.map((n, idx) => {
          const isExpanded = expanded.has(n.node);
          const isActive = selectedElement === n.node;
          const hasChildren = n.children && n.children.length > 0;
          const isLocked = locked.has(n.node);
          return (
            <div key={`${n.label}-${idx}`} className={`ce-tree-item ${isActive ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}>
              <button className={`ce-caret ${hasChildren ? '' : 'is-empty'}`} onClick={() => hasChildren && toggleExpand(n.node)}>{hasChildren ? (isExpanded ? '▾' : '▸') : ''}</button>
              <button className="ce-tree-label" title={n.label} onClick={() => setSelectedElement(n.node)}>
                <span className="ce-tree-label-text">{n.label}</span>
                {hasChildren ? <span className="ce-badge">{n.children.length}</span> : null}
              </button>
              <button className={`ce-lock ${isLocked ? 'on' : ''}`} title={isLocked ? 'Unblock' : 'Block'} onClick={() => toggleLockNode(n.node)}>{isLocked ? '🔒' : '🔓'}</button>
              {hasChildren && isExpanded ? (
                <div className="ce-tree-children">
                  {renderTree(n.children, level + 1)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Editor actions for rank/lock removed in current UI

  function exportJson() {
    const data = registry.map(({ id, content, rank, locked }) => ({ id, content, rank, locked }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'elements.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ce-root">
      <div className="ce-header">
        <div className="ce-toolbar">
          <div className="ce-toolbar-left">
            <div className="ce-segment">
              <button className="ce-icon-btn" title="Pages">📄</button>
              <button className="ce-icon-btn" title="Assets">🗂️</button>
              <button className="ce-icon-btn" title="Components">🧩</button>
            </div>
            <div className="ce-segment">
              <button className="ce-icon-btn" title="Undo">↶</button>
              <button className="ce-icon-btn" title="Redo">↷</button>
            </div>
          </div>
          <div className="ce-toolbar-center">
            <div className="ce-device">
              <button className="ce-icon-btn" title="Desktop">🖥️</button>
              <button className="ce-icon-btn" title="Tablet">📱</button>
              <button className="ce-icon-btn" title="Mobile">📲</button>
            </div>
            <div className="ce-sep" />
            <label className="ce-zoom">
              <span>Zoom</span>
              <select value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}>
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={0.8}>80%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
              </select>
            </label>
          </div>
          <div className="ce-toolbar-right">
            <button className="ce-btn" onClick={exportJson}>Export JSON</button>
          </div>
        </div>
      </div>
      <div className="ce-body">
        <div className="ce-left">
          <div className="ce-list">
            <div className="ce-region">
              <div className="ce-region-title">Structure</div>
              {renderTree(domTree)}
            </div>
          </div>
        </div>
        <div className="ce-center">
          <div className="ce-preview" ref={containerRef}>
            <div className="ce-zoom-wrap" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
              <iframe ref={iframeRef} className="ce-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-top-navigation-by-user-activation" title="Preview" />
            </div>
          </div>
        </div>
        <div className="ce-props">
          <div className="ce-props-tabs">
            <button className="ce-tab on">Styles</button>
            <button className="ce-tab">Properties</button>
          </div>
          <div className="ce-props-body">
            <div className="ce-prop-card">
              <div className="ce-prop-title">Layout</div>
              <div className="ce-prop-grid">
                <label>Display<select defaultValue="block"><option value="block">Block</option><option value="flex">Flex</option></select></label>
                <label>Align<select defaultValue="stretch"><option>stretch</option><option>center</option></select></label>
                <label>Gap<input type="number" defaultValue={0} /></label>
              </div>
            </div>
            <div className="ce-prop-card">
              <div className="ce-prop-title">Spacing</div>
              <div className="ce-prop-grid">
                <label>Margin<input type="text" placeholder="0 0 0 0" /></label>
                <label>Padding<input type="text" placeholder="0 0 0 0" /></label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


