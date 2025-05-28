/**
 * CSP Middleware for Shopify Apps
 * Ensures proper Content Security Policy headers for iframe embedding
 */

export function addCSPHeaders(request, responseHeaders, session = null) {
  // Get shop domain from session or URL params
  let shop = null;
  
  if (session?.shop) {
    shop = session.shop;
  } else {
    const url = new URL(request.url);
    shop = url.searchParams.get("shop");
    
    // Try to get from host parameter (base64 encoded)
    if (!shop) {
      const host = url.searchParams.get("host");
      if (host) {
        try {
          const decoded = atob(host);
          const match = decoded.match(/\/store\/([^\/]+)/);
          if (match) {
            shop = match[1] + '.myshopify.com';
          }
        } catch (e) {
          // Ignore decode errors
        }
      }
    }
  }
  
  if (shop) {
    // Ensure shop domain has the correct format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    // Set enhanced CSP directives that allow script execution in iframe
    const cspValue = 
      `frame-ancestors https://${shopDomain} https://admin.shopify.com https://*.trycloudflare.com; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com https://*.trycloudflare.com; ` +
      `object-src 'none'; ` +
      `connect-src 'self' https://*.shopify.com https://*.myshopify.com https://*.trycloudflare.com; ` +
      `img-src 'self' data: https://*.shopify.com https://*.myshopify.com https://*.trycloudflare.com;`;
    responseHeaders.set("Content-Security-Policy", cspValue);
    
    // Removed X-Frame-Options header as it's deprecated and can conflict with CSP frame-ancestors
  } else {
    // Fallback CSP for development or when shop is unknown
    const cspValue = 
      `frame-ancestors https://*.myshopify.com https://admin.shopify.com https://*.trycloudflare.com; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com https://*.trycloudflare.com; ` +
      `object-src 'none'; ` +
      `connect-src 'self' https://*.shopify.com https://*.myshopify.com https://*.trycloudflare.com; ` +
      `img-src 'self' data: https://*.shopify.com https://*.myshopify.com https://*.trycloudflare.com;`;
    responseHeaders.set("Content-Security-Policy", cspValue);
    // Removed X-Frame-Options header as it's deprecated and can conflict with CSP frame-ancestors
  }
  
  // Always set these security headers
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  return responseHeaders;
}

/**
 * Loader wrapper that automatically adds CSP headers
 */
export function withCSPHeaders(loaderFunction) {
  return async (args) => {
    const { request } = args;
    
    // Call the original loader
    const result = await loaderFunction(args);
    
    // If it's a Response object, add headers
    if (result instanceof Response) {
      addCSPHeaders(request, result.headers);
      return result;
    }
    
    // If it's a regular response, we'll handle headers in the route
    return result;
  };
}
