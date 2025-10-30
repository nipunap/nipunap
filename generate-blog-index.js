#!/usr/bin/env node

/**
 * Blog Index Generator
 * 
 * This script scans the blogs/ directory and generates an index.json file
 * with all blog posts, categories, and tags for the scalable blog system.
 * 
 * Usage: node generate-blog-index.js
 */

const fs = require('fs');
const path = require('path');

const BLOGS_DIR = './blogs';
const INDEX_FILE = path.join(BLOGS_DIR, 'index.json');

// Blog post metadata structure
const blogPosts = [];
const categories = new Map();
const tags = new Map();

/**
 * Scan directory for blog posts
 */
function scanBlogDirectory(dir, year) {
    const fullPath = path.join(BLOGS_DIR, dir);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`Directory ${fullPath} does not exist, skipping...`);
        return;
    }
    
    const files = fs.readdirSync(fullPath);
    
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(fullPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Extract metadata from HTML content
            const metadata = extractMetadata(content, file, year);
            if (metadata) {
                blogPosts.push(metadata);
                
                // Update categories
                const category = metadata.category;
                categories.set(category, (categories.get(category) || 0) + 1);
                
                // Update tags
                metadata.tags.forEach(tag => {
                    tags.set(tag, (tags.get(tag) || 0) + 1);
                });
            }
        }
    });
}

/**
 * Extract metadata from HTML content
 */
function extractMetadata(content, filename, year) {
    try {
        // Extract title
        const titleMatch = content.match(/<title>([^<]+)</);
        if (!titleMatch) return null;
        
        const title = titleMatch[1].replace(' - Nipuna Perera', '').trim();
        
        // Extract meta description
        const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
        const excerpt = descMatch ? descMatch[1] : '';
        
        // Extract all meta values
        const metaMatches = content.match(/<span class="meta-value">([^<]+)<\/span>/g) || [];
        const metaValues = metaMatches.map(match => 
            match.replace('<span class="meta-value">', '').replace('</span>', '')
        );
        
        // Extract date (look for date pattern)
        let date = '';
        for (let value of metaValues) {
            if (value.includes('December') || value.includes('2024') || value.includes('2025')) {
                date = value;
                break;
            }
        }
        
        // Extract category (look for known categories)
        let category = '';
        const knownCategories = ['Database', 'AWS', 'Automation', 'Performance', 'Tutorials'];
        for (let value of metaValues) {
            if (knownCategories.includes(value)) {
                category = value;
                break;
            }
        }
        
        // Extract tags (look for comma-separated values that contain actual tags)
        let tags = [];
        for (let value of metaValues) {
            if (value.includes(',') && !value.includes('min read') && 
                (value.includes('Redis') || value.includes('AWS') || value.includes('Python') || 
                 value.includes('MySQL') || value.includes('Kafka') || value.includes('Database'))) {
                tags = value.split(',').map(t => t.trim());
                break;
            }
        }
        
        // Extract read time
        let readTime = '5 min read';
        for (let value of metaValues) {
            if (value.includes('min read')) {
                readTime = value;
                break;
            }
        }
        
        // Generate ID from filename
        const id = filename.replace('.html', '');
        
        return {
            id,
            title,
            excerpt,
            date,
            category,
            tags,
            readTime,
            author: 'Nipuna Perera',
            path: `${year}/${filename}`
        };
        
    } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
        return null;
    }
}

/**
 * Generate the index.json file
 */
function generateIndex() {
    // Scan year directories
    const yearDirs = fs.readdirSync(BLOGS_DIR)
        .filter(item => {
            const itemPath = path.join(BLOGS_DIR, item);
            return fs.statSync(itemPath).isDirectory() && /^\d{4}$/.test(item);
        })
        .sort((a, b) => b.localeCompare(a)); // Sort years descending
    
    yearDirs.forEach(year => {
        console.log(`Scanning year: ${year}`);
        scanBlogDirectory(year, year);
    });
    
    // Sort posts by date (newest first)
    blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Convert maps to arrays
    const categoriesArray = Array.from(categories.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    const tagsArray = Array.from(tags.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    // Create index object
    const index = {
        posts: blogPosts,
        categories: categoriesArray,
        tags: tagsArray
    };
    
    // Write index file
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`\nGenerated blog index with:`);
    console.log(`- ${blogPosts.length} blog posts`);
    console.log(`- ${categoriesArray.length} categories`);
    console.log(`- ${tagsArray.length} tags`);
    console.log(`\nIndex written to: ${INDEX_FILE}`);
}

// Run the generator
if (require.main === module) {
    generateIndex();
}

module.exports = { generateIndex, scanBlogDirectory, extractMetadata };
