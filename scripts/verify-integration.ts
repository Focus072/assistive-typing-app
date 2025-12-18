/**
 * Automated verification script for:
 * 1. Database schema (testWPM field)
 * 2. Authentication configuration
 * 3. Typing test integration
 * 4. Type/Paste mode toggle
 * 
 * Run with: npx tsx scripts/verify-integration.ts
 */

import { readFileSync, existsSync } from "fs"
import { join } from "path"

const cwd = process.cwd()

interface VerificationResult {
  name: string
  passed: boolean
  message: string
}

const results: VerificationResult[] = []

function verify(name: string, check: () => boolean, message: string) {
  try {
    const passed = check()
    results.push({ name, passed, message: passed ? "✅ " + message : "❌ " + message })
    return passed
  } catch (error: any) {
    results.push({ name, passed: false, message: "❌ " + message + ` (Error: ${error.message})` })
    return false
  }
}

console.log("🔍 Starting Integration Verification...\n")

// 1. Database Schema Verification
console.log("1. Verifying Database Schema...")
verify(
  "testWPM field exists",
  () => {
    const schema = readFileSync(join(cwd, "prisma/schema.prisma"), "utf-8")
    return schema.includes("testWPM") && schema.includes("Int?")
  },
  "testWPM Int? field exists in schema"
)

verify(
  "Schema is ready for migration",
  () => {
    // Check if schema includes testWPM field - migration can be created
    const schema = readFileSync(join(cwd, "prisma/schema.prisma"), "utf-8")
    return schema.includes("testWPM")
  },
  "Schema includes testWPM field (ready for migration)"
)

// 2. Authentication Configuration
console.log("\n2. Verifying Authentication Configuration...")
verify(
  "Session maxAge is 30 days",
  () => {
    const auth = readFileSync(join(cwd, "lib/auth.ts"), "utf-8")
    return auth.includes("maxAge: 30 * 24 * 60 * 60")
  },
  "Session maxAge set to 30 days"
)

verify(
  "SessionProvider has refetchInterval",
  () => {
    const providers = readFileSync(join(cwd, "components/providers.tsx"), "utf-8")
    return providers.includes("refetchInterval") && providers.includes("refetchOnWindowFocus")
  },
  "SessionProvider configured for persistence"
)

verify(
  "SignIn page is home page",
  () => {
    const auth = readFileSync(join(cwd, "lib/auth.ts"), "utf-8")
    return auth.includes('signIn: "/"')
  },
  "SignIn page set to home page (/)"
)

verify(
  "Home page checks auth state",
  () => {
    const homePage = readFileSync(join(cwd, "components/ui/sign-in-flow-1.tsx"), "utf-8")
    return homePage.includes("useSession") && homePage.includes("Dashboard") && homePage.includes("Sign Out")
  },
  "Home page shows Dashboard/Sign Out when logged in"
)

// 3. Typing Test Integration
console.log("\n3. Verifying Typing Test Integration...")
verify(
  "TypingTest component exists",
  () => {
    return existsSync(join(cwd, "components/TypingTest.tsx"))
  },
  "TypingTest component file exists"
)

verify(
  "WPM calculation uses correct formula",
  () => {
    const test = readFileSync(join(cwd, "components/TypingTest.tsx"), "utf-8")
    return test.includes("correctChars / 5") && test.includes("/ minutes")
  },
  "WPM calculation uses (correctChars / 5) / minutes"
)

verify(
  "Completion triggers on exact length match",
  () => {
    const test = readFileSync(join(cwd, "components/TypingTest.tsx"), "utf-8")
    return test.includes("userInput.length === TARGET_TEXT.length")
  },
  "Completion triggers when userInput.length === TARGET_TEXT.length"
)

verify(
  "TypingProfileSelector includes typing-test",
  () => {
    const selector = readFileSync(join(cwd, "components/TypingProfileSelector.tsx"), "utf-8")
    return selector.includes('"typing-test"') && selector.includes("Typing Test")
  },
  "TypingProfileSelector includes typing-test option"
)

verify(
  "API route accepts testWPM",
  () => {
    const route = readFileSync(join(cwd, "app/api/jobs/start/route.ts"), "utf-8")
    return route.includes("testWPM") && route.includes("z.coerce.number")
  },
  "API route accepts and validates testWPM"
)

verify(
  "Typing engine uses testWPM",
  () => {
    const delays = readFileSync(join(cwd, "lib/typing-delays.ts"), "utf-8")
    const engine = readFileSync(join(cwd, "lib/typing-engine.ts"), "utf-8")
    return delays.includes("testWPM") && delays.includes("getWPMRange") && engine.includes("testWPM")
  },
  "Typing engine uses testWPM for delay calculation"
)

verify(
  "Job processing reads testWPM",
  () => {
    const job = readFileSync(join(cwd, "inngest/functions/typing-job.ts"), "utf-8")
    return job.includes("testWPM") && job.includes("buildBatchPlan")
  },
  "Job processing reads testWPM from database"
)

// 4. Type/Paste Mode Toggle
console.log("\n4. Verifying Type/Paste Mode Toggle...")
verify(
  "TextInput component exists",
  () => {
    return existsSync(join(cwd, "components/TextInput.tsx"))
  },
  "TextInput component file exists"
)

verify(
  "Mode selection buttons implemented",
  () => {
    const input = readFileSync(join(cwd, "components/TextInput.tsx"), "utf-8")
    return input.includes("Type") && input.includes("Paste") && input.includes("shouldShowButtons")
  },
  "Mode selection buttons are implemented"
)

verify(
  "Mode persists in localStorage",
  () => {
    const input = readFileSync(join(cwd, "components/TextInput.tsx"), "utf-8")
    return input.includes("localStorage") && input.includes("STORAGE_KEY")
  },
  "Mode persists in localStorage"
)

verify(
  "Type mode has different styling",
  () => {
    const input = readFileSync(join(cwd, "components/TextInput.tsx"), "utf-8")
    return input.includes("effectiveMode === \"type\"") && input.includes("font-sans") && input.includes("text-lg")
  },
  "Type mode has larger font and sans-serif styling"
)

// Print Results
console.log("\n" + "=".repeat(60))
console.log("📊 Verification Results")
console.log("=".repeat(60))

let allPassed = true
for (const result of results) {
  console.log(result.message)
  if (!result.passed) allPassed = false
}

console.log("=".repeat(60))
console.log(`\nOverall Status: ${allPassed ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED"}`)

if (!allPassed) {
  console.log("\n⚠️  Please fix the failed checks before deployment.")
  process.exit(1)
} else {
  console.log("\n✅ All code verifications passed!")
  console.log("\n📋 Next Steps:")
  console.log("   1. Run database migration: npx prisma migrate dev --name add_test_wpm")
  console.log("   2. Perform manual testing (see VALIDATION_CHECKLIST.md)")
  console.log("   3. Deploy! 🚀")
  process.exit(0)
}

