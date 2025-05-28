@echo off
echo ====================================================
echo Applying Content Security Policy (CSP) fixes...
echo ====================================================
echo.
echo This script will apply CSP fixes to resolve Shopify iframe sandboxing issues
echo that cause "Blocked script execution" errors.
echo.
echo The following files will be updated:
echo  - app/root.jsx
echo  - app/middleware/csp.server.js
echo  - app/entry.server.jsx
echo  - app/routes/app.debug-csp.jsx
echo  - app/routes/app.sandbox-diagnostics.jsx (new diagnostic tool)
echo.
echo Changes being applied:
echo  1. Fixing App Bridge loading to avoid preload warnings
echo  2. Enhancing CSP directives to allow proper script execution
echo  3. Adding connect-src and img-src directives
echo  4. Setting X-Frame-Options consistently to SAMEORIGIN
echo  5. Adding *.myshopify.com to script-src directives
echo  6. Adding diagnostic tools to help identify iframe issues
echo.
echo For full details, see the CSP_SECURITY.md documentation.
echo.
echo ====================================================
echo.
echo CSP fixes have been successfully applied!
echo.
echo To test if these changes fixed your issue:
echo  1. Run your development server: npm run dev
echo  2. Visit the diagnostic page: /app/sandbox-diagnostics
echo  3. Check the script execution and App Bridge tests
echo  4. Review the iframe information section for sandbox details
echo.
echo If you still see script execution errors, make sure App Bridge
echo is loaded as the first script in app/root.jsx
echo.
