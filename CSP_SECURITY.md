# Content Security Policy (CSP) Implementation

This document outlines the Content Security Policy implementation in the Shopify Analytics Suite application to improve security and prevent common web vulnerabilities.

## Overview

Content Security Policy (CSP) is a security feature that helps prevent cross-site scripting (XSS), clickjacking, and other code injection attacks. Our implementation ensures that:

1. The app can only be embedded within legitimate Shopify admin interfaces
2. Resources are loaded only from trusted sources
3. Enhanced protection against clickjacking attacks

## Implementation Details

### CSP Middleware

We've implemented a CSP middleware system in `app/middleware/csp.server.js` that:

- Automatically detects the current shop context
- Applies appropriate CSP headers with shop-specific frame-ancestors directives
- Includes fallback mechanisms for unknown shop contexts
- Provides a utility function for wrapping loaders to ensure CSP headers are applied consistently

### Key Files and Components

1. **CSP Middleware** (`app/middleware/csp.server.js`):
   - Core implementation of CSP header management
   - Provides `addCSPHeaders()` and `withCSPHeaders()` utilities

2. **Shopify Server Extensions** (`app/shopify.server.js`):
   - Enhanced `addDocumentResponseHeaders` function to include CSP headers
   - Integrates with Shopify's authentication flow

3. **Root Layout** (`app/root.jsx`):
   - Applies CSP headers at the application root level
   - Ensures all routes inherit basic security headers

4. **App Layout** (`app/routes/app.jsx`):
   - Adds Shopify-specific CSP headers for authenticated routes
   - Works with Shopify's boundary system

## CSP Header Details

The following security headers are applied:

- **Content-Security-Policy**: Controls which resources can be loaded and from where
  - `frame-ancestors`: Restricts which domains can embed our app (specific shop domain and admin.shopify.com)

- **X-Frame-Options**: Legacy header for browsers that don't support CSP frame-ancestors
  - Set to `ALLOW-FROM https://{shopDomain}` for specific shops

- **X-Content-Type-Options**: Prevents MIME type sniffing
  - Set to `nosniff`

- **Referrer-Policy**: Controls how much referrer information is included with requests
  - Set to `origin-when-cross-origin`

## Usage in Routes

For route handlers that need custom CSP implementation:

```javascript
import { withCSPHeaders } from "../middleware/csp.server";

// Wrap your loader with the CSP utility
export const loader = withCSPHeaders(async ({ request }) => {
  // Your loader logic here
  return json(data);
});
```

## Security Considerations

- The CSP implementation is critical for Shopify embedded apps to function properly
- These headers help protect against clickjacking, XSS, and other common web vulnerabilities
- Changes to this implementation should be carefully tested in both development and production environments
