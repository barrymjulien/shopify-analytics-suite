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
  }
  
  if (shop) {
    // Ensure shop domain has the correct format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    // Set the frame-ancestors directive for the specific shop
    const cspValue = `frame-ancestors https://${shopDomain} https://admin.shopify.com`;
    responseHeaders.set("Content-Security-Policy", cspValue);
    
    // Additional security headers
    responseHeaders.set("X-Frame-Options", `ALLOW-FROM https://${shopDomain}`);
  } else {
    // Fallback CSP for development or when shop is unknown
    const cspValue = "frame-ancestors https://*.myshopify.com https://admin.shopify.com";
    responseHeaders.set("Content-Security-Policy", cspValue);
  }
  
  // Always set these security headers
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "origin-when-cross-origin");
  
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
