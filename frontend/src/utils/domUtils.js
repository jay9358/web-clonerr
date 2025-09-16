const MAJOR_TAGS = new Set(['section', 'div', 'header', 'footer', 'article', 'aside', 'nav', 'main', 'form', 'figure', 'figcaption', 'details', 'summary', 'dialog']);
const IGNORED_TAGS = new Set(['script', 'style', 'link', 'meta', 'head', 'title', 'base', 'noscript']);

// Generic names for different component types
const GENERIC_NAMES = {
  'section': 'Section',
  'div': 'Container',
  'header': 'Header',
  'footer': 'Footer',
  'article': 'Article',
  'aside': 'Sidebar',
  'nav': 'Navigation',
  'main': 'Main Content',
  'form': 'Form',
  'figure': 'Figure',
  'figcaption': 'Caption',
  'details': 'Details',
  'summary': 'Summary',
  'dialog': 'Dialog'
};

let elementIdCounter = 0;
export const generateElementId = () => `editable-element-${elementIdCounter++}`;


const makeLabel = (el) => {
  const tag = el.tagName.toLowerCase();
  const genericName = GENERIC_NAMES[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
  
  // Add a counter for multiple elements of the same type
  const siblings = Array.from(el.parentElement?.children || []).filter(sibling => 
    sibling.tagName.toLowerCase() === tag
  );
  const index = siblings.indexOf(el);
  
  if (siblings.length > 1) {
    return `${genericName} ${index + 1}`;
  }
  
  return genericName;
};

export const buildDomTree = (root) => {
  const tree = [];
  if (!root || !root.children) return tree;

  for (const child of Array.from(root.children)) {
    if (IGNORED_TAGS.has(child.tagName.toLowerCase())) {
      continue;
    }

    if (!child.getAttribute('data-editor-id')) {
        child.setAttribute('data-editor-id', generateElementId());
    }

    const isMajor = MAJOR_TAGS.has(child.tagName.toLowerCase());

    // Only include major components
    if (isMajor) {
      const node = {
        id: child.getAttribute('data-editor-id'),
        element: child,
        tagName: child.tagName.toLowerCase(),
        label: makeLabel(child),
        children: buildDomTree(child), // Recursively build children
        isMajor: true,
      };
      
      tree.push(node);
    }
  }

  return tree;
};
