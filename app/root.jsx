import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { addCSPHeaders } from "./middleware/csp.server";
import ErrorBoundary from "./components/ErrorBoundary";

export async function loader({ request }) {
  // Create default headers
  const headers = new Headers();
  
  // Apply CSP headers
  addCSPHeaders(request, headers);
  
  return json({}, { headers });
}

function AppContent() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        
        {/* Critical meta tags for iframe embedding */}
        <meta httpEquiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        
        {/* Shopify App Bridge preload */}
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="preload"
          href="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          as="script"
          crossOrigin="anonymous"
        />
        
        {/* Shopify fonts */}
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        
        <Meta />
        <Links />
      </head>
      <body>
        {/* Add data attributes to help with iframe detection */}
        <div id="root" data-embedded-app="true">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        
        {/* Ensure App Bridge loads properly */}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          defer
        ></script>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ErrorBoundary componentName="Application Root">
      <AppContent />
    </ErrorBoundary>
  );
}
