import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
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
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
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
