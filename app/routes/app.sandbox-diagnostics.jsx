import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, Button, Banner, Layout } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import ErrorBoundary from "../components/ErrorBoundary";

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
    timestamp: new Date().toISOString(),
    apiKey: process.env.SHOPIFY_API_KEY || "[not set]"
  }, {
    headers: {
      // Set enhanced CSP headers for this diagnostic route
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.myshopify.com; object-src 'none'; connect-src 'self' https://*.shopify.com https://*.myshopify.com; img-src 'self' data: https://*.shopify.com https://*.myshopify.com;`,
      "X-Frame-Options": "SAMEORIGIN",
      "X-Debug": "Sandbox-Diagnostics-Route"
    }
  });
}

function SandboxDiagnosticsContent() {
  const { shop, url, headers, timestamp, apiKey } = useLoaderData();
  
  return (
    <Page title="Sandbox & App Bridge Diagnostics">
      <Layout>
        <Layout.Section>
          <Banner title="Diagnostics Page" status="info">
            <p>This page helps diagnose sandbox and App Bridge issues in Shopify embedded apps.</p>
            <p>Current timestamp: {timestamp}</p>
          </Banner>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">App Bridge Detection</Text>
              <div id="appBridgeStatus">Checking App Bridge status...</div>
              <Button id="checkAppBridge" primary>Check App Bridge</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Script Execution Test</Text>
              <div id="scriptStatus">Checking script execution...</div>
              <Button id="testScript" primary>Run Test</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Embedding Details</Text>
              <Text>Shop: {shop}</Text>
              <Text>API Key: {apiKey}</Text>
              <Text>URL: {url}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Current Headers</Text>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
                {JSON.stringify(headers, null, 2)}
              </pre>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Iframe Information</Text>
              <div id="iframeInfo">Gathering iframe information...</div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {/* Diagnostic scripts */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
          // Check basic script execution
          document.getElementById('scriptStatus').innerHTML = 
            '<span style="color: green; font-weight: bold;">✓ JavaScript is executing properly</span>';
          
          // Log diagnostics to console
          console.log('Sandbox diagnostics page loaded at ' + new Date().toISOString());
          console.log('URL:', window.location.href);
          console.log('Referrer:', document.referrer);
          
          // Add event listeners
          document.getElementById('testScript').addEventListener('click', function() {
            document.getElementById('scriptStatus').innerHTML += 
              '<br><span style="color: green;">✓ Button click handled successfully at ' + 
              new Date().toISOString() + '</span>';
          });
          
          document.getElementById('checkAppBridge').addEventListener('click', function() {
            try {
              const statusElement = document.getElementById('appBridgeStatus');
              
              // Check if App Bridge is available
              if (window.shopify) {
                statusElement.innerHTML = '<span style="color: green; font-weight: bold;">✓ Shopify object detected</span>';
                
                // Try to initialize App Bridge
                try {
                  const config = {
                    apiKey: "${apiKey}",
                    host: window.location.host,
                    forceRedirect: true
                  };
                  console.log('Attempting to initialize App Bridge with:', config);
                  
                  if (window.shopify.createApp) {
                    const app = window.shopify.createApp(config);
                    statusElement.innerHTML += '<br><span style="color: green;">✓ App Bridge initialized successfully</span>';
                    console.log('App Bridge initialized:', app);
                  } else {
                    statusElement.innerHTML += '<br><span style="color: orange;">⚠ shopify object exists but createApp method not found</span>';
                    console.warn('shopify object exists but createApp method not found');
                  }
                } catch (initError) {
                  statusElement.innerHTML += '<br><span style="color: red;">✗ Error initializing App Bridge: ' + 
                    initError.message + '</span>';
                  console.error('Error initializing App Bridge:', initError);
                }
              } else {
                statusElement.innerHTML = '<span style="color: red; font-weight: bold;">✗ App Bridge not detected</span>';
                console.error('App Bridge not detected');
              }
              
              // Add debugging info
              statusElement.innerHTML += '<br><br><strong>Debug Info:</strong><br>';
              statusElement.innerHTML += '<code>window.shopify: ' + (window.shopify ? 'exists' : 'undefined') + '</code><br>';
              statusElement.innerHTML += '<code>shopify.createApp: ' + 
                (window.shopify && window.shopify.createApp ? 'exists' : 'undefined') + '</code><br>';
              
              // Check if we're in an iframe
              statusElement.innerHTML += '<code>In iframe: ' + (window !== window.top) + '</code><br>';
              
              // Check for sandbox attribute
              try {
                if (window !== window.top) {
                  statusElement.innerHTML += '<code>Detecting sandbox attributes...</code>';
                  // We can't directly access parent frames due to security, 
                  // but we can infer based on script execution
                  statusElement.innerHTML += '<br><code>Scripts can execute: true</code>';
                }
              } catch (e) {
                statusElement.innerHTML += '<br><code>Error checking frame: ' + e.message + '</code>';
              }
            } catch (e) {
              document.getElementById('appBridgeStatus').innerHTML = 
                '<span style="color: red;">✗ Error checking App Bridge: ' + e.message + '</span>';
              console.error('Error in App Bridge check:', e);
            }
          });
          
          // Gather iframe information
          try {
            const infoElement = document.getElementById('iframeInfo');
            
            if (window !== window.top) {
              infoElement.innerHTML = '<span style="color: blue;">ℹ This page is running inside an iframe</span>';
              
              // Check if we have access to parent
              try {
                window.top.location.href;
                infoElement.innerHTML += '<br><span style="color: green;">✓ Same-origin iframe (has parent access)</span>';
              } catch (e) {
                infoElement.innerHTML += '<br><span style="color: orange;">⚠ Cross-origin iframe (no parent access)</span>';
              }
              
              // Try to detect sandbox status by feature testing
              infoElement.innerHTML += '<br><strong>Sandbox Feature Tests:</strong>';
              infoElement.innerHTML += '<br>• Scripts: <span style="color: green;">Enabled</span> (this code is running)';
              
              // Check for sessionStorage access (blocked in sandboxed iframes without allow-same-origin)
              try {
                window.sessionStorage.setItem('test', 'test');
                window.sessionStorage.removeItem('test');
                infoElement.innerHTML += '<br>• Same Origin: <span style="color: green;">Enabled</span> (sessionStorage works)';
              } catch (e) {
                infoElement.innerHTML += '<br>• Same Origin: <span style="color: red;">Disabled</span> (sessionStorage blocked)';
              }
              
              // Check for popups (blocked in sandboxed iframes without allow-popups)
              infoElement.innerHTML += '<br>• Popups: <span id="popupTest">Not tested</span>';
              infoElement.innerHTML += ' <button id="testPopup" style="font-size: 11px; padding: 2px 5px;">Test</button>';
              
              document.getElementById('testPopup').addEventListener('click', function() {
                try {
                  const popup = window.open('about:blank', 'test', 'width=1,height=1');
                  if (popup) {
                    popup.close();
                    document.getElementById('popupTest').innerHTML = 
                      '<span style="color: green;">Enabled</span>';
                  } else {
                    document.getElementById('popupTest').innerHTML = 
                      '<span style="color: red;">Disabled or blocked by browser</span>';
                  }
                } catch (e) {
                  document.getElementById('popupTest').innerHTML = 
                    '<span style="color: red;">Disabled (' + e.message + ')</span>';
                }
              });
            } else {
              infoElement.innerHTML = '<span style="color: blue;">ℹ This page is NOT running in an iframe</span>';
            }
            
            // Add browser details
            infoElement.innerHTML += '<br><br><strong>Browser Information:</strong><br>';
            infoElement.innerHTML += navigator.userAgent;
          } catch (e) {
            document.getElementById('iframeInfo').innerHTML = 
              '<span style="color: red;">Error gathering iframe information: ' + e.message + '</span>';
          }
        });
      `}} />
    </Page>
  );
}

export default function SandboxDiagnostics() {
  return (
    <ErrorBoundary componentName="Sandbox Diagnostics">
      <SandboxDiagnosticsContent />
    </ErrorBoundary>
  );
}
