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
        
        {/* Shopify App Bridge preconnect */}
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        
        {/* Shopify fonts */}
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        
        <Meta />
        <Links />
        
        {/* App Bridge must be the FIRST script loaded - no preload to avoid warnings */}
        <script 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js" 
          data-api-key={process.env.SHOPIFY_API_KEY || ''}
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>
        {/* Add data attributes to help with iframe detection */}
        <div id="root" data-embedded-app="true">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
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
