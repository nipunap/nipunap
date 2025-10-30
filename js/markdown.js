/**
 * Markdown parsing utilities using marked.js and DOMPurify
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Configure marked with custom options
 */
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: false, // Don't convert \n to <br>
  headerIds: true, // Add IDs to headers for linking
  mangle: false, // Don't mangle email addresses
});

/**
 * Configure DOMPurify with safe defaults
 */
const purifyConfig = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'strong',
    'em',
    'code',
    'pre',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'div',
    'span',
  ],
  ALLOWED_ATTR: [
    'href',
    'title',
    'target',
    'rel',
    'src',
    'alt',
    'class',
    'id',
    'width',
    'height',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Convert markdown to HTML safely
 * @param {string} markdown - Markdown content
 * @returns {string} Sanitized HTML
 */
export function markdownToHtml(markdown) {
  if (!markdown) return '';

  try {
    // Convert markdown to HTML
    const rawHtml = marked.parse(markdown);

    // Sanitize HTML to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, purifyConfig);

    return cleanHtml;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return '<p class="error">Error rendering content</p>';
  }
}

/**
 * Custom renderer for code blocks with syntax highlighting
 * (Can be extended with highlight.js or prism.js)
 */
const renderer = {
  code(code, language) {
    const validLang = language || 'plaintext';
    return `<pre><code class="language-${validLang}">${code}</code></pre>`;
  },
  link(href, title, text) {
    // Add rel="noopener noreferrer" for external links
    const isExternal = href.startsWith('http');
    const rel = isExternal ? ' rel="noopener noreferrer"' : '';
    const target = isExternal ? ' target="_blank"' : '';
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr}${rel}${target}>${text}</a>`;
  },
};

marked.use({ renderer });

/**
 * Extract metadata from markdown frontmatter (if present)
 * @param {string} markdown - Markdown content
 * @returns {Object} { metadata, content }
 */
export function parseMarkdownWithFrontmatter(markdown) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content: markdown };
  }

  const [, frontmatter, content] = match;
  const metadata = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return { metadata, content };
}

