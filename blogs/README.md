# Blog System

This directory contains the scalable blog system for the personal website.

## Structure

```
blogs/
├── 2024/                    # Blog posts organized by year
│   ├── redis-scaling-beyond-1tb.html
│   ├── kafka-connect-msk-migration.html
│   └── database-automation-python.html
├── 2025/                    # Future year folders
├── template.html            # Template for new blog posts
├── index.json              # Auto-generated blog index
└── README.md               # This file
```

## Adding New Blog Posts

### Method 1: Using the Template

1. Copy `template.html` to the appropriate year folder
2. Rename it to your desired filename (e.g., `my-new-post.html`)
3. Replace all placeholder values:
   - `BLOG_TITLE` → Your blog post title
   - `BLOG_EXCERPT` → Brief description for meta tags
   - `BLOG_DATE` → Publication date (e.g., "December 20, 2024")
   - `BLOG_CATEGORY` → Category (Database, AWS, Automation, etc.)
   - `BLOG_READ_TIME` → Estimated read time (e.g., "5 min read")
   - `BLOG_TAGS` → Comma-separated tags
   - `BLOG_FILENAME` → Your filename without .html
   - `YEAR` → The year folder name

4. Write your content in the blog-content section
5. Run the index generator: `node generate-blog-index.js`

### Method 2: Manual Creation

1. Create a new HTML file in the appropriate year folder
2. Use the existing blog posts as reference for structure
3. Ensure all metadata is properly formatted
4. Run the index generator: `node generate-blog-index.js`

## Blog Post Structure

Each blog post should include:

### HTML Head
```html
<title>Post Title - Nipuna Perera</title>
<meta name="description" content="Brief description">
```

### Blog Meta Section
```html
<div class="blog-meta">
    <div class="meta-item">
        <span class="meta-label">Title:</span>
        <span class="meta-value">Your Title</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">Author:</span>
        <span class="meta-value">Nipuna Perera</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">Date:</span>
        <span class="meta-value">December 20, 2024</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">Category:</span>
        <span class="meta-value">Database</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">Read Time:</span>
        <span class="meta-value">5 min read</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">Tags:</span>
        <span class="meta-value">MySQL, Performance, Optimization</span>
    </div>
</div>
```

### Content Guidelines

- Use semantic HTML structure
- Include proper headings (h1, h2, h3)
- Use code blocks with `<pre><code>` for syntax highlighting
- Include a back link to the blog listing
- End with publication date

## Categories

Current categories:
- **Database**: MySQL, PostgreSQL, Redis, performance optimization
- **AWS**: Cloud services, infrastructure, managed services
- **Automation**: Scripts, monitoring, DevOps tools
- **Performance**: Optimization, scaling, monitoring
- **Tutorials**: Step-by-step guides and how-tos

## Tags

Use relevant tags to help with categorization and search:
- Technology: `MySQL`, `Redis`, `Python`, `AWS`, `Kafka`
- Concepts: `Scaling`, `Performance`, `Automation`, `Monitoring`
- Context: `Production`, `Tutorial`, `Guide`, `Lessons`

## Index Generation

The blog index is automatically generated from the HTML files. To update it:

```bash
node generate-blog-index.js
```

This will:
1. Scan all year directories for HTML files
2. Extract metadata from each blog post
3. Generate categories and tags counts
4. Update `index.json` with the latest information

## File Naming Convention

- Use kebab-case for filenames: `my-awesome-post.html`
- Be descriptive but concise
- Avoid special characters and spaces
- Include the year in the directory structure

## Styling

All blog posts inherit the terminal theme styling from the main website. Key classes:

- `.blog-content` - Main content container
- `.blog-meta` - Metadata section
- `.back-link` - Link back to blog listing
- Standard terminal colors and fonts are applied automatically

## Future Enhancements

- [ ] Markdown support with conversion to HTML
- [ ] Automatic date parsing and sorting
- [ ] Search functionality
- [ ] RSS feed generation
- [ ] Comment system integration
- [ ] Related posts suggestions
