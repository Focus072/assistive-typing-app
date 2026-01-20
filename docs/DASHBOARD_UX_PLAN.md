# Dashboard UX Optimization Plan

**Branch:** `feat/dashboard-ux-optimization`  
**Status:** Planning Phase  
**Goal:** Make the dashboard interface clearer, lighter, and easier to scan without changing functionality.

---

## Current Issues Analysis

### 1. Visual Density Too High
**Problem:**
- Too many full-width sections stacked vertically
- Everything has similar visual weight (no clear hierarchy)
- Page feels heavy and overwhelming
- No breathing room between sections

**Evidence:**
- Text input, document selector, time selector, typing profile, format selector all appear as equal-weight blocks
- Advanced options compete visually with core setup
- Job history shows extremely long lists with repetitive rows

### 2. Primary Flow Unclear
**Intended Flow:**
1. Add text
2. Choose Google Doc
3. Configure typing (duration, profile)
4. Start typing

**Current Problems:**
- Steps feel disconnected
- No clear visual "happy path"
- UI does not guide the eye top → bottom
- Advanced options (formatting) compete with core setup
- New users see too much at once

### 3. Formatting Hierarchy Issues
**Problem:**
- MLA / Custom formatting appears too prominent
- Formatting should feel secondary to starting the job
- Format selector is in "Advanced Options" but still feels heavy

### 4. Job History Overwhelming
**Problem:**
- Extremely long list
- Repetitive rows
- Hard to identify what matters now
- No filtering or grouping

---

## Proposed Solutions

### Solution 1: Visual Hierarchy & Density Reduction

#### A. Create Clear Primary vs Secondary Separation
- **Primary Actions (Always Visible, Prominent):**
  - Text input (collapsible when empty)
  - Document selector
  - Core typing config (duration, profile)
  - Start button

- **Secondary Actions (Collapsed/Reduced):**
  - Formatting options (keep in Advanced, but make it feel lighter)
  - Preview buttons
  - Metadata configuration

#### B. Reduce Visual Weight
- Use lighter borders (`border-white/5` instead of `border-white/10`)
- Reduce padding in secondary sections
- Use smaller text sizes for metadata
- Group related items more tightly

#### C. Improve Spacing
- Add more vertical breathing room between major sections
- Reduce spacing within grouped items
- Use subtle dividers only where necessary

### Solution 2: Progressive Disclosure

#### A. Text Input
- **Current:** Collapsible button when empty, full textarea when shown
- **Improvement:** Keep current behavior, but make the collapsed state more inviting

#### B. Advanced Options
- **Current:** Collapsible section with "Advanced options" toggle
- **Improvement:**
  - Make the toggle more subtle (smaller, less prominent)
  - When collapsed, show a brief summary of what's configured (e.g., "MLA formatting configured")
  - Reduce visual weight of the collapsed state

#### C. Formatting Options
- **Current:** Format selector + MLA config button + Preview button all visible when advanced is open
- **Improvement:**
  - Make format selector more compact
  - Show MLA config button only when MLA is selected
  - Preview button should feel secondary (smaller, less prominent)

### Solution 3: Clear Visual Flow

#### A. Step-by-Step Visual Guide
- Add subtle visual indicators (numbers or icons) for the primary flow:
  1. 📝 Add text
  2. 📄 Choose document
  3. ⚙️ Configure typing
  4. ▶️ Start

- These should be subtle, not overwhelming
- Use small icons or numbers, not large banners

#### B. Grouping
- Group text input + document selector as "Setup"
- Group duration + profile as "Typing Configuration"
- Group formatting as "Document Formatting" (secondary)

#### C. Start Button Prominence
- Make the Start button more prominent when ready
- Position it clearly in the flow
- Use visual feedback (color, size) to indicate readiness

### Solution 4: Job History Improvements

#### A. Reduce List Density
- Make rows more compact
- Use subtle hover states
- Group by date or status

#### B. Filtering/Grouping
- Add filters: "Active", "Completed", "All"
- Group recent jobs separately
- Show only last 10-20 jobs by default with "Load more"

#### C. Visual Hierarchy
- Make active/running jobs more prominent
- Reduce visual weight of completed/old jobs
- Use subtle status indicators

---

## Implementation Plan

### Phase 1: Visual Hierarchy & Density (High Priority)

**Files to Modify:**
- `app/dashboard/page.tsx`

**Changes:**
1. Reduce border weights in secondary sections (`border-white/5` instead of `border-white/10`)
2. Increase spacing between major sections (`space-y-6` → `space-y-8`)
3. Reduce padding in advanced options section
4. Make format selector more compact
5. Reduce text size for metadata displays

**Expected Outcome:**
- Page feels lighter
- Clear separation between primary and secondary actions
- Less visual noise

### Phase 2: Progressive Disclosure (Medium Priority)

**Files to Modify:**
- `app/dashboard/page.tsx`

**Changes:**
1. Make "Advanced options" toggle more subtle (smaller, less prominent)
2. Show summary of configured options when collapsed
3. Make preview button smaller and less prominent
4. Only show MLA config button when MLA is selected (already done, verify)

**Expected Outcome:**
- New users see less at once
- Advanced options feel truly optional
- Core flow is clearer

### Phase 3: Visual Flow Indicators (Low Priority)

**Files to Modify:**
- `app/dashboard/page.tsx`

**Changes:**
1. Add subtle step indicators (small icons or numbers) to primary sections
2. Group sections with visual containers (subtle backgrounds)
3. Make Start button more prominent when ready

**Expected Outcome:**
- Users understand the flow at a glance
- Clear "happy path" is visible

### Phase 4: Job History Optimization (Separate Task)

**Files to Modify:**
- `components/JobHistory.tsx`

**Changes:**
1. Make rows more compact
2. Add filtering (Active/Completed/All)
3. Show only recent jobs by default
4. Improve visual hierarchy (active jobs more prominent)

**Expected Outcome:**
- Job history is less overwhelming
- Easy to find active jobs
- Better scanning experience

---

## Design Principles

1. **Desktop-First:** Optimize for desktop, mobile improvements later
2. **No Functionality Changes:** Only visual/layout improvements
3. **Progressive Disclosure:** Hide complexity, show essentials
4. **Visual Hierarchy:** Clear primary vs secondary separation
5. **Reduce Density:** More breathing room, less visual weight

---

## Constraints

- Do NOT change functionality
- Do NOT remove features
- Do NOT change data flow or API calls
- Do NOT introduce new dependencies
- Desktop-first (mobile can be addressed later)
- Preserve existing theme support (dark/light mode)

---

## Success Metrics

- Page feels lighter and less overwhelming
- Primary flow is clear at a glance
- New users can start a job without confusion
- Advanced options feel truly optional
- Job history is scannable

---

## Next Steps

1. Review this plan
2. Get approval for implementation approach
3. Implement Phase 1 (Visual Hierarchy & Density)
4. Test and iterate
5. Proceed with subsequent phases


