/**
 * Reset App Database and State
 * 
 * This script will:
 * 1. Delete the SQLite database file
 * 2. Regenerate Prisma client and run migrations
 * 3. Clean up any temporary files/caches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Starting app reset process...');

// Delete the SQLite database file if it exists
const dbPath = path.join(__dirname, 'prisma', 'dev.sqlite');
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Deleted SQLite database file');
  } else {
    console.log('ℹ️ No database file found to delete');
  }
} catch (error) {
  console.error('❌ Error deleting database file:', error.message);
}

// Run Prisma commands to regenerate client and reset database
try {
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🔄 Running Prisma migrations...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
  
  console.log('✅ Database reset complete');
} catch (error) {
  console.error('❌ Error running Prisma commands:', error.message);
  process.exit(1);
}

console.log(`
✅ App reset complete! Next steps:

1. Start your app with:
   npm run dev

2. Visit the debug page to set up your app:
   https://[your-store].myshopify.com/apps/[your-app-handle]/debug

3. Use the 'Complete Onboarding' button to bypass the onboarding flow
   or visit the dev-mode page:
   https://[your-store].myshopify.com/apps/[your-app-handle]/dev-mode
`);
