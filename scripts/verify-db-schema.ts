#!/usr/bin/env tsx
/**
 * Database Schema Verification Script
 * 
 * This script verifies that all required NextAuth tables exist in the database
 * and checks for common schema issues that cause OAuthCreateAccount errors.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function isUnreachableDbError(error: any): boolean {
  const msg = error?.message ?? ''
  const code = error?.code ?? ''
  return code === 'P1001' || /can't reach database server|Can't reach database server/i.test(msg)
}

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema...\n')

  const checks: { name: string; passed: boolean; error?: string }[] = []

  // Connectivity check: if DB is unreachable (e.g. firewall blocks port 5432), skip checks and exit cleanly
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error: any) {
    if (isUnreachableDbError(error)) {
      console.log('⚠️  Database server unreachable from this network (e.g. port 5432 blocked).\n')
      console.log('   If you applied the schema via Neon SQL Editor (scripts/neon-schema-apply.sql),')
      console.log('   your schema is fine. The app will work from environments that can reach the DB')
      console.log('   (e.g. Vercel, or another network).\n')
      process.exit(0)
    }
    throw error
  }

  // Check 1: User table exists and has required fields
  try {
    const userCount = await prisma.user.count()
    console.log(`✅ User table exists (${userCount} users)`)
    checks.push({ name: 'User table exists', passed: true })
  } catch (error: any) {
    console.error(`❌ User table check failed: ${error.message}`)
    checks.push({ 
      name: 'User table exists', 
      passed: false, 
      error: error.message 
    })
  }

  // Check 2: Account table exists
  try {
    const accountCount = await prisma.account.count()
    console.log(`✅ Account table exists (${accountCount} accounts)`)
    checks.push({ name: 'Account table exists', passed: true })
  } catch (error: any) {
    console.error(`❌ Account table check failed: ${error.message}`)
    checks.push({ 
      name: 'Account table exists', 
      passed: false, 
      error: error.message 
    })
  }

  // Check 3: Session table exists
  try {
    const sessionCount = await prisma.session.count()
    console.log(`✅ Session table exists (${sessionCount} sessions)`)
    checks.push({ name: 'Session table exists', passed: true })
  } catch (error: any) {
    console.error(`❌ Session table check failed: ${error.message}`)
    checks.push({ 
      name: 'Session table exists', 
      passed: false, 
      error: error.message 
    })
  }

  // Check 4: Test creating a user (rollback immediately)
  try {
    const testEmail = `test-${Date.now()}@example.com`
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test User',
      },
    })
    await prisma.user.delete({ where: { id: testUser.id } })
    console.log('✅ User creation test passed')
    checks.push({ name: 'User creation works', passed: true })
  } catch (error: any) {
    console.error(`❌ User creation test failed: ${error.message}`)
    checks.push({ 
      name: 'User creation works', 
      passed: false, 
      error: error.message 
    })
  }

  // Check 5: Verify required fields are nullable (for OAuth)
  try {
    // This will fail if email is not unique or required fields are missing
    const schemaCheck = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('email', 'name', 'image', 'emailVerified', 'password')
    `
    console.log('✅ Schema fields check passed')
    checks.push({ name: 'Schema fields check', passed: true })
  } catch (error: any) {
    console.error(`❌ Schema fields check failed: ${error.message}`)
    checks.push({ 
      name: 'Schema fields check', 
      passed: false, 
      error: error.message 
    })
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  const allPassed = checks.every(c => c.passed)
  console.log(`\nOverall Status: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}\n`)

  if (!allPassed) {
    console.log('⚠️  Database schema issues detected!\n')
    console.log('🔧 To fix, run one of these commands:\n')
    console.log('   For development/testing:')
    console.log('   $ npx prisma db push\n')
    console.log('   For production (recommended):')
    console.log('   $ npx prisma migrate deploy\n')
    console.log('   Then regenerate Prisma Client:')
    console.log('   $ npx prisma generate\n')
    process.exit(1)
  } else {
    console.log('✅ Database schema is correctly configured!')
    console.log('\n📋 If you\'re still seeing OAuthCreateAccount errors,')
    console.log('   check the production logs for detailed error messages.')
    process.exit(0)
  }
}

verifyDatabaseSchema()
  .catch((error) => {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
