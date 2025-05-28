@echo off
echo ====================================================
echo Updating GitHub with Shopify CSP Fixes
echo ====================================================
echo.
echo This script will commit and push the following changes to GitHub:
echo  - Modified app/root.jsx
echo  - Enhanced app/middleware/csp.server.js
echo  - Updated app/entry.server.jsx
echo  - Fixed app/routes/app.debug-csp.jsx
echo  - Added app/routes/app.sandbox-diagnostics.jsx
echo  - Added documentation in SANDBOX_CSP_FIXES.md
echo  - Updated documentation in SANDBOX_ERROR_FIXES.md
echo  - Updated utility scripts (csp-fix.bat)
echo.
echo ====================================================
echo.

echo Checking Git status...
git status

echo.
echo Adding modified files...
git add app/root.jsx
git add app/middleware/csp.server.js
git add app/entry.server.jsx
git add app/routes/app.debug-csp.jsx
git add app/routes/app.jsx
git add app/routes/app.sandbox-diagnostics.jsx
git add SANDBOX_CSP_FIXES.md
git add SANDBOX_ERROR_FIXES.md
git add csp-fix.bat
git add update-github.bat

echo.
echo Creating commit...
git commit -m "Fix Shopify iframe sandbox script execution issues and App Bridge warnings"

echo.
echo Pushing to GitHub...
git push

echo.
echo ====================================================
echo GitHub update complete!
echo ====================================================
