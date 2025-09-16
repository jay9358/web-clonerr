// Types for the Custom Editor
// Note: In JavaScript, we don't have TypeScript interfaces, but we can document the expected structure

/**
 * @typedef {Object} DomNode
 * @property {string} id - Unique identifier for the element
 * @property {Element} element - The actual DOM element
 * @property {string} tagName - The tag name of the element
 * @property {string} label - Display label for the element
 * @property {DomNode[]} children - Child elements
 * @property {boolean} isMajor - Whether this is a major structural element
 */

/**
 * @typedef {string} StyleProperty
 * Valid values: 'display' | 'flex-direction' | 'justify-content' | 'align-items' | 'gap' | 'margin' | 'padding' | 'color' | 'background-color' | 'font-size' | 'font-weight'
 */

// Export for JSDoc compatibility
export {};
