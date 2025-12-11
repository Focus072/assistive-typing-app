#!/usr/bin/env node

/**
 * Setup verification script
 * Checks if all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
  'INNGEST_BASE_URL',
];

const envFile = path.join(process.cwd(), '.env.local');
const envExampleFile = path.join(process.cwd(), '.env.example');
const envTemplateFile = path.join(process.cwd(), 'env.template');

console.log('🔍 Checking setup...\n');

// Check if .env.local exists
if (!fs.existsSync(envFile)) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Creating .env.local from template...\n');
  
  if (fs.existsSync(envExampleFile)) {
    fs.copyFileSync(envExampleFile, envFile);
    console.log('✅ Created .env.local from .env.example');
    console.log('⚠️  Please update the values in .env.local\n');
  } else if (fs.existsSync(envTemplateFile)) {
    fs.copyFileSync(envTemplateFile, envFile);
    console.log('✅ Created .env.local from env.template');
    console.log('⚠️  Please update the values in .env.local\n');
  } else {
    console.log('❌ No template found. Please create .env.local manually.');
    console.log('📖 See SETUP.md for instructions.\n');
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: envFile });

let allSet = true;
const missing = [];

console.log('Checking environment variables:\n');

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value || value.includes('your-') || value.includes('change-this')) {
    console.log(`❌ ${varName}: Not set or using placeholder`);
    missing.push(varName);
    allSet = false;
  } else {
    // Mask sensitive values
    const displayValue = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
      ? '***' + value.slice(-4)
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n' + '='.repeat(50) + '\n');

if (allSet) {
  console.log('✅ All environment variables are set!');
  console.log('\nNext steps:');
  console.log('1. Run: npx prisma generate');
  console.log('2. Run: npx prisma db push');
  console.log('3. Run: npm run dev');
} else {
  console.log('❌ Some environment variables are missing or using placeholders.');
  console.log('\nMissing variables:');
  missing.forEach((v) => console.log(`  - ${v}`));
  console.log('\n📖 See SETUP.md for detailed setup instructions.');
  process.exit(1);
}

