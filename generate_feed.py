#!/usr/bin/env python3
"""
Generate RSS feed from blog posts in the repository.
"""

import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

# RSS feed configuration
RSS_CONFIG = {
    "title": "Nipuna Perera - Blog",
    "link": "https://github.com/nipunap/nipunap",
    "description": "Senior Staff Database Reliability Engineer specializing in managing complex database environments, ensuring high availability and performance at scale.",
    "language": "en-us",
    "email": "nipunap@gmail.com",
    "author": "Nipuna Perera",
}


def get_git_date(file_path):
    """Get the first commit date for a file."""
    try:
        result = subprocess.run(
            ["git", "log", "--format=%ai", "--reverse", "--", file_path],
            capture_output=True,
            text=True,
            check=True,
        )
        dates = result.stdout.strip().split("\n")
        if dates and dates[0]:
            return dates[0]
    except subprocess.CalledProcessError:
        pass
    return None


def format_rfc822_date(date_str):
    """Convert git date string to RFC822 format."""
    if not date_str:
        return None
    try:
        # Parse: "2025-10-30 12:45:48 +0000"
        dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S %z")
        # Format as RFC822: "Wed, 30 Oct 2025 12:45:48 +0000"
        return dt.strftime("%a, %d %b %Y %H:%M:%S %z")
    except ValueError:
        return None


def extract_title_and_description(file_path):
    """Extract title and description from markdown file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Extract title (first H1)
        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else Path(file_path).stem
        
        # Extract description (look for Goal: line or first paragraph)
        description = None
        goal_match = re.search(r"\*\*Goal:\*\*\s*(.+?)(?:\n|$)", content, re.MULTILINE)
        if goal_match:
            description = goal_match.group(1).strip()
        else:
            # Try to get first paragraph after title
            paragraphs = re.findall(r"^[A-Z][^\n]+(?:\n[^\n]+)*", content, re.MULTILINE)
            if paragraphs:
                description = paragraphs[0].strip()[:200]  # Limit length
        
        if not description:
            description = f"Read the full article: {title}"
        
        return title, description
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return Path(file_path).stem, ""


def find_blog_posts():
    """Find all blog posts in the blogs directory."""
    blog_posts = []
    blogs_dir = Path("blogs")
    
    if not blogs_dir.exists():
        return blog_posts
    
    # Find all markdown files recursively
    for md_file in blogs_dir.rglob("*.md"):
        git_date = get_git_date(str(md_file))
        title, description = extract_title_and_description(md_file)
        
        # Convert to relative path for GitHub URL
        rel_path = md_file.relative_to(Path("."))
        
        blog_posts.append({
            "path": str(md_file),
            "rel_path": str(rel_path),
            "title": title,
            "description": description,
            "date": git_date,
        })
    
    # Sort by date (newest first)
    blog_posts.sort(key=lambda x: x["date"] or "", reverse=True)
    
    return blog_posts


def generate_rss_feed():
    """Generate RSS feed XML."""
    blog_posts = find_blog_posts()
    
    # Get the latest build date
    if blog_posts and blog_posts[0]["date"]:
        last_build_date = format_rfc822_date(blog_posts[0]["date"])
    else:
        last_build_date = format_rfc822_date(datetime.now().strftime("%Y-%m-%d %H:%M:%S %z"))
    
    # Generate RSS XML
    rss_items = []
    for post in blog_posts:
        pub_date = format_rfc822_date(post["date"]) if post["date"] else None
        if not pub_date:
            continue  # Skip posts without dates
        
        github_url = f"{RSS_CONFIG['link']}/blob/main/{post['rel_path']}"
        
        item_xml = f"""    <item>
      <title>{escape(post['title'])}</title>
      <link>{github_url}</link>
      <description>{escape(post['description'])}</description>
      <author>{RSS_CONFIG['email']} ({RSS_CONFIG['author']})</author>
      <pubDate>{pub_date}</pubDate>
      <guid isPermaLink="true">{github_url}</guid>
    </item>"""
        rss_items.append(item_xml)
    
    rss_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{escape(RSS_CONFIG['title'])}</title>
    <link>{RSS_CONFIG['link']}</link>
    <description>{escape(RSS_CONFIG['description'])}</description>
    <language>{RSS_CONFIG['language']}</language>
    <managingEditor>{RSS_CONFIG['email']} ({RSS_CONFIG['author']})</managingEditor>
    <webMaster>{RSS_CONFIG['email']} ({RSS_CONFIG['author']})</webMaster>
    <lastBuildDate>{last_build_date}</lastBuildDate>
    <atom:link href="{RSS_CONFIG['link']}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(rss_items)}
  </channel>
</rss>"""
    
    return rss_xml


def main():
    """Main function."""
    print("Generating RSS feed...")
    rss_content = generate_rss_feed()
    
    output_path = Path("feed.xml")
    output_path.write_text(rss_content, encoding="utf-8")
    print(f"RSS feed generated: {output_path}")
    print(f"Found {len(find_blog_posts())} blog posts")


if __name__ == "__main__":
    main()
