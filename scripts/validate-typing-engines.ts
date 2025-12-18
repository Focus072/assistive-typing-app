/**
 * Validation script for typing engines.
 * Tests multiple runs, compares distributions, detects patterns, and validates human-likeness.
 * 
 * Run with: npx tsx scripts/validate-typing-engines.ts
 */

import { buildBatchPlan } from "../lib/typing-engine"
import type { TypingProfile } from "../types"

interface RunResult {
  profile: TypingProfile
  runNumber: number
  delays: number[]
  pauses: number[]
  totalDelayMs: number
  averageDelay: number
  pauseCount: number
  pauseTotalMs: number
}

const TEST_TEXT = "The quick brown fox jumps over the lazy dog. This is a test sentence with various punctuation marks, including commas and periods! Does it work? Yes, it does."
const NUM_RUNS = 10
const PROFILES: TypingProfile[] = ["steady", "fatigue", "burst", "micropause", "typing-test"]

/**
 * Run a single test for a profile.
 */
function runTest(profile: TypingProfile, runNumber: number, testWPM?: number): RunResult {
  const delays: number[] = []
  const pauses: number[] = []
  let currentIndex = 0
  const totalChars = TEST_TEXT.length
  const durationMinutes = 5

  // Simulate typing through the text
  while (currentIndex < totalChars) {
    const plan = buildBatchPlan(
      TEST_TEXT,
      currentIndex,
      totalChars,
      durationMinutes,
      profile,
      testWPM
    )

    if (!plan.batch) break

    delays.push(...plan.perCharDelays)
    if (plan.batchPauseMs > 0) {
      pauses.push(plan.batchPauseMs)
    }

    currentIndex = plan.batch.endIndex
  }

  const totalDelayMs = delays.reduce((a, b) => a + b, 0) + pauses.reduce((a, b) => a + b, 0)
  const averageDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0

  return {
    profile,
    runNumber,
    delays,
    pauses,
    totalDelayMs,
    averageDelay,
    pauseCount: pauses.length,
    pauseTotalMs: pauses.reduce((a, b) => a + b, 0),
  }
}

/**
 * Calculate mean of array.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate variance of array.
 */
function variance(values: number[], meanValue: number): number {
  if (values.length === 0) return 0
  const squaredDiffs = values.map(v => Math.pow(v - meanValue, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate standard deviation.
 */
function stdDev(values: number[], meanValue: number): number {
  return Math.sqrt(variance(values, meanValue))
}

/**
 * Calculate skewness (third moment).
 */
function skewness(values: number[], meanValue: number, stdDevValue: number): number {
  if (values.length === 0 || stdDevValue === 0) return 0
  const cubedDiffs = values.map(v => Math.pow((v - meanValue) / stdDevValue, 3))
  return cubedDiffs.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate kurtosis (fourth moment).
 */
function kurtosis(values: number[], meanValue: number, stdDevValue: number): number {
  if (values.length === 0 || stdDevValue === 0) return 0
  const fourthDiffs = values.map(v => Math.pow((v - meanValue) / stdDevValue, 4))
  return fourthDiffs.reduce((a, b) => a + b, 0) / values.length - 3 // Excess kurtosis
}

/**
 * Calculate autocorrelation at a given lag.
 */
function autocorrelation(values: number[], lag: number): number {
  if (lag >= values.length || lag < 0) return 0
  
  const meanValue = mean(values)
  const n = values.length - lag
  
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    const diff1 = values[i] - meanValue
    const diff2 = values[i + lag] - meanValue
    numerator += diff1 * diff2
    denominator += diff1 * diff1
  }
  
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Calculate correlation between two arrays.
 */
function correlation(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0
  
  const mean1 = mean(arr1)
  const mean2 = mean(arr2)
  
  let numerator = 0
  let sumSq1 = 0
  let sumSq2 = 0
  
  for (let i = 0; i < arr1.length; i++) {
    const diff1 = arr1[i] - mean1
    const diff2 = arr2[i] - mean2
    numerator += diff1 * diff2
    sumSq1 += diff1 * diff1
    sumSq2 += diff2 * diff2
  }
  
  const denominator = Math.sqrt(sumSq1 * sumSq2)
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Analyze distribution of delays.
 */
function analyzeDistribution(results: RunResult[]) {
  const allDelays = results.flatMap(r => r.delays)
  const meanValue = mean(allDelays)
  const stdDevValue = stdDev(allDelays, meanValue)
  const skew = skewness(allDelays, meanValue, stdDevValue)
  const kurt = kurtosis(allDelays, meanValue, stdDevValue)
  const varianceCoeff = stdDevValue / meanValue

  return {
    mean: meanValue,
    stdDev: stdDevValue,
    skewness: skew,
    kurtosis: kurt,
    varianceCoefficient: varianceCoeff,
  }
}

/**
 * Analyze autocorrelation.
 */
function analyzeAutocorrelation(results: RunResult[]) {
  const allDelays = results.flatMap(r => r.delays)
  const lags = [1, 2, 3, 5, 10]
  const autocorrs: Record<number, number> = {}
  
  for (const lag of lags) {
    autocorrs[lag] = autocorrelation(allDelays, lag)
  }
  
  return autocorrs
}

/**
 * Compare runs for similarity.
 */
function analyzeRunSimilarity(results: RunResult[]): number {
  if (results.length < 2) return 0
  
  // Compare each pair of runs
  const similarities: number[] = []
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const sim = correlation(results[i].delays, results[j].delays)
      similarities.push(Math.abs(sim))
    }
  }
  
  return mean(similarities)
}

/**
 * Main validation function.
 */
async function main() {
  console.log("🔍 Validating Typing Engines\n")
  console.log(`Test text length: ${TEST_TEXT.length} characters`)
  console.log(`Number of runs per profile: ${NUM_RUNS}\n`)

  const allResults: Record<TypingProfile, RunResult[]> = {
    steady: [],
    fatigue: [],
    burst: [],
    micropause: [],
    "typing-test": [],
  }

  // Run tests for each profile
  for (const profile of PROFILES) {
    console.log(`Testing ${profile} profile...`)
    const testWPM = profile === "typing-test" ? 60 : undefined
    
    for (let run = 0; run < NUM_RUNS; run++) {
      const result = runTest(profile, run, testWPM)
      allResults[profile].push(result)
    }
  }

  console.log("\n" + "=".repeat(80) + "\n")

  // Analyze each profile
  for (const profile of PROFILES) {
    const results = allResults[profile]
    console.log(`\n📊 Analysis: ${profile.toUpperCase()}`)
    console.log("-".repeat(80))

    // Distribution analysis
    const dist = analyzeDistribution(results)
    console.log("\nDistribution Analysis:")
    console.log(`  Mean delay: ${dist.mean.toFixed(2)}ms`)
    console.log(`  Std Dev: ${dist.stdDev.toFixed(2)}ms`)
    console.log(`  Skewness: ${dist.skewness.toFixed(3)} (should be > 0 for human-like)`)
    console.log(`  Kurtosis: ${dist.kurtosis.toFixed(3)} (excess, should be > 0 for human-like)`)
    console.log(`  Variance coefficient: ${dist.varianceCoefficient.toFixed(3)} (should be 0.2-0.4)`)

    // Autocorrelation analysis
    const autocorr = analyzeAutocorrelation(results)
    console.log("\nAutocorrelation Analysis:")
    for (const [lag, value] of Object.entries(autocorr)) {
      const status = Math.abs(value) > 0.3 ? "⚠️  HIGH" : "✅ OK"
      console.log(`  Lag ${lag}: ${value.toFixed(3)} ${status}`)
    }

    // Run similarity
    const similarity = analyzeRunSimilarity(results)
    console.log("\nRun Similarity:")
    const simStatus = similarity > 0.2 ? "⚠️  TOO SIMILAR" : "✅ OK"
    console.log(`  Average similarity: ${similarity.toFixed(3)} ${simStatus}`)

    // Pause analysis
    const avgPauseCount = mean(results.map(r => r.pauseCount))
    const pauseFrequency = (avgPauseCount / results[0].delays.length) * 100
    console.log("\nPause Analysis:")
    console.log(`  Average pause count: ${avgPauseCount.toFixed(1)}`)
    console.log(`  Pause frequency: ${pauseFrequency.toFixed(1)}% (should be 5-15%)`)

    // Profile-specific checks
    console.log("\nProfile-Specific Checks:")
    if (profile === "steady") {
      if (dist.varianceCoefficient > 0.1) {
        console.log("  ⚠️  Variance too high for steady profile")
      } else {
        console.log("  ✅ Variance within expected range")
      }
    } else if (profile === "burst") {
      if (dist.mean > 150) {
        console.log("  ⚠️  Average delay too high for burst profile")
      } else {
        console.log("  ✅ Average delay within expected range")
      }
    } else if (profile === "fatigue") {
      // Check if delays increase over progress
      const firstHalf = results[0].delays.slice(0, Math.floor(results[0].delays.length / 2))
      const secondHalf = results[0].delays.slice(Math.floor(results[0].delays.length / 2))
      const firstMean = mean(firstHalf)
      const secondMean = mean(secondHalf)
      if (secondMean <= firstMean) {
        console.log("  ⚠️  Fatigue profile should slow down over time")
      } else {
        console.log("  ✅ Fatigue profile shows slowdown")
      }
    }
  }

  // Cross-profile comparison
  console.log("\n" + "=".repeat(80))
  console.log("\n🔀 Cross-Profile Comparison")
  console.log("-".repeat(80))

  const profileAverages: Record<TypingProfile, number> = {
    steady: 0,
    fatigue: 0,
    burst: 0,
    micropause: 0,
    "typing-test": 0,
  }

  for (const profile of PROFILES) {
    profileAverages[profile] = mean(allResults[profile].map(r => r.averageDelay))
  }

  console.log("\nAverage Delays by Profile:")
  for (const [profile, avg] of Object.entries(profileAverages)) {
    console.log(`  ${profile}: ${avg.toFixed(2)}ms`)
  }

  // Check distinctness
  console.log("\nDistinctness Check:")
  const profiles = PROFILES as TypingProfile[]
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const p1 = profiles[i]
      const p2 = profiles[j]
      const diff = Math.abs(profileAverages[p1] - profileAverages[p2])
      const status = diff < 20 ? "⚠️  TOO SIMILAR" : "✅ DISTINCT"
      console.log(`  ${p1} vs ${p2}: ${diff.toFixed(2)}ms difference ${status}`)
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("\n✅ Validation Complete")
}

main().catch(console.error)

