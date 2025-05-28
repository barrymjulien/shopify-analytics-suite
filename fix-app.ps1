Write-Host "Fixing Shopify Analytics Suite..." -ForegroundColor Green

# Fix import paths in analytics routes
$files = @(
    "app/routes/app.analytics.export.jsx",
    "app/routes/app.analytics.forecast.jsx", 
    "app/routes/app.analytics.segments.jsx"
)

foreach ($file in $files) {
    Write-Host "Processing $file..." -ForegroundColor Yellow
    
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # 1. Remove existing react-icons imports like "import { Fi... } from 'react-icons/fi';"
        # Regex: 'import \{ Fi' matches literal "import { Fi"
        # '[^}]+' matches one or more characters that are NOT a closing brace '}' (e.g., "ArrowLeft")
        # '\} from ''react-icons/fi'';' matches literal "} from 'react-icons/fi';"
        $reactIconsImportPattern = 'import \{ Fi[^}]+ \} from ''react-icons/fi'';'
        $content = $content -replace $reactIconsImportPattern, ""
        
        # 2. Add new icons import if not already present
        # Pattern to check if an import from '../lib/icons' already exists.
        # [''"``] matches a single quote, a double quote, or a backtick.
        # \.\./lib/icons matches ../lib/icons
        # The final [''"``] matches the closing quote of the path.
        $libIconsImportPattern = 'import .* from [''"``]\.\./lib/icons[''"``]'
        if ($content -notmatch $libIconsImportPattern) {
            # Pattern for the line "import ... from '../shopify.server';"
            # This captures the entire shopify.server import line into $1.
            $shopifyServerImportPattern = '(import .* from [''"``]\.\./shopify\.server[''"``];)'
            # Replacement string: The captured line ($1), then a newline (`n), then the new import statement.
            $newImportString = "`$1`nimport { ArrowLeftIcon, EditIcon, DeleteIcon, PlusIcon, QuestionIcon } from '../lib/icons';"
            $content = $content -replace $shopifyServerImportPattern, $newImportString
        }
        
        # 3. Replace icon component names (simple string replacements)
        # These are case-sensitive.
        $content = $content -replace "FiArrowLeft", "ArrowLeftIcon"
        $content = $content -replace "FiEdit", "EditIcon"
        $content = $content -replace "FiTrash2", "DeleteIcon"
        $content = $content -replace "FiPlus", "PlusIcon"
        $content = $content -replace "FiHelpCircle", "QuestionIcon"
        
        Set-Content -Path $file -Value $content -Encoding UTF8 # Specify UTF8 encoding
        Write-Host "Fixed $file" -ForegroundColor Green
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nAll fixes applied by script (manual changes were already made)!" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start the development server" -ForegroundColor Cyan
