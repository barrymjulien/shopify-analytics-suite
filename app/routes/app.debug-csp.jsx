import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Get request headers for debugging
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  return json({
    shop,
    url: request.url,
    headers,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      // Manually set CSP header for this route
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com`,
      "X-Frame-Options": `ALLOW-FROM https://${shop}`,
      "X-Debug": "CSP-Test-Route"
    }
  });
}

export default function DebugCSP() {
  const { shop, url, headers, timestamp } = useLoaderData();
  
  return (
    <Page title="CSP Debug">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">CSP Headers Debug</Text>
            <Text>Shop: {shop}</Text>
            <Text>URL: {url}</Text>
            <Text>Timestamp: {timestamp}</Text>
            <Text variant="bodyMd">
              Expected CSP: frame-ancestors https://{shop} https://admin.shopify.com
            </Text>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Request Headers</Text>
            <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
              {JSON.stringify(headers, null, 2)}
            </pre>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">How to Check CSP in Browser</Text>
            <Text>1. Open browser developer tools (F12)</Text>
            <Text>2. Go to Network tab</Text>
            <Text>3. Reload this page</Text>
            <Text>4. Find the response and check Headers tab</Text>
            <Text>5. Look for 'Content-Security-Policy' in Response Headers</Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
