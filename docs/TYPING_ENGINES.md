# Typing Engines Documentation

## Overview

The typing engine system simulates human typing behavior with distinct personalities. Each engine produces unique, non-repeatable timing patterns that feel natural and human-like.

## Engine Personalities

### Steady
- **Personality**: Uniform, consistent pace
- **Behavior**: Low variance (5%), no special pauses beyond context
- **Use Case**: Predictable, even typing rhythm
- **Speed Range**: Normal (80-280ms per character)

### Fatigue
- **Personality**: Gradual slowdown over time
- **Behavior**: Progressive slowdown (5-15%+ as progress increases), non-linear curve
- **Use Case**: Simulates typing fatigue over long texts
- **Speed Range**: Slow (150-400ms per character)

### Burst
- **Personality**: Fast typing with occasional thinking pauses
- **Behavior**: Fast base speed (70-90% of normal), 25% chance of thinking pause (600-1200ms)
- **Use Case**: Simulates burst typing with pauses for thought
- **Speed Range**: Fast (50-150ms per character)

### Micropause
- **Personality**: Frequent small hesitations
- **Behavior**: Normal speed with 40% chance of small hesitation (100-350ms)
- **Use Case**: Simulates careful, hesitant typing
- **Speed Range**: Normal (80-280ms per character)

### Typing-Test
- **Personality**: Matches user's actual typing speed
- **Behavior**: Dynamic speed based on user WPM, 15% chance of natural pause (200-600ms)
- **Use Case**: Personalized typing that matches user's test results
- **Speed Range**: Dynamic (calculated from WPM)

## Variability & Human-Likeness

### Structured Randomness
- Each job uses a seeded PRNG (pseudo-random number generator)
- Seed is generated once per job from job ID and timestamp
- PRNG state is carried across batches for consistency
- Ensures non-repeatable but consistent randomness within a job

### Temporal Drift
- Uses EMA (Exponential Moving Average) for low-frequency drift
- Tracks delay trends across batches
- Applies gentle drift (±1-3% per batch) that accumulates slowly
- Not reactive per batch, but smooth over many batches

### Skewed Noise Model
- Uses log-normal distribution instead of uniform random
- Delays cluster around typical values with occasional outliers
- Creates human-like distribution (not uniform or normal)
- Most delays near base, some faster, fewer slower

### Batch Variability
- Weighted distribution: prefers 2-4 characters, less 1 or 5
- Weights: [1: 0.1, 2: 0.3, 3: 0.4, 4: 0.15, 5: 0.05]
- Subtle momentum: if last batch was small, slightly prefer larger
- No hard "no repeats" constraints - allows natural repetition

## WPM Accuracy (Typing-Test Engine)

### Accuracy Tracking
- Tracks cumulative delay time vs characters typed
- Calculates actual WPM and compares to target
- Uses EMA of WPM drift for smoothing

### Gentle Corrections
- Only applies corrections after persistent drift (>5% for 10-20 batches)
- Correction factor: ±1-2% adjustment (gentle, avoids rubber-banding)
- Adaptive blending: adjusts WPM weight from 80% to 82-83% if needed
- Avoids reactive per-batch adjustments

### Extreme WPM Handling
- Very fast (100+ WPM): tighter variance to avoid robotic feel
- Very slow (20- WPM): tighter variance to avoid stalling/jitter
- Automatically adjusts range bounds for natural behavior

## Context-Aware Pauses

All engines share common pause rules:

- **Sentence endings** (`.`, `!`, `?`): 500-1200ms pause
- **Commas** (`,`): 150-400ms pause
- **Spaces**: 50-150ms pause
- **Newlines** (`\n`): 300-600ms pause
- **Long words** (>8 chars): 100-300ms pause
- **Paragraphs** (`\n\n`): 1000-2500ms pause

## Minimum Guarantees

All engines enforce minimum delays:
- **Per character**: Minimum 50ms
- **Batch interval**: Minimum 150ms
- **All pauses**: Respect minimum bounds

## Engine Composability

Engines can be composed to create hybrid profiles:

```typescript
// 70% steady, 30% micropause
composeEngines(["steady", "micropause"], [0.7, 0.3], ...)
```

This allows creating custom typing behaviors by blending engine personalities.

## Analytics

The system collects analytics for future analysis:

- Average delay per batch
- Pause count and total pause time
- Speed drift (WPM change over time)
- Variance in delays
- Batch count

## Validation

The system includes validation to ensure:
- Engines produce distinct timing signatures
- No two engines feel interchangeable
- Timing patterns are non-repeatable
- Human-likeness metrics are met

## Future Extensibility

The engine system is designed for future additions:
- New engine personalities can be added easily
- Composability allows hybrid profiles
- Analytics hooks ready for metrics collection
- Clear separation between core logic and engine implementations

