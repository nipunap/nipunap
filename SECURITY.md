# Security Policy

## Security Features

### XSS Protection
- All user-generated content is sanitized with DOMPurify
- Markdown is parsed with marked.js and then sanitized
- No `eval()` or `Function()` constructors
- All HTML escaping for dynamic content

### Content Security Policy
The site implements a strict CSP to prevent XSS attacks:

- `default-src 'self'` - Only load resources from same origin by default
- `script-src` - Scripts from self and trusted CDNs only
- `style-src` - Styles from self and Google Fonts
- `img-src` - Images from self and HTTPS sources
- `frame-ancestors 'none'` - Prevent clickjacking
- `base-uri 'self'` - Prevent base tag injection

### Subresource Integrity (SRI)
All external scripts and stylesheets use SRI hashes to ensure they haven't been tampered with.

### HTTP Security Headers
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enable browser XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information
- `Permissions-Policy` - Disable unnecessary browser features

### HTTPS Only
The site should always be served over HTTPS. Enable HSTS:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Server Configuration

### Netlify/Cloudflare Pages
Headers are automatically applied from `_headers` file.

### Nginx
Add to your nginx configuration:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Apache
Add to `.htaccess`:

```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;"
Header always set X-Frame-Options "DENY"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

## Reporting Vulnerabilities

If you discover a security vulnerability, please email: security@example.com

Please do not open public issues for security vulnerabilities.

## Security Checklist

- [x] XSS protection with DOMPurify
- [x] CSP headers configured
- [x] SRI for external resources
- [x] Security headers implemented
- [x] HTTPS enforcement
- [ ] Regular dependency updates
- [ ] Security audits (npm audit)
- [ ] Penetration testing

## Dependencies

Regularly update dependencies to patch security vulnerabilities:

```bash
npm audit
npm update
```

## Best Practices

1. **Never trust user input** - Always sanitize and validate
2. **Use HTTPS** - Always serve over encrypted connection
3. **Keep dependencies updated** - Regular security patches
4. **Minimize external dependencies** - Reduce attack surface
5. **Monitor for vulnerabilities** - Use automated scanning tools
6. **Principle of least privilege** - Only grant necessary permissions
7. **Defense in depth** - Multiple layers of security

## Security Monitoring

Consider implementing:
- Error tracking (Sentry)
- Uptime monitoring
- Security scanning (Snyk, GitHub Dependabot)
- Log analysis
- Rate limiting
- DDOS protection (Cloudflare)

