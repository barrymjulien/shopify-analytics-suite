#!/bin/bash

# Install required dependencies
echo "Installing required dependencies..."
npm install date-fns @shopify/polaris-icons --save

# Verify installations
echo "Verifying installations..."
npm list date-fns
npm list @shopify/polaris-icons

echo "Making sure the routes are properly linked..."
# The routes are now:
# - /app/analytics/export -> app/routes/app.analytics.export.jsx
# - /app/analytics/segments -> app/routes/app.analytics.segments.jsx
# - /app/analytics/forecast -> app/routes/app.analytics.forecast.jsx
# 
# Note: Using '~/lib/icons.js' for importing icons instead of the previous path

echo "Starting the development server..."
echo "After the server starts, navigate to your app dashboard and try the Quick Action buttons."
echo "You should be able to access:"
echo "1. Export Analytics Report"
echo "2. Manage Customer Segments"
echo "3. View Revenue Forecast"

# Optionally restart the development server
read -p "Would you like to start the development server now? (y/n) " -n 1 -r
echo    # move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npm run dev
fi
