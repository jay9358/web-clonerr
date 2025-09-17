import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { buildDomTree } from './utils/domUtils.js';
import './CustomEditor.css';

// --- SVG Icon Definitions ---
const ICONS = {
    layers: "M12 1.5l-8.25 4.5 8.25 4.5 8.25-4.5L12 1.5zM3.75 9l8.25 4.5 8.25-4.5v4.5l-8.25 4.5-8.25-4.5V9z",
    plus: "M12 4.5c.414 0 .75.336.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6c0-.414.336-.75.75-.75z",
    desktop: "M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v2h10V6H5zm0 4v2h10v-2H5zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
    tablet: "M4 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h8v12H4V4z",
    mobile: "M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2h6v10H7V4z",
    magic: "M9.5 2c.28 0 .5.22.5.5V4h1.5a.5.5 0 01.5.5v1.5H13a.5.5 0 01.5.5v1.5h1.5a.5.5 0 01.5.5V11h.5a.5.5 0 01.5.5v1.5a.5.5 0 01-.5.5H16v1.5a.5.5 0 01-.5.5H14v.5a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5V16h-1.5a.5.5 0 01-.5-.5V14h-.5a.5.5 0 01-.5-.5v-1.5A.5.5 0 018 11V9.5a.5.5 0 01.5-.5H10V7.5a.5.5 0 01.5-.5H12V5.5a.5.5 0 01.5-.5H14V4h.5a.5.5 0 01.5-.5h1.5a.5.5 0 01.5.5V6h.5a.5.5 0 01.5.5V8h.5a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H17v1.5a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5V13h-1.5a.5.5 0 01-.5-.5V11h-1.5a.5.5 0 01-.5-.5V9.5a.5.5 0 01.5-.5H12V7.5a.5.5 0 01.5-.5H14V5.5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5V7h.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H15v1.5a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V11H11v1.5a.5.5 0 01-.5.5H9.5a.5.5 0 01-.5-.5V11H7.5a.5.5 0 01-.5-.5V9.5a.5.5 0 01.5-.5H9V7.5a.5.5 0 01.5-.5h1.5a.5.5 0 01.5.5V9h1.5a.5.5 0 01.5.5v1.5a.5.5 0 01-.5.5H13v1.5a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5V13H9.5a.5.5 0 01-.5-.5v-1.5a.5.5 0 01.5-.5H11V9.5a.5.5 0 01.5-.5h1.5a.5.5 0 01.5.5V11h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H14v.5a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5V12H11v-.5a.5.5 0 01-.5-.5V10H9.5a.5.5 0 01-.5-.5V8H7.5a.5.5 0 01-.5-.5V6h-.5a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5H8V2.5A.5.5 0 018.5 2h1z",
    lock: "M8 1a2 2 0 00-2 2v2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a2 2 0 00-2-2H8zm0 2h4v2H8V3zm-3 4h10v8H5V7z",
    unlock: "M8 1a2 2 0 00-2 2v2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a2 2 0 00-2-2H8zm0 2h1V3a1 1 0 10-2 0v2h1z",
    chevronDown: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
    info: "M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5h2V7h-2v6zm0 4h2v-2h-2v2z",
    arrowRight: "M10 3a1 1 0 01.707.293l5 5a1 1 0 010 1.414l-5 5A1 1 0 019 14V6a1 1 0 011-1z",
    arrowLeft: "M10 3a1 1 0 011 1v10a1 1 0 01-1.707.707l-5-5a1 1 0 010-1.414l5-5A1 1 0 0110 3z",
    arrowUp: "M3 10a1 1 0 01.293-.707l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L11 7.414V17a1 1 0 11-2 0V7.414L4.707 10.707A1 1 0 013 10z",
    arrowDown: "M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6 8a1 1 0 011.707-.707l5-5a1 1 0 111.414 1.414l-5.707 5.707a1 1 0 01-1.414 0l-5.707-5.707a1 1 0 111.414-1.414L9 17.586V3a1 1 0 112 0v14.586z"
};

const Icon = ({ path, className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
);

// --- Left Sidebar Components ---
const LeftSidebar = ({
    tree,
    selectedId,
    lockedIds,
    onSelect,
    onDrop,
    onToggleLock,
    scrollContainerRef
}) => {
    return (
        <div className="w-64 bg-[#18181B] text-gray-300 flex flex-col h-full border-r border-gray-700/50">
            <div className="p-3 border-b border-gray-700/50">
                <div className="font-semibold text-sm text-white">Pages</div>
                <div className="mt-2 text-sm bg-gray-700/50 p-2 rounded-md cursor-pointer">Landing Page</div>
            </div>
            <div className="flex-grow overflow-y-auto" ref={scrollContainerRef}>
                <DomTreeView tree={tree} selectedId={selectedId} lockedIds={lockedIds} onSelect={onSelect} onDrop={onDrop} onToggleLock={onToggleLock} />
            </div>
        </div>
    );
};

// --- DOM Tree View Components ---
const DomTreeItem = ({ 
    node, 
    level,
    selectedId,
    lockedIds,
    onSelect,
    onDrop,
    onToggleLock
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    const isSelected = selectedId === node.id;
    const isLocked = lockedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const handleDragStart = (e) => { e.dataTransfer.setData('text/plain', node.id); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== node.id) {
            onDrop(draggedId, node.id, isDragOver === 'top' ? 'before' : 'after');
        }
        setIsDragOver(null);
    };
    const handleDragOver = (e) => {
        e.preventDefault(); e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setIsDragOver(e.clientY < midY ? 'top' : 'bottom');
    };
    const handleDragLeave = (e) => { e.stopPropagation(); setIsDragOver(null); };

    return (
        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className="relative text-xs" data-tree-id={node.id}>
            <div
                draggable
                onDragStart={handleDragStart}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`flex items-center rounded cursor-pointer transition-colors pr-2 group ${isSelected ? 'bg-blue-600/30' : 'hover:bg-gray-700/50'}`}
                style={{ paddingLeft: `${level * 16}px` }}
                onClick={() => onSelect(node.element)}
            >
                <div onClick={(e) => { e.stopPropagation(); hasChildren && setIsExpanded(!isExpanded); }} className="w-5 h-6 flex-shrink-0 flex items-center justify-center text-gray-500">
                    {hasChildren && <span className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>}
                </div>
                <div className="py-1 flex-grow truncate">
                    <span className={isSelected ? 'text-white' : 'text-gray-300'}>{node.label}</span>
                </div>
                {(isHovered || isLocked) && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleLock(node.id); }} className="p-1 rounded hover:bg-gray-600">
                        <Icon path={isLocked ? ICONS.lock : ICONS.unlock} className={`w-3.5 h-3.5 ${isLocked ? 'text-blue-400' : 'text-gray-500'}`} />
                    </button>
                )}
            </div>
            {isDragOver && <div className={`absolute left-0 right-0 h-0.5 bg-blue-400 z-10 ${isDragOver === 'top' ? 'top-0' : 'bottom-0'}`}></div>}
            {isExpanded && hasChildren && (
                <div>{node.children.map(child => <DomTreeItem key={child.id} node={child} level={level + 1} selectedId={selectedId} lockedIds={lockedIds} onSelect={onSelect} onDrop={onDrop} onToggleLock={onToggleLock} />)}</div>
            )}
        </div>
    );
};

// FIX: Corrected DomTreeView props to include 'tree' and avoid passing it down to DomTreeItem.
const DomTreeView = ({ tree, ...rest }) => (
    <div className="p-2">
        <div className="text-xs font-semibold text-gray-400 mb-2 px-2 flex items-center gap-2">
            <Icon path={ICONS.layers} /> LAYERS
        </div>
        {tree.map(node => <DomTreeItem key={node.id} node={node} level={0} {...rest} />)}
    </div>
);

// --- Center Panel: Toolbar and Canvas ---
const DEVICE_WIDTHS = { desktop: '100%', tablet: '768px', mobile: '375px' };


const Toolbar = ({
    zoom,
    setZoom,
    device,
    setDevice,
    onGenerate,
    onDownload
}) => (
    <div className="bg-[#18181B] h-12 flex items-center justify-between px-4 border-b border-gray-700/50">
        <div className="flex-1"></div>
        <div className="flex-1 flex justify-center items-center gap-2">
            {(['desktop', 'tablet', 'mobile']).map(d => (
                <button key={d} onClick={() => setDevice(d)} className={`p-2 rounded-md ${device === d ? 'bg-gray-600' : 'hover:bg-gray-700/50'}`}>
                    <Icon path={ICONS[d]} className="w-5 h-5 text-gray-300"/>
                </button>
            ))}
            <div className="w-px h-6 bg-gray-700/50 mx-2"></div>
            <select value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[50, 75, 100, 125].map(v => <option key={v} value={v/100}>{v}%</option>)}
            </select>
        </div>
        <div className="flex-1 flex justify-end gap-2">
            <button onClick={onDownload} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition-colors">
                Download
            </button>
            <button onClick={onGenerate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition-colors flex items-center gap-2">
                <Icon path={ICONS.magic} className="w-4 h-4" />
                Generate
            </button>
        </div>
    </div>
);

const CenterPanel = ({ iframeRef, device, zoom }) => (
    <div className="flex-grow bg-[#09090B] flex items-center justify-center overflow-auto p-8">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} className="transition-transform duration-200">
            <iframe ref={iframeRef} className="bg-white shadow-2xl" style={{ width: DEVICE_WIDTHS[device], height: '80vh', border: 'none', transition: 'width 0.3s ease-in-out' }} title="Preview" sandbox="allow-scripts allow-same-origin"/>
        </div>
    </div>
);

// --- Right Sidebar: Inspector ---
// FIX: Made children prop optional to allow for empty sections, which was causing a TypeScript error.
const StyleSection = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="border-b border-gray-700/50">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-2 hover:bg-gray-700/30">
                <span className="font-semibold text-xs text-gray-400">{title}</span>
                <Icon path={ICONS.chevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-3 space-y-3">{children}</div>}
        </div>
    );
};

const StyleControl = ({ label, children }) => (
    <div className="flex items-center justify-between text-xs">
        <label className="text-gray-400 flex items-center gap-1">
            <Icon path={ICONS.info} className="w-3 h-3 text-gray-500" /> {label}
        </label>
        {children}
    </div>
);

const IconButtonGroup = ({ options, value, onChange }) => (
    <div className="flex bg-gray-900/50 border border-gray-600 rounded-md">
        {options.map(opt => (
            <button key={opt.value} onClick={() => onChange(opt.value)} className={`p-1.5 ${value === opt.value ? 'bg-gray-600' : 'hover:bg-gray-700/50'} first:rounded-l-md last:rounded-r-md`}>
                <Icon path={opt.icon} className="w-4 h-4 text-gray-300"/>
            </button>
        ))}
    </div>
);

const RightSidebar = ({
    element,
    onStyleChange
}) => {
    const [styles, setStyles] = useState({});
    const [activeTab, setActiveTab] = useState('Styles');
    
    useEffect(() => {
        if (element) {
            const computed = window.getComputedStyle(element);
            setStyles({
                display: computed.display,
                flexDirection: computed.flexDirection,
                justifyContent: computed.justifyContent,
                alignItems: computed.alignItems,
            });
        }
    }, [element]);

    if (!element) return <div className="w-72 bg-[#18181B] text-gray-400 p-4 text-sm border-l border-gray-700/50">Select an element to inspect.</div>;

    return (
        <div className="w-72 bg-[#18181B] flex flex-col h-full border-l border-gray-700/50">
            <div className="flex border-b border-gray-700/50">
                {['Styles', 'Properties'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 p-2 text-sm font-medium ${activeTab === tab ? 'text-white bg-gray-700/30' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        {tab}
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-y-auto">
                 {activeTab === 'Styles' && (
                    <div>
                        <StyleSection title="Layout">
                            <StyleControl label="Display">
                               <select value={styles.display || ''} onChange={e => onStyleChange('display', e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs w-28">
                                    <option>block</option><option>inline-block</option><option>flex</option><option>grid</option><option>none</option>
                                </select>
                            </StyleControl>
                             {styles.display === 'flex' && <>
                                <StyleControl label="Direction">
                                    <IconButtonGroup value={styles.flexDirection} onChange={v => onStyleChange('flex-direction', v)} options={[
                                        {value: 'row', icon: ICONS.arrowRight}, {value: 'column', icon: ICONS.arrowDown},
                                        {value: 'row-reverse', icon: ICONS.arrowLeft}, {value: 'column-reverse', icon: ICONS.arrowUp}
                                    ]} />
                                </StyleControl>
                                <StyleControl label="Justify"><p className="text-gray-500">Center</p></StyleControl>
                                <StyleControl label="Align"><p className="text-gray-500">Stretch</p></StyleControl>
                             </>}
                        </StyleSection>
                         <StyleSection title="Spacing">{/* Spacing controls go here */}</StyleSection>
                         <StyleSection title="Typography">{/* Typography controls go here */}</StyleSection>
                         <StyleSection title="Appearance">{/* Appearance controls go here */}</StyleSection>
                    </div>
                 )}
                 {activeTab === 'Properties' && <div className="p-4 text-xs text-gray-500">Properties inspector is not yet implemented.</div>}
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function CustomEditor({ htmlContent, originalUrl }) {
  const iframeRef = useRef(null);
    const [domTree, setDomTree] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [hoverElement, setHoverElement] = useState(null);
    const leftSidebarScrollRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [device, setDevice] = useState('desktop');
    const [lockedIds, setLockedIds] = useState(new Set());
    const selectedId = useMemo(() => selectedElement?.getAttribute('data-editor-id'), [selectedElement]);

    const refreshDomTree = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
            try {
                setDomTree(buildDomTree(doc.body));
            } catch (error) {
                console.error('Error building DOM tree:', error);
                setDomTree([]);
            }
        }
    }, []);
    
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
        iframe.srcdoc = htmlContent || '<!doctype html><html><head></head><body></body></html>';

        const setupIframe = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

            try {
                let overlay = doc.getElementById('editor-overlay');
      if (!overlay) {
        overlay = doc.createElement('div');
                    overlay.id = 'editor-overlay';
        overlay.style.position = 'absolute';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '2147483647';
        doc.body.appendChild(overlay);
      }

                refreshDomTree();
            } catch (error) {
                console.error('Error setting up iframe:', error);
            }

      const onPointerMove = (e) => {
                // Obtain overlay safely within handler scope
                const overlayEl = doc.getElementById('editor-overlay');
                let prevDisplay = '';
                if (overlayEl) {
                    // Hide overlay so it doesn't interfere with elementFromPoint
                    prevDisplay = overlayEl.style.display;
                    overlayEl.style.display = 'none';
                }
                const target = doc.elementFromPoint(e.clientX, e.clientY);
                if (overlayEl) {
                    // Restore overlay visibility
                    overlayEl.style.display = prevDisplay;
                }
                setHoverElement((target && target !== doc.body && !(target instanceof HTMLElement && target.id === 'editor-overlay')) ? target : null);
            };
      const onClick = (e) => {
                if(e.target instanceof Element) { e.preventDefault(); e.stopPropagation(); setSelectedElement(e.target); }
            };
            doc.addEventListener('pointermove', onPointerMove, true);
      doc.addEventListener('click', onClick, true);

            const blockerTimeout = setTimeout(() => {
                const blockerScript = doc.createElement('script');
                blockerScript.textContent = `window.fetch=()=>Promise.reject('Blocked');XMLHttpRequest.prototype.send=()=>{};setInterval=()=>0;setTimeout=()=>0;`;
                doc.head.appendChild(blockerScript);
            }, 2000);

      return () => {
        doc.removeEventListener('pointermove', onPointerMove, true);
        doc.removeEventListener('click', onClick, true);
                clearTimeout(blockerTimeout);
            };
        };

        let cleanup = undefined;
        iframe.addEventListener('load', () => { cleanup = setupIframe(); });
        return () => { if (cleanup) cleanup(); };
    }, [htmlContent, refreshDomTree]);

  useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        const overlay = doc?.getElementById('editor-overlay');
    const target = hoverElement || selectedElement;
        if (!overlay || !target) { if (overlay) overlay.style.display = 'none'; return; }

        const rect = target.getBoundingClientRect();
        const style = overlay.style;
        style.display = 'block';
        style.left = `${rect.left + (doc.defaultView?.scrollX || 0)}px`;
        style.top = `${rect.top + (doc.defaultView?.scrollY || 0)}px`;
        style.width = `${rect.width}px`;
        style.height = `${rect.height}px`;

        if (selectedElement === target) {
             overlay.setAttribute('data-mode', 'selected');
            // Inline styles because parent CSS doesn't apply inside the iframe
            style.border = '2px solid #2563EB';
            style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
        } else {
             overlay.removeAttribute('data-mode');
            // Hover state
            style.border = '2px dashed #2563EB';
            style.backgroundColor = 'transparent';
        }
  }, [hoverElement, selectedElement]);

    const handleSelect = useCallback((element) => {
        setSelectedElement(element);
        setHoverElement(null); // Clear hover state when selecting
        
        // Scroll within the iframe's viewport
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
            const iframeWindow = iframe.contentWindow;
            const iframeDoc = iframe.contentDocument;
            
            if (iframeWindow && iframeDoc) {
                // Temporarily focus the iframe to ensure scrollIntoView works within it
                iframe.focus();
                
                // Use a timeout to ensure the focus takes effect
                setTimeout(() => {
                    element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center', 
                        inline: 'center' 
                    });
                }, 50);
            }
        }
    }, []);

    // Sync left panel scroll to selected tree item
    useEffect(() => {
        if (!selectedId) return;
        const scrollContainer = leftSidebarScrollRef.current;
        if (!scrollContainer) return;
        // Use a timeout to allow React to render the selected state in the tree first
        const timer = setTimeout(() => {
            const item = scrollContainer.querySelector(`[data-tree-id="${selectedId}"]`);
            if (item && typeof item.scrollIntoView === 'function') {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [selectedId]);

    const handleStyleChange = useCallback((property, value) => {
        if (selectedElement && 'style' in selectedElement) {
            try {
                selectedElement.style.setProperty(property, value);
            } catch (error) {
                console.error('Error setting style property:', error);
            }
        }
    }, [selectedElement]);
    
    const handleDrop = useCallback((draggedId, targetId, position) => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        try {
            const draggedEl = doc.querySelector(`[data-editor-id="${draggedId}"]`);
            const targetEl = doc.querySelector(`[data-editor-id="${targetId}"]`);
            if (draggedEl && targetEl?.parentElement) {
                targetEl.parentElement.insertBefore(draggedEl, position === 'before' ? targetEl : targetEl.nextSibling);
                refreshDomTree();
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }, [refreshDomTree]);
    
    const handleToggleLock = useCallback((id) => {
        setLockedIds(prev => {
      const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
      return next;
    });
    }, []);
    
    const handleDownload = useCallback(() => {
        try {
            const doc = iframeRef.current?.contentDocument;
            if (!doc) return;
            
            // Clone the document to avoid modifying the original
            const clonedDoc = doc.cloneNode(true);
            
            // Add base tag if originalUrl is provided
            if (originalUrl && clonedDoc.head) {
                let baseEl = clonedDoc.querySelector('head base');
                if (!baseEl) {
                    baseEl = clonedDoc.createElement('base');
                    // Prepend so it affects all subsequent relative URLs
                    clonedDoc.head.prepend(baseEl);
                }
                baseEl.setAttribute('href', originalUrl);
            }
            
            const doctype = '<!doctype html>';
            const serialized = `${doctype}\n${clonedDoc.documentElement.outerHTML}`;
            const blob = new Blob([serialized], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited.html';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading HTML:', error);
        }
    }, [originalUrl]);

    const handleGenerate = () => {
        // This is where you would send the layout to the backend.
        // For now, we'll just log the locked elements.
        try {
            const lockedElementsData = Array.from(lockedIds).map(id => {
                const el = iframeRef.current?.contentDocument?.querySelector(`[data-editor-id="${id}"]`);
                return { id, html: el?.outerHTML };
            });
            console.log("Generating variations, preserving locked elements:", lockedElementsData);
            alert(`Simulating layout generation.\n${lockedElementsData.length} elements are locked.`);
        } catch (error) {
            console.error('Error generating layout:', error);
            alert('Error generating layout. Please try again.');
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            <LeftSidebar tree={domTree} selectedId={selectedId} lockedIds={lockedIds} onSelect={handleSelect} onDrop={handleDrop} onToggleLock={handleToggleLock} scrollContainerRef={leftSidebarScrollRef}/>
            <div className="flex-1 flex flex-col">
                <Toolbar zoom={zoom} setZoom={setZoom} device={device} setDevice={setDevice} onGenerate={handleGenerate} onDownload={handleDownload} />
                <CenterPanel iframeRef={iframeRef} device={device} zoom={zoom} />
            </div>
            <RightSidebar element={selectedElement} onStyleChange={handleStyleChange} />
      </div>
    );
  }