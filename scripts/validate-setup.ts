/**
 * Validation script to verify:
 * 1. Database schema includes testWPM field
 * 2. Authentication persistence is configured correctly
 * 3. Typing test feature integration is complete
 * 
 * Run with: npx tsx scripts/validate-setup.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function validateDatabase() {
  console.log("🔍 Validating database schema...")
  
  try {
    // Check if testWPM field exists by trying to query it
    const sampleJob = await prisma.job.findFirst({
      select: {
        id: true,
        testWPM: true,
        typingProfile: true,
      },
    })
    
    console.log("✅ Database schema is valid - testWPM field exists")
    console.log(`   Sample job testWPM: ${sampleJob?.testWPM ?? "null"}`)
    
    return true
  } catch (error: any) {
    if (error.message?.includes("testWPM") || error.message?.includes("Unknown field")) {
      console.error("❌ Database schema is missing testWPM field!")
      console.error("   Run: npx prisma migrate dev --name add_test_wpm")
      return false
    }
    throw error
  }
}

async function validateAuthConfig() {
  console.log("\n🔍 Validating authentication configuration...")
  
  const requiredEnvVars = [
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ]
  
  const missing: string[] = []
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }
  
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(", ")}`)
    return false
  }
  
  console.log("✅ All required environment variables are set")
  
  // Check auth config file
  try {
    const authConfig = await import("../lib/auth")
    const config = authConfig.authOptions
    
    if (config.session?.maxAge !== 30 * 24 * 60 * 60) {
      console.warn("⚠️  Session maxAge is not set to 30 days")
      return false
    }
    
    if (config.pages?.signIn !== "/") {
      console.warn("⚠️  SignIn page is not set to home page (/)")
      return false
    }
    
    console.log("✅ Authentication configuration is correct")
    console.log(`   Session maxAge: ${config.session?.maxAge} seconds (${(config.session?.maxAge || 0) / (24 * 60 * 60)} days)`)
    console.log(`   SignIn page: ${config.pages?.signIn}`)
    
    return true
  } catch (error) {
    console.error("❌ Error reading auth configuration:", error)
    return false
  }
}

async function validateTypingTestIntegration() {
  console.log("\n🔍 Validating typing test integration...")
  
  const checks = [
    {
      name: "TypingTest component exists",
      check: async () => {
        try {
          await import("../components/TypingTest")
          return true
        } catch {
          return false
        }
      },
    },
    {
      name: "TypingProfileSelector includes typing-test",
      check: async () => {
        try {
          const fs = await import("fs")
          const path = await import("path")
          const selectorFile = path.join(process.cwd(), "components/TypingProfileSelector.tsx")
          const content = fs.readFileSync(selectorFile, "utf-8")
          return content.includes("typing-test") && content.includes("Typing Test")
        } catch {
          return false
        }
      },
    },
    {
      name: "API route accepts testWPM",
      check: async () => {
        try {
          const fs = await import("fs")
          const path = await import("path")
          const routeFile = path.join(process.cwd(), "app/api/jobs/start/route.ts")
          const content = fs.readFileSync(routeFile, "utf-8")
          return content.includes("testWPM")
        } catch {
          return false
        }
      },
    },
    {
      name: "Typing engine uses testWPM",
      check: async () => {
        try {
          const fs = await import("fs")
          const path = await import("path")
          const engineFile = path.join(process.cwd(), "lib/typing-engine.ts")
          const content = fs.readFileSync(engineFile, "utf-8")
          return content.includes("testWPM")
        } catch {
          return false
        }
      },
    },
  ]
  
  let allPassed = true
  
  for (const { name, check } of checks) {
    const passed = await check()
    if (passed) {
      console.log(`✅ ${name}`)
    } else {
      console.error(`❌ ${name}`)
      allPassed = false
    }
  }
  
  return allPassed
}

async function main() {
  console.log("🚀 Starting validation...\n")
  
  const results = {
    database: await validateDatabase(),
    auth: await validateAuthConfig(),
    typingTest: await validateTypingTestIntegration(),
  }
  
  console.log("\n" + "=".repeat(50))
  console.log("📊 Validation Summary")
  console.log("=".repeat(50))
  console.log(`Database Schema:     ${results.database ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`Authentication:      ${results.auth ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`Typing Test:         ${results.typingTest ? "✅ PASS" : "❌ FAIL"}`)
  console.log("=".repeat(50))
  
  const allPassed = Object.values(results).every((r) => r)
  
  if (allPassed) {
    console.log("\n✅ All validations passed! Ready for deployment.")
    process.exit(0)
  } else {
    console.log("\n❌ Some validations failed. Please fix the issues above.")
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error("❌ Validation error:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

