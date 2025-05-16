# PowerShell script to fix import paths in analytics route files
Write-Host "Fixing analytics route import paths..."

# Define the routes directory
$routesDir = "app/routes"

# Fix app.analytics.forecast.jsx
Write-Host "Fixing $routesDir/app.analytics.forecast.jsx..."
(Get-Content "$routesDir/app.analytics.forecast.jsx") -replace 'import \{ authenticate \} from "\.\.\/\.\.\/shopify\.server";', 'import { authenticate } from "../shopify.server";' | Set-Content "$routesDir/app.analytics.forecast.jsx"

# Fix app.analytics.export.jsx
Write-Host "Fixing $routesDir/app.analytics.export.jsx..."
(Get-Content "$routesDir/app.analytics.export.jsx") -replace 'import \{ authenticate \} from "\.\.\/\.\.\/shopify\.server";', 'import { authenticate } from "../shopify.server";' | Set-Content "$routesDir/app.analytics.export.jsx"

# Fix app.analytics.segments.jsx
Write-Host "Fixing $routesDir/app.analytics.segments.jsx..."
(Get-Content "$routesDir/app.analytics.segments.jsx") -replace 'import \{ authenticate \} from "\.\.\/\.\.\/shopify\.server";', 'import { authenticate } from "../shopify.server";' | Set-Content "$routesDir/app.analytics.segments.jsx"

Write-Host "All files fixed!"
Write-Host "Running the dev server..."
npm run dev
