/**
 * Secure Markdown renderer using marked.js and DOMPurify
 */

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.0/+esm';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.9/+esm';

// Configure marked for better security and rendering
marked.setOptions({
  headerIds: true,
  mangle: false,
  breaks: true,
  gfm: true, // GitHub Flavored Markdown
  pedantic: false,
});

// Custom renderer for better code highlighting
const renderer = new marked.Renderer();

// Override code block rendering
renderer.code = function (code, language) {
  const validLang = language || 'text';
  return `<pre><code class="language-${validLang}">${DOMPurify.sanitize(code)}</code></pre>`;
};

// Override table rendering for better styling
renderer.table = function (header, body) {
  return `
    <table>
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
  `;
};

// Override link rendering to add security attributes
renderer.link = function (href, title, text) {
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const titleAttr = title ? ` title="${DOMPurify.sanitize(title)}"` : '';
  const relAttr = isExternal ? ' rel="noopener noreferrer"' : '';
  const targetAttr = isExternal ? ' target="_blank"' : '';
  
  return `<a href="${DOMPurify.sanitize(href)}"${titleAttr}${relAttr}${targetAttr}>${text}</a>`;
};

marked.use({ renderer });

/**
 * Convert markdown to sanitized HTML
 * @param {string} markdown - Markdown content
 * @returns {string} Sanitized HTML
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';

  try {
    // Convert markdown to HTML
    const rawHtml = marked.parse(markdown);

    // Sanitize HTML to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
        'a', 'img',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote',
        'div', 'span',
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src', 'class', 'id',
        'rel', 'target', 'loading',
      ],
      ALLOW_DATA_ATTR: false,
    });

    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return '<p>Error rendering markdown content.</p>';
  }
}

/**
 * Render markdown with syntax highlighting (optional future enhancement)
 * @param {string} markdown - Markdown content
 * @param {Function} highlighter - Optional syntax highlighter
 * @returns {string} Sanitized HTML with highlighted code
 */
export function renderMarkdownWithHighlighting(markdown, highlighter) {
  const html = renderMarkdown(markdown);

  if (!highlighter) return html;

  // Create temporary container
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Apply syntax highlighting to code blocks
  const codeBlocks = temp.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    const language = block.className.replace('language-', '');
    if (language && highlighter) {
      try {
        block.innerHTML = highlighter(block.textContent, language);
      } catch (error) {
        console.error('Highlighting error:', error);
      }
    }
  });

  return temp.innerHTML;
}

/**
 * Extract metadata from markdown (front matter)
 * @param {string} markdown - Markdown content
 * @returns {Object} { metadata, content }
 */
export function extractFrontMatter(markdown) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontMatterRegex);

  if (!match) {
    return { metadata: {}, content: markdown };
  }

  const [, frontMatter, content] = match;
  const metadata = {};

  // Parse YAML-like front matter
  frontMatter.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return { metadata, content: content.trim() };
}

/**
 * Generate table of contents from markdown
 * @param {string} markdown - Markdown content
 * @returns {Array} Array of heading objects
 */
export function generateTableOfContents(markdown) {
  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ level, text, id });
  }

  return headings;
}

export default renderMarkdown;

