# Shopify Analytics Suite Debugging Guide

This guide helps you troubleshoot common issues in the Shopify Analytics Suite app, specifically addressing authentication errors and database problems.

## Common Issues and Solutions

### Authentication Error
If you see "accounts.shopify.com refused to connect" or are stuck in a login loop:

1. **Reset the app state** - Use the reset script to clear corrupted data:
   ```
   node reset-app.js
   ```

2. **Use Developer Mode** - A special route has been added to bypass authentication flows:
   - After starting the app, visit: `/app/dev-mode`
   - Click "Enable Developer Mode" to create a dummy onboarding state and bypass subscription checks

### Database Schema Issues

The app includes routes to help diagnose and fix database problems:

1. **Debug Page** - Visit `/app/debug` to:
   - View your session information
   - See your onboarding state
   - Reset or complete onboarding with a single click
   - View database table counts

2. **Manual Database Reset** - If needed, you can manually run:
   ```
   # Delete the SQLite database file
   del prisma\dev.sqlite
   
   # Regenerate Prisma client and run migrations
   npx prisma generate
   npx prisma migrate reset --force
   ```

## Development Improvements

We've made several improvements to make development easier:

1. **Error Handling** - Better error handling in database connections, onboarding, and authentication logic

2. **Dummy Data** - The app now provides dummy data in development mode, so you can work on the frontend without needing real Shopify data

3. **Fix for Billing Implementation** - Corrected the GraphQL mutation for creating subscriptions

## Monitoring and Troubleshooting

If you encounter issues:

1. **Check the Debug Page** - Visit `/app/debug` first to diagnose problems

2. **Terminal Output** - The app now includes more detailed logging messages to help identify where issues occur

3. **Reset Script** - Use `node reset-app.js` as a first troubleshooting step for most problems

## Moving to Production

For production deployments:

1. Make sure to test with real data by setting `process.env.NODE_ENV` to "production"
2. Remove developer routes or add proper authentication checks before deploying
3. Ensure your subscription plans are properly configured

## Additional Notes

- The app now falls back to dummy data if there are API errors, making it more resilient
- We've fixed database import issues in webhook routes
- Added try/catch blocks in critical areas to prevent complete app failures
