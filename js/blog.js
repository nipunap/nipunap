/**
 * Blog-specific utilities
 */

import { getBasePath, retry, fetchWithTimeout, logError } from './utils.js';

/**
 * Fetch blog index with retry logic
 * @returns {Promise<Object>} Blog data
 */
export async function fetchBlogIndex() {
  const basePath = getBasePath();
  const url = `${basePath}/blogs/index.json`;

  return retry(async () => {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blog index: ${response.status}`);
    }
    return response.json();
  });
}

/**
 * Fetch a specific blog post markdown
 * @param {string} path - Path to markdown file
 * @returns {Promise<string>} Markdown content
 */
export async function fetchBlogPost(path) {
  const basePath = getBasePath();
  const url = `${basePath}/blogs/${path}`;

  return retry(async () => {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blog post: ${response.status}`);
    }
    return response.text();
  });
}

/**
 * Get blog post by ID from index
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Post metadata
 */
export async function getBlogPostById(postId) {
  try {
    const index = await fetchBlogIndex();
    const post = index.posts.find(p => p.id === postId);

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    return post;
  } catch (error) {
    logError(error, { postId });
    throw error;
  }
}

/**
 * Generate blog post structured data for SEO
 * @param {Object} post - Post metadata
 * @returns {Object} Structured data
 */
export function generateBlogPostStructuredData(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: post.author || 'Nipuna Perera',
    },
    datePublished: post.date,
    keywords: post.tags.join(', '),
    articleSection: post.category,
  };
}

/**
 * Cache for blog data (simple in-memory cache)
 */
const cache = new Map();

/**
 * Get cached data or fetch if not cached
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} Cached or fresh data
 */
export async function getCached(key, fetchFn, ttl = 300000) {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.clear();
}

