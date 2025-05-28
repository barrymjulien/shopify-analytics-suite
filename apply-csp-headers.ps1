# Apply CSP Headers PowerShell Script
# This script helps to apply consistent CSP headers to route files in the Shopify Analytics Suite app

Write-Host "=== CSP Headers Implementation Tool ===" -ForegroundColor Green
Write-Host "This script will help you apply Content Security Policy headers to route files."

# Define the app routes directory
$routesDir = ".\app\routes"

# Get all route files
$routeFiles = Get-ChildItem -Path $routesDir -Filter "*.jsx" -Recurse

# Check if any route files were found
if ($routeFiles.Count -eq 0) {
    Write-Host "No route files found in $routesDir" -ForegroundColor Red
    exit
}

Write-Host "Found $($routeFiles.Count) route files in $routesDir" -ForegroundColor Cyan

# Function to check if a file already has CSP headers implementation
function Test-HasCSPHeaders {
    param (
        [string]$content
    )
    
    # Check for common CSP implementation patterns
    return ($content -match "Content-Security-Policy" -or $content -match "export const headers")
}

# Function to add headers export function
function Add-HeadersExport {
    param (
        [string]$content
    )
    
    # Create the headers function
    $headersFunction = @"

export const headers = ({ loaderHeaders }) => {
  return {
    // Preserve any headers set by the loader
    "Content-Security-Policy": loaderHeaders.get("Content-Security-Policy") || "",
    "X-Frame-Options": loaderHeaders.get("X-Frame-Options") || "",
    "X-Content-Type-Options": "nosniff",
  };
};
"@

    # Find the right spot to insert after imports and before first function
    if ($content -match "import.*from.*;?\r?\n\r?\n") {
        # Add after imports
        $afterImports = $matches[0]
        $newContent = $content -replace [regex]::Escape($afterImports), "$afterImports$headersFunction"
        return $newContent
    }
    else {
        # Fallback to adding after last import
        $importMatches = [regex]::Matches($content, "import.*from.*;?")
        if ($importMatches.Count -gt 0) {
            $lastImport = $importMatches[$importMatches.Count - 1].Value
            $lastImportPos = $content.LastIndexOf($lastImport) + $lastImport.Length
            
            $newContent = $content.Substring(0, $lastImportPos) + "`n`n$headersFunction" + $content.Substring($lastImportPos)
            return $newContent
        }
    }
    
    # If we can't find a good spot, just add to the beginning
    return "$headersFunction`n`n$content"
}

# Function to add CSP headers to a loader function
function Add-CSPToLoader {
    param (
        [string]$content
    )
    
    # Check for loader function with authenticate.admin
    if ($content -match "export (async )?function loader\s*\(\s*\{\s*request\s*\}\s*\)\s*\{\s*.*?authenticate\.admin\(request\)") {
        
        # Add after authenticate.admin with session
        $sessionPattern = "const \{.*?session.*?\}\s*=\s*await authenticate\.admin\(request\);.*?(\r?\n)"
        $responseHeadersCode = @"
    // Create response headers
    const responseHeaders = new Headers();
    
    // Set CSP headers
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    responseHeaders.set("Content-Security-Policy", `frame-ancestors https://${shopDomain} https://admin.shopify.com`);
    responseHeaders.set("X-Frame-Options", `ALLOW-FROM https://${shopDomain}`);
    responseHeaders.set("X-Content-Type-Options", "nosniff");

"@
        
        if ($content -match $sessionPattern) {
            $newContent = $content -replace $sessionPattern, "$&$responseHeadersCode"
            
            # Now update any json or redirect returns to include headers
            $newContent = $newContent -replace "return json\((.*?)\);", "return json($1, { headers: responseHeaders });"
            $newContent = $newContent -replace "return redirect\((.*?)\);", "return redirect($1, { headers: responseHeaders });"
            
            return $newContent
        }
    }
    
    # If we can't modify the loader reliably, return original content
    return $content
}

# Process each route file
$filesToModify = @()
$modifiedFiles = @()
$skippedFiles = @()

foreach ($file in $routeFiles) {
    $filePath = $file.FullName
    $fileName = $file.Name
    
    # Skip the CSP debug file which already has specific implementation
    if ($fileName -eq "app.debug-csp.jsx") {
        $skippedFiles += $fileName
        continue
    }
    
    # Read file content
    $content = Get-Content -Path $filePath -Raw
    
    # Check if the file already has CSP headers
    $hasCSP = Test-HasCSPHeaders -content $content
    
    if ($hasCSP) {
        Write-Host "[$fileName] Already has CSP implementation" -ForegroundColor Yellow
        $skippedFiles += $fileName
        continue
    }
    
    # Check if the file has a loader function that can be modified
    if ($content -match "export (async )?function loader" -or $content -match "export const loader") {
        $filesToModify += @{
            FileName = $fileName
            FilePath = $filePath
            Content = $content
        }
    }
    else {
        Write-Host "[$fileName] No loader function found, adding headers export only" -ForegroundColor Yellow
        
        # Add headers export function
        $newContent = Add-HeadersExport -content $content
        
        # Confirm changes
        Write-Host "Would modify: $fileName" -ForegroundColor Cyan
        
        # Ask for confirmation
        $confirm = Read-Host "Apply CSP headers to $fileName? (Y/n)"
        if ($confirm -eq "" -or $confirm -eq "y" -or $confirm -eq "Y") {
            Set-Content -Path $filePath -Value $newContent
            Write-Host "Applied headers export to $fileName" -ForegroundColor Green
            $modifiedFiles += $fileName
        }
        else {
            Write-Host "Skipped $fileName" -ForegroundColor Yellow
            $skippedFiles += $fileName
        }
    }
}

# Process files with loader functions
foreach ($fileInfo in $filesToModify) {
    $fileName = $fileInfo.FileName
    $filePath = $fileInfo.FilePath
    $content = $fileInfo.Content
    
    Write-Host "`nProcessing $fileName with loader function..." -ForegroundColor Cyan
    
    # Add headers export function if needed
    $newContent = Add-HeadersExport -content $content
    
    # Add CSP headers to loader function
    $newContent = Add-CSPToLoader -content $newContent
    
    # Check if content was actually modified
    if ($newContent -eq $content) {
        Write-Host "Could not automatically modify loader in $fileName" -ForegroundColor Yellow
        $skippedFiles += $fileName
        continue
    }
    
    # Ask for confirmation
    Write-Host "Will add CSP headers to loader function in $fileName" -ForegroundColor Cyan
    $confirm = Read-Host "Apply these changes? (Y/n)"
    
    if ($confirm -eq "" -or $confirm -eq "y" -or $confirm -eq "Y") {
        Set-Content -Path $filePath -Value $newContent
        Write-Host "Applied CSP headers to $fileName" -ForegroundColor Green
        $modifiedFiles += $fileName
    }
    else {
        Write-Host "Skipped $fileName" -ForegroundColor Yellow
        $skippedFiles += $fileName
    }
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Modified $($modifiedFiles.Count) files:" -ForegroundColor Cyan
foreach ($file in $modifiedFiles) {
    Write-Host "  - $file" -ForegroundColor Green
}

Write-Host "`nSkipped $($skippedFiles.Count) files:" -ForegroundColor Cyan
foreach ($file in $skippedFiles) {
    Write-Host "  - $file" -ForegroundColor Yellow
}

Write-Host "`nDon't forget to:" -ForegroundColor Cyan
Write-Host "1. Test your application to ensure CSP headers are working correctly" -ForegroundColor White
Write-Host "2. Check the CSP debug page (/app/debug-csp) to verify header implementation" -ForegroundColor White
Write-Host "3. Commit your changes with: git add . && git commit -m 'Apply CSP headers to route files'" -ForegroundColor White

Write-Host "`nComplete! CSP headers have been applied to your route files." -ForegroundColor Green
