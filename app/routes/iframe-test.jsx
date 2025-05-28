import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || 'test-shop.myshopify.com';
  
  return json({
    message: "Iframe test successful!",
    shop,
    url: request.url,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com`,
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default function IframeTest() {
  const { message, shop, url, timestamp } = useLoaderData();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>{message}</h1>
      <p><strong>Shop:</strong> {shop}</p>
      <p><strong>URL:</strong> {url}</p>
      <p><strong>Timestamp:</strong> {timestamp}</p>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        <h3>JavaScript Test:</h3>
        <button onClick={() => alert('JavaScript is working!')}>
          Click to test JavaScript
        </button>
        <script>{`
          console.log('JavaScript is executing properly');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded in iframe test');
          });
        `}</script>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>If you can see this page, the basic routing is working</li>
          <li>If the button works, JavaScript is not blocked</li>
          <li>Check the console for any CSP or sandbox errors</li>
        </ol>
      </div>
    </div>
  );
}
