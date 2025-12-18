/**
 * Test script to verify all typing engines work correctly
 */

import { buildBatchPlan } from "@/lib/typing-engine"
import type { TypingProfile } from "@/types"

const testText = "This is a test sentence to verify the typing engines are working correctly."
const totalChars = testText.length
const durationMinutes = 30

const profiles: TypingProfile[] = ["steady", "fatigue", "burst", "micropause", "typing-test"]

console.log("Testing all typing engines...\n")

for (const profile of profiles) {
  console.log(`Testing profile: ${profile}`)
  
  try {
    const testWPM = profile === "typing-test" ? 60 : undefined
    
    const plan = buildBatchPlan(
      testText,
      0, // currentIndex
      totalChars,
      durationMinutes,
      profile,
      testWPM
    )
    
    if (!plan.batch) {
      console.error(`  ❌ FAILED: No batch created`)
      continue
    }
    
    console.log(`  ✅ SUCCESS`)
    console.log(`     - Batch text: "${plan.batch.text}"`)
    console.log(`     - Batch length: ${plan.batch.text.length} chars`)
    console.log(`     - Total delay: ${plan.totalDelayMs}ms`)
    console.log(`     - Per-char delays: ${plan.perCharDelays.length} delays`)
    console.log(`     - Batch pause: ${plan.batchPauseMs}ms`)
    console.log(`     - Has mistake: ${plan.mistakePlan.hasMistake}`)
    console.log("")
  } catch (error: any) {
    console.error(`  ❌ FAILED: ${error.message}`)
    console.log("")
  }
}

console.log("All tests completed!")

