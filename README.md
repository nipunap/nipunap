# Nipuna Perera - Personal Website

A modern, terminal-themed (light) personal website and blog for Nipuna Perera, Senior Staff Database Reliability Engineer.

## Features

- **Terminal Theme (Light)**: Linux terminal-inspired UI on a white background with accessible contrast
- **Scalable Blog System**: Year-based folder structure under `blogs/YYYY/*.html`
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Terminal**: Typing effects, hover animations, and keyboard shortcuts
- **Modern CSS**: Custom CSS with terminal aesthetics and smooth animations

## Pages

- **Home** (`index.html`): Terminal interface with personal introduction and navigation
- **Blog** (`blog.html`): Blog listing with categories and tags
- **CV** (`cv.html`): Professional CV in terminal format
- **Projects** (`projects.html`): Portfolio of technical projects
- **Contact** (`contact.html`): Contact information and social links

## Blog System

The blog is file-based and scalable:

- **Structure**: `blogs/<year>/<slug>.html` (e.g., `blogs/2024/redis-scaling-beyond-1tb.html`)
- **Index**: `blogs/index.json` (auto-generated) powers `blog.html`
- **Generator**: `node generate-blog-index.js` scans `blogs/*/*` and updates `blogs/index.json`
- **Categories & Tags**: Extracted from each post's metadata section

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Custom styling with CSS variables and animations
- **JavaScript (ES Modules)**: Modern modular JavaScript
- **Vite**: Build tool and dev server
- **marked.js**: Markdown parsing
- **DOMPurify**: XSS protection
- **JetBrains Mono**: Terminal-style font
- **Font Awesome**: Icons
- **JSON**: Data storage for blog content

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[SECURITY.md](./SECURITY.md)** - Security policy and configuration
- **[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)** - Recent improvements and refactoring details

## 🔒 Security

This site implements enterprise-level security:
- ✅ XSS protection with DOMPurify
- ✅ Content Security Policy (CSP)
- ✅ Subresource Integrity (SRI) for external resources
- ✅ Secure HTTP headers
- ✅ Input sanitization
- ✅ No inline scripts (except ES modules)

See [SECURITY.md](./SECURITY.md) for complete details.

## ♿ Accessibility

WCAG AA compliant:
- ✅ Semantic HTML
- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Skip links
- ✅ Screen reader support
- ✅ Focus indicators

## 📝 Adding New Blog Posts

See [DEVELOPMENT.md](./DEVELOPMENT.md#adding-a-new-blog-post) for detailed instructions.

## File Structure

```
nipunap/
├── index.html                 # Home page (terminal UI)
├── blog.html                  # Blog listing (loads blogs/index.json)
├── cv.html                    # CV page
├── projects.html              # Projects portfolio
├── contact.html               # Contact page
├── styles.css                 # Main stylesheet (light terminal theme)
├── script.js                  # Terminal interactions
├── blogs/
│   ├── index.json            # Generated blog index
│   ├── 2024/
│   │   ├── redis-scaling-beyond-1tb.html
│   │   ├── kafka-connect-msk-migration.html
│   │   └── database-automation-python.html
│   └── template.html         # Template for new posts
├── generate-blog-index.js     # Script to generate blogs/index.json
├── sitemap.xml                # SEO sitemap
├── robots.txt                 # SEO robots policy
├── .nojekyll                  # Disable Jekyll on GitHub Pages
└── README.md                  # This file
```

## Getting Started

1. Clone or download the repository
2. For local preview, open `index.html` in a browser
3. For GitHub Pages (Project Pages): Settings → Pages → Source = `main` / `/ (root)`
4. Your site will be at `https://<username>.github.io/<repo>/`

## Customization

### Adding Blog Posts

Method A (recommended – HTML template)
1. Copy `blogs/template.html` → `blogs/YYYY/my-post-slug.html`
2. Fill in metadata (Title, Date, Category, Tags, Read Time) and write content
3. Run `node generate-blog-index.js` to update `blogs/index.json`

Method B (manual)
1. Create `blogs/YYYY/your-post.html`
2. Follow existing posts’ structure
3. Run `node generate-blog-index.js`

### Styling

Modify `styles.css` to customize colors and appearance. Key CSS variables (light theme defaults shown):

```css
:root {
  --terminal-bg: #ffffff;
  --terminal-green: #1f2937;
  --terminal-green-bright: #16a34a;
  --terminal-cyan: #0ea5e9;
  --terminal-yellow: #b45309;
  --terminal-border: #e5e7eb;
}
```

### Content Updates

- **Personal Info**: Update contact information in `contact.html`
- **CV Content**: Modify `cv.html` with latest experience
- **Projects**: Add new projects in `projects.html`
- **Skills**: Update skill tags across relevant pages

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance

- Optimized CSS with minimal external dependencies
- Efficient JavaScript with debounced scroll events
- Responsive images and lazy loading
- Minimal bundle size for fast loading

## SEO

- `sitemap.xml` lists key pages and all blog posts
- `robots.txt` allows crawling and points to the sitemap
- Pages include sensible `<title>` and meta descriptions
- Project Pages friendly (relative URLs; `.nojekyll` present)

## License

This project is open source and available under the [MIT License](LICENSE).

## Contact

- **Email**: nipunap@gmail.com
- **LinkedIn**: [linkedin.com/in/nipunap](https://linkedin.com/in/nipunap)
- **GitHub**: [github.com/nipunap](https://github.com/nipunap)

---

*Built with ❤️ and terminal nostalgia*
