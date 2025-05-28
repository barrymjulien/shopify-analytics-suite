import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    // unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;

// Enhanced addDocumentResponseHeaders that includes CSP headers
export function addDocumentResponseHeaders(request, responseHeaders) {
  // Call the original function first
  shopify.addDocumentResponseHeaders(request, responseHeaders);
  
  // Extract shop domain from request
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (shop) {
    // Set Content Security Policy for iframe protection
    const cspValue = `frame-ancestors https://${shop} https://admin.shopify.com`;
    responseHeaders.set("Content-Security-Policy", cspValue);
    
    // Additional security headers for embedded apps
    responseHeaders.set("X-Frame-Options", `ALLOW-FROM https://${shop}`);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("Referrer-Policy", "origin-when-cross-origin");
  } else {
    // Fallback CSP for when shop is not available
    responseHeaders.set("Content-Security-Policy", "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
  }
}

export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
