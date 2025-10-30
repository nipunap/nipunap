/**
 * SEO Enhancement Module
 * Handles meta tags, Open Graph, Twitter Cards, and structured data
 */

/**
 * Get the base URL for the site
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://nipunap.github.io'; // Fallback for build time
}

/**
 * Add or update a meta tag
 */
function setMetaTag(name, content, isProperty = false) {
  const attribute = isProperty ? 'property' : 'name';
  let meta = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', content);
}

/**
 * Set canonical URL
 */
function setCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', url);
}

/**
 * Add structured data (JSON-LD)
 */
function addStructuredData(data) {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data, null, 2);
  document.head.appendChild(script);
}

/**
 * Initialize SEO for the home page
 */
function initHomePageSEO() {
  const baseUrl = getBaseUrl();
  const title = 'Nipuna Perera - Senior Staff Database Reliability Engineer';
  const description = 'Senior Staff Database Reliability Engineer specializing in managing complex database environments, cloud infrastructure, and automation. 16+ years of experience with MySQL, Redis, PostgreSQL, and AWS.';
  const url = `${baseUrl}/`;
  const image = `${baseUrl}/assets/og-image.png`; // You'll need to create this
  
  // Set basic meta tags
  document.title = title;
  setMetaTag('description', description);
  setMetaTag('author', 'Nipuna Perera');
  setMetaTag('keywords', 'Database Reliability Engineer, DRE, DBRE, MySQL, Redis, PostgreSQL, AWS, Kubernetes, DevOps, SRE');
  
  // Open Graph tags
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:url', url, true);
  setMetaTag('og:image', image, true);
  setMetaTag('og:site_name', 'Nipuna Perera', true);
  
  // Twitter Card tags
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:site', '@nipunap');
  setMetaTag('twitter:creator', '@nipunap');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);
  
  // Canonical URL
  setCanonicalUrl(url);
  
  // Structured data - Person
  const personData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Nipuna Perera',
    jobTitle: 'Senior Staff Database Reliability Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'Udemy'
    },
    url: url,
    sameAs: [
      'https://github.com/nipunap',
      'https://linkedin.com/in/nipunap',
      'https://twitter.com/nipunap'
    ],
    email: 'nipunap@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dublin',
      addressCountry: 'IE'
    },
    knowsAbout: [
      'Database Engineering',
      'MySQL',
      'Redis',
      'PostgreSQL',
      'AWS',
      'Kubernetes',
      'Python',
      'DevOps',
      'Site Reliability Engineering'
    ]
  };
  
  addStructuredData(personData);
}

/**
 * Initialize SEO for a blog post
 */
function initBlogPostSEO(post) {
  const baseUrl = getBaseUrl();
  const title = `${post.title} - Nipuna Perera`;
  const description = post.excerpt || post.title;
  const url = `${baseUrl}/blog-post.html?id=${post.id}`;
  const image = `${baseUrl}/assets/og-image-blog.png`; // You'll need to create this
  
  // Set basic meta tags
  document.title = title;
  setMetaTag('description', description);
  setMetaTag('author', post.author || 'Nipuna Perera');
  setMetaTag('keywords', post.tags.join(', '));
  setMetaTag('article:published_time', post.date, true);
  setMetaTag('article:author', post.author || 'Nipuna Perera', true);
  setMetaTag('article:section', post.category, true);
  post.tags.forEach(tag => {
    setMetaTag('article:tag', tag, true);
  });
  
  // Open Graph tags
  setMetaTag('og:type', 'article', true);
  setMetaTag('og:title', post.title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:url', url, true);
  setMetaTag('og:image', image, true);
  setMetaTag('og:site_name', 'Nipuna Perera', true);
  
  // Twitter Card tags
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:site', '@nipunap');
  setMetaTag('twitter:creator', '@nipunap');
  setMetaTag('twitter:title', post.title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);
  
  // Canonical URL
  setCanonicalUrl(url);
  
  // Structured data - BlogPosting
  const articleData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: description,
    image: image,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author || 'Nipuna Perera',
      url: baseUrl
    },
    publisher: {
      '@type': 'Person',
      name: 'Nipuna Perera',
      url: baseUrl
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    keywords: post.tags.join(', '),
    articleSection: post.category,
    wordCount: post.readTime ? parseInt(post.readTime) * 200 : 2000 // Rough estimate
  };
  
  addStructuredData(articleData);
}

/**
 * Initialize SEO for the blog listing page
 */
function initBlogListingSEO() {
  const baseUrl = getBaseUrl();
  const title = 'Technical Blog - Nipuna Perera';
  const description = 'Technical articles about database engineering, cloud infrastructure, Kubernetes, and DevOps by Nipuna Perera.';
  const url = `${baseUrl}/blog.html`;
  const image = `${baseUrl}/assets/og-image-blog.png`;
  
  // Set basic meta tags
  document.title = title;
  setMetaTag('description', description);
  setMetaTag('author', 'Nipuna Perera');
  setMetaTag('keywords', 'Technical Blog, Database Engineering, DevOps, Kubernetes, Redis, MySQL, PostgreSQL');
  
  // Open Graph tags
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:url', url, true);
  setMetaTag('og:image', image, true);
  setMetaTag('og:site_name', 'Nipuna Perera', true);
  
  // Twitter Card tags
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:site', '@nipunap');
  setMetaTag('twitter:creator', '@nipunap');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);
  
  // Canonical URL
  setCanonicalUrl(url);
  
  // Structured data - Blog
  const blogData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Nipuna Perera Technical Blog',
    description: description,
    url: url,
    author: {
      '@type': 'Person',
      name: 'Nipuna Perera',
      url: baseUrl
    }
  };
  
  addStructuredData(blogData);
}

// Export functions for use in HTML pages
if (typeof window !== 'undefined') {
  window.SEO = {
    initHomePageSEO,
    initBlogPostSEO,
    initBlogListingSEO,
    setMetaTag,
    setCanonicalUrl,
    addStructuredData
  };
}

