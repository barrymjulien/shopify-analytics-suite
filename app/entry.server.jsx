import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  // Extract shop domain for CSP
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || url.searchParams.get("hmac") ? 
    getShopFromRequest(request) : null;
  
  // Set critical headers before adding document headers
  if (shop) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    responseHeaders.set("Content-Security-Policy", 
      `frame-ancestors https://${shopDomain} https://admin.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com; object-src 'none';`
    );
    responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
  } else {
    responseHeaders.set("Content-Security-Policy", 
      `frame-ancestors https://*.myshopify.com https://admin.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com; object-src 'none';`
    );
    responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
  }
  
  // Additional headers to prevent sandboxing issues
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  addDocumentResponseHeaders(request, responseHeaders);
  
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}

// Helper function to extract shop from request
function getShopFromRequest(request) {
  const url = new URL(request.url);
  
  // Try to get shop from URL params
  let shop = url.searchParams.get("shop");
  if (shop) return shop;
  
  // Try to get from host parameter (base64 encoded)
  const host = url.searchParams.get("host");
  if (host) {
    try {
      const decoded = atob(host);
      const match = decoded.match(/\/store\/([^\/]+)/);
      if (match) {
        return match[1] + '.myshopify.com';
      }
    } catch (e) {
      // Ignore decode errors
    }
  }
  
  // Fallback: extract from session or other means
  return 'innovative-app-builders-development-store.myshopify.com'; // Your specific shop as fallback
}
