# Fixing Shopify Iframe Sandbox Script Execution Issues

This document explains the changes made to fix the "Blocked script execution" errors that occur when Shopify embeds your app in a sandboxed iframe.

## The Problem

The error message encountered:
```
Blocked script execution in '[URL]' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
```

This error occurs because:
1. Shopify embeds apps in a sandboxed iframe for security
2. The sandbox attribute may not include `allow-scripts` permission
3. The Content Security Policy (CSP) headers may be too restrictive
4. App Bridge script loading may be incorrect

## Solution Implemented

We made several key changes to fix this issue:

### 1. Fixed App Bridge Loading in `app/root.jsx`

Modified how App Bridge is loaded to avoid preloading warnings and ensure proper initialization:

```jsx
// BEFORE
<link rel="preload" href="https://cdn.shopify.com/shopifycloud/app-bridge.js" as="script" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>

// AFTER
<script 
  src="https://cdn.shopify.com/shopifycloud/app-bridge.js" 
  data-api-key={process.env.SHOPIFY_API_KEY || ''}
  crossOrigin="anonymous"
></script>
```

Key changes:
- Removed the preload link that was causing "preloaded but not used" warnings
- Added `data-api-key` attribute to help with App Bridge initialization
- Added `crossOrigin="anonymous"` for proper CORS handling

### 2. Enhanced CSP Headers in `app/middleware/csp.server.js`

Added more comprehensive CSP directives to allow scripts from the necessary domains:

```javascript
const cspValue = `frame-ancestors https://${shopDomain} https://admin.shopify.com; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com; 
object-src 'none'; 
connect-src 'self' https://*.shopify.com https://*.myshopify.com; 
img-src 'self' data: https://*.shopify.com https://*.myshopify.com;`;
```

Key additions:
- Added `https://*.myshopify.com` to script-src
- Added connect-src directive for API connections
- Added img-src directive for loading images
- Kept 'unsafe-inline' and 'unsafe-eval' which are required for Shopify Admin

### 2. Updated Server Entry Point in `app/entry.server.jsx`

Applied the same enhanced CSP directives at the server level to ensure they're set early in the response lifecycle:

```javascript
responseHeaders.set("Content-Security-Policy", 
  `frame-ancestors https://${shopDomain} https://admin.shopify.com; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com; 
  object-src 'none'; 
  connect-src 'self' https://*.shopify.com https://*.myshopify.com; 
  img-src 'self' data: https://*.shopify.com https://*.myshopify.com;`
);
```

### 3. Fixed Debug CSP Route in `app/routes/app.debug-csp.jsx`

Updated the debug route to use the same comprehensive CSP directives and use SAMEORIGIN consistently:

```javascript
"Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com; 
object-src 'none'; 
connect-src 'self' https://*.shopify.com https://*.myshopify.com; 
img-src 'self' data: https://*.shopify.com https://*.myshopify.com;`,
"X-Frame-Options": "SAMEORIGIN",
```

### 4. Created Utility Script `csp-fix.bat`

Added a batch file to document the changes and provide guidance on testing.

## Ensuring App Bridge Loads Properly

The app already follows these critical best practices for App Bridge:

1. App Bridge script is loaded as the FIRST script in the document:
```html
<head>
  ...
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
```

2. No `defer`, `async`, or `type="module"` attributes on the App Bridge script

3. Security headers are set via HTTP headers, not meta tags

## Testing the Fix

The fixes can be tested using:

1. **New Diagnostic Tool**: Added `/app/sandbox-diagnostics` route that provides comprehensive testing of:
   - App Bridge availability and initialization
   - Script execution in the iframe environment
   - Iframe sandbox attribute detection through feature testing
   - Detailed iframe and browser information for debugging

2. The `/app/debug-csp` route which shows current CSP headers
3. The sandbox-test.html page which tests iframe script execution with different sandbox permissions

## Common Issues Still to Watch For

If you still encounter issues:

1. **Script Loading Order**: Ensure App Bridge is still the first script
2. **Sandboxed Iframes**: Some Shopify contexts might still use restrictive sandbox attributes
3. **App Bridge Initialization**: Even with scripts executing, App Bridge initialization requires a valid Shopify origin

## Additional Resources

- `CSP_SECURITY.md` - Documentation on CSP implementation
- `SANDBOX_ERROR_FIXES.md` - Details on past sandbox fixes
- `sandbox-test.html` and `sandbox-test-frame.html` - Test tools for iframe behavior
