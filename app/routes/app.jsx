import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { json } from "@remix-run/node";
import { boundary } from "@shopify/shopify-app-remix/server";
import { addCSPHeaders } from "../middleware/csp.server";
import shopify, { authenticate } from "../shopify.server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // Get the authenticated session to pass to CSP headers
  const session = await shopify.sessionStorage.findSessionsByShop("admin");
  
  // Create headers for the response
  const headers = new Headers();
  
  // Add CSP headers using session info if available
  addCSPHeaders(request, headers, session[0]);

  return json({ 
    apiKey: process.env.SHOPIFY_API_KEY || "" 
  }, { headers });
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/analytics/export">
          Export Analytics
        </Link>
        <Link to="/app/analytics/segments">
          Customer Segments
        </Link>
        <Link to="/app/analytics/forecast">
          Revenue Forecast
        </Link>
        <Link to="/app/additional">Additional page</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  const headers = boundary.headers(headersArgs);
  const { request } = headersArgs.loaderContext;
  
  // Apply CSP headers to all app routes
  if (request && headers) {
    addCSPHeaders(request, headers);
  }
  
  return headers;
};
