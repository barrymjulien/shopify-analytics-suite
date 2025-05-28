# Fixing Shopify Iframe Issues: Script Execution & App Bridge

This document explains how to fix two related but distinct issues:

1. **Script Execution Error**:
```
Blocked script execution in '<URL>' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
```

2. **App Bridge Initialization Issues**:
```
App Bridge not detected
```

## Problem Explanation

When Shopify embeds your app in the Shopify Admin, it uses an iframe with a `sandbox` attribute. This is a security feature that restricts what the embedded content can do. The specific error occurs when:

1. The iframe is sandboxed without the `allow-scripts` permission
2. The App Bridge script is not loaded correctly
3. There are CSP (Content Security Policy) issues

## Root Causes Found

We identified the following specific issues in our Shopify app:

1. **App Bridge Script Loading Issues**:
   - The App Bridge script had a `defer` attribute, which delayed loading
   - The script was not the first script to load, as required by Shopify
   - This caused the error: `The script tag loading App Bridge has 'defer'`

2. **Incorrect Meta Tag Usage**:
   - CSP and X-Frame-Options were incorrectly set via meta tags
   - These security policies must be set via HTTP headers, not meta tags
   - This caused the error: `X-Frame-Options may only be set via an HTTP header`

3. **Script Execution Order**:
   - App Bridge wasn't positioned as the first script to load
   - Shopify requires App Bridge to be the first script executed

## Solution Implemented

We made the following changes to fix these issues:

### 1. Updated `app/root.jsx`:

```jsx
// BEFORE
<ScrollRestoration />
<Scripts />
        
{/* Ensure App Bridge loads properly */}
<script
  src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
  defer
></script>

// AFTER
<head>
  ...
  <Meta />
  <Links />
  
  {/* App Bridge must be the FIRST script loaded */}
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  ...
  <ScrollRestoration />
  <Scripts />
</body>
```

### 2. Removed incorrect meta tags:

```jsx
// REMOVED these tags
<meta httpEquiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com" />
<meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
```

### 3. Fixed preload configuration:

```jsx
// BEFORE
<link
  rel="preload"
  href="https://cdn.shopify.com/shopifycloud/app-bridge.js"
  as="script"
  crossOrigin="anonymous"
/>

// AFTER
<link
  rel="preload"
  href="https://cdn.shopify.com/shopifycloud/app-bridge.js"
  as="script"
/>
```

## Testing the Fix

We created two testing tools:

1. **A standalone HTML test page (`sandbox-test.html` and `sandbox-test-frame.html`)**:
   - This allows testing sandbox behavior without needing the development server
   - Tests iframe script execution with and without the `allow-scripts` permission
   - Demonstrates proper App Bridge loading

2. **A Shopify app route (`app/routes/app.sandbox-test.jsx`)**:
   - Tests script execution directly within the Shopify Admin embedded app context
   - Verifies JavaScript functionality works in the production environment

## Key Lessons Learned

1. App Bridge must be the **first** script loaded in Shopify embedded apps
2. Never use `defer`, `async` or `type=module` on the App Bridge script
3. Security headers like CSP and X-Frame-Options must be set via HTTP headers, not meta tags
4. Sandboxed iframes require the `allow-scripts` permission to execute JavaScript
5. **Even with correct script loading, App Bridge will only fully initialize in the Shopify Admin context**

## Understanding App Bridge Initialization vs. Script Execution

There are two separate but related issues:

1. **Script Execution** - Can JavaScript run at all in the iframe?
   - Fixed by proper sandbox permissions and script loading order
   - Tests will show if basic JavaScript functions work

2. **App Bridge Initialization** - Can App Bridge connect to Shopify?
   - Requires a valid Shopify origin (myshopify.com domain)
   - Requires proper API key initialization
   - Requires authentication context
   - Will show as "App Bridge not detected" when testing outside Shopify Admin

Just because JavaScript executes properly doesn't mean App Bridge will initialize - it requires the Shopify Admin context.

## Troubleshooting Similar Issues

If you encounter similar iframe issues:

1. First determine if it's a script execution issue or an App Bridge initialization issue
2. For script execution: check that App Bridge is loaded first without `defer`
3. Ensure security policies are set via HTTP headers
4. For App Bridge initialization: test in the actual Shopify Admin environment
5. Use the diagnostic tools we created (`sandbox-test.html` and `app-bridge-test.html`) to understand the problem

By implementing these fixes, your Shopify app should properly execute scripts within the sandboxed iframe environment, with App Bridge fully initializing when run in the Shopify Admin.
