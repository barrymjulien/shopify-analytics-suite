import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session?.shop || null
  };
};

// Add headers function to set CSP
export const headers = ({ loaderHeaders, parentHeaders, actionHeaders }) => {
  return {
    ...boundary.headers({ loaderHeaders, parentHeaders, actionHeaders }),
    // Ensure CSP headers are included
    "X-Frame-Options": loaderHeaders.get("X-Frame-Options") || "",
    "Content-Security-Policy": loaderHeaders.get("Content-Security-Policy") || "",
  };
};

export default function App() {
  const { apiKey, shop } = useLoaderData();

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
