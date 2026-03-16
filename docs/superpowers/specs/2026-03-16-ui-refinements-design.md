# UI Refinements — Audio Labels, Domains, Form Indicators, Upload Wizard, Analytics Charts

## Overview

A set of UI refinements to improve clarity, enforce correct domain categorization, guide admins through a structured upload flow, and align analytics chart types with stakeholder expectations.

---

## 1. Rename Audio Labels

**Goal:** Replace "Short"/"Long" terminology with "Brief Summary"/"Detailed Overview" across all user-facing UI.

**Scope:** UI labels only. Database columns (`audio_short_url`, `audio_long_url`), Prisma field names (`audioShortUrl`, `audioLongUrl`), internal string values (`'short'`/`'long'`), and API payloads remain unchanged.

### Changes

| Location                     | Current                          | New                                                   |
| ---------------------------- | -------------------------------- | ----------------------------------------------------- |
| Upload form audio label      | "Short Audio"                    | "Brief Summary"                                       |
| Upload form audio label      | "Long Audio"                     | "Detailed Overview"                                   |
| Upload form transcript label | "Short Transcript"               | "Brief Summary Transcript"                            |
| Upload form transcript label | "Long Transcript"                | "Detailed Overview Transcript"                        |
| Audio player toggle button   | "Short" / "Long"                 | "Brief Summary" / "Detailed Overview"                 |
| Player toggle aria-label     | "Short version" / "Long version" | "Brief Summary version" / "Detailed Overview version" |

**Important:** A codebase-wide search must be performed for all display instances of "Short" and "Long" in the context of audio types. Check at minimum:

- `components/admin/podcast-upload-form.tsx`
- `components/audio-player/audio-player.tsx`
- `components/audio-player/podcast-detail-layout.tsx` (if it has display text)
- Any other component rendering audio type labels

**Note:** `stores/player-store.ts` uses `'short' | 'long'` as internal values — these do NOT change. Only user-facing display text changes.

---

## 2. Domain Separation

**Goal:** Separate domains into two categories — one for podcasts (Technical Releases), one for learning paths (Learning Series).

### Domain Lists

**Podcast Domains (Technical Releases):**

- Audit Methodology
- Accounting and Reporting
- Audit Technology
- Quality and Risk
- LEAP

**Learning Series Domains:**

- Auditing
- Accounting and Reporting

### Implementation

In `lib/schemas/common.ts`:

```typescript
export const PODCAST_DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
] as const;

export const LEARNING_SERIES_DOMAINS = ['Auditing', 'Accounting and Reporting'] as const;

// Manually maintained union of all unique domains (cannot use Set with as const)
export const DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
  'Auditing',
] as const;
```

**Note:** The `DOMAINS` array must be manually maintained as a literal tuple because `[...new Set(...)] as const` does not produce a valid tuple type for `z.enum()`. When adding/removing domains, update all three arrays.

**Usage:**

- Podcast upload/edit form → `PODCAST_DOMAINS`
- Learning path creation form → `LEARNING_SERIES_DOMAINS`
- Public listing filters, analytics → `DOMAINS` (all)
- Zod schemas referencing domains → update to use appropriate list per context

**Files affected:**

- `lib/schemas/common.ts`
- `components/admin/podcast-upload-form.tsx` (or wizard replacement)
- `app/(admin)/admin/learning-graphs/new/page.tsx`
- `lib/schemas/podcast.ts` (if domain validation uses DOMAINS)
- `lib/schemas/learning-graph.ts` (if domain validation uses DOMAINS)

---

## 3. Form Field Indicators

**Goal:** Mark mandatory fields with `*`, remove all "(Optional)" labels, add footer note.

**Note:** Most labels currently do NOT have `*` indicators — they rely on Zod validation error messages. The `*` indicators are being **added** to the following labels as a new UI pattern.

### Required Fields (add `*` indicator to label)

- Title \*
- Description \*
- Domain \*
- Year \*
- Thumbnail Image _ (in create mode only; no `_` in edit mode)

### Behavioral Change: Brief Summary Audio No Longer Required

The current form marks "Short Audio" as required in create mode (shows `*`, enforces with toast error). **This requirement is being removed.** Brief Summary audio is now optional — no `*`, no validation guard. The submit handler must be updated to allow submission without an audio file.

### Fields WITHOUT any indicator (no `*`, no "Optional")

- Brief Summary (audio) — was required, now optional
- Detailed Overview (audio)
- Brief Summary Transcript
- Detailed Overview Transcript
- Attachments
- Tags

### Footer

Add at the bottom of the form/wizard, below the submit/navigation buttons:

```html
<p class="italic text-muted-foreground text-sm">All fields marked with * are mandatory</p>
```

**Files affected:**

- `components/admin/podcast-upload-form.tsx` (or wizard replacement)

---

## 4. Remove "(Optional)" Globally

**Goal:** Remove all instances of "(Optional)" text from labels across the entire codebase.

Search for patterns:

- `(Optional)` in JSX label text
- Trailing "(Optional)" in any form label

**Known instances to remove:**

- `components/admin/podcast-upload-form.tsx` — "Long Audio (Optional)", "Attachments (Optional)", "Short Transcript (Optional)", "Long Transcript (Optional)"
- Any other component with "(Optional)" in a label

**Excluded:** Placeholder text like `placeholder="Optional note..."` in `bookmark-panel.tsx` — this is input hint text, not a label, and stays as-is.

---

## 5. Three-Stage Upload Wizard

**Goal:** Replace the single-page upload form with a three-step wizard: Details → Content → Review.

### Step 1 — Details

Fields:

- Title \*
- Description \*
- Domain \* (dropdown with `PODCAST_DOMAINS`)
- Year \*
- Tags
- Thumbnail Image \* (create mode only)

Navigation: "Next" button (validates required fields before proceeding via Zod)

### Step 2 — Content

Fields:

- Brief Summary (audio upload)
- Detailed Overview (audio upload)
- Attachments (file upload)
- Brief Summary Transcript (file upload)
- Detailed Overview Transcript (file upload)

**File uploads happen immediately when selected** (same as current behavior — files are uploaded to MinIO/Azure Blob on selection, and the returned storage key is stored in form state). Upload progress bars are shown inline per file during Step 2.

Navigation: "Back" button, "Next" button

### Step 3 — Review

Read-only display of all entered data:

- Title, Description, Domain, Year, Tags displayed as text
- Thumbnail shown as image preview (from uploaded URL)
- Audio files shown as filename
- Attachments shown as filenames
- Transcripts shown as character count

Navigation:

- "Back" button — returns to Step 2 (user can navigate back to Step 1 from there)
- "Submit" button — creates the podcast via API (same calls as current form)

### Component Architecture

```
PodcastUploadWizard (new wrapper, manages all form state)
├── WizardStepIndicator (shows Steps 1/2/3 with active/completed states)
├── WizardStepDetails (Step 1 fields)
├── WizardStepContent (Step 2 fields)
├── WizardStepReview (Step 3 read-only summary)
└── Footer: step navigation + mandatory fields note
```

**State management:** Use `react-hook-form` with Zod resolver (consistent with existing codebase patterns). The wizard wraps a single form instance; each step renders a subset of fields. Step validation uses `trigger()` on the relevant fields before allowing "Next".

**Edit mode:**

- The wizard is also used for editing existing podcasts
- Pre-populated with existing data from the server
- Thumbnail `*` indicator is NOT shown in edit mode (existing thumbnail preserved if not replaced)
- The edit page (`app/(admin)/admin/edit/[id]/page.tsx`) renders the wizard with `mode="edit"` and `initialData`
- Step 3 Review shows all current values (no diff view — just the full summary)

### Files affected

- Create: `components/admin/podcast-upload-wizard.tsx` (orchestrator + form state)
- Create: `components/admin/wizard-step-indicator.tsx`
- Create: `components/admin/wizard-step-details.tsx`
- Create: `components/admin/wizard-step-content.tsx`
- Create: `components/admin/wizard-step-review.tsx`
- Modify: `app/(admin)/admin/upload/page.tsx` — render wizard instead of form
- Modify: `app/(admin)/admin/edit/[id]/page.tsx` — render wizard in edit mode
- Retire: `components/admin/podcast-upload-form.tsx` — replaced by wizard components

---

## 6. Analytics Chart Type Changes

**Goal:** Align chart types with stakeholder expectations.

### Changes

| Chart             | Current Type                                | New Type                                  | Change Required                              |
| ----------------- | ------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Listens by Domain | Donut (PieChart with innerRadius=60)        | **True pie chart**                        | Remove `innerRadius` prop to fill the center |
| Monthly Trends    | Area chart (AreaChart)                      | **Column bar chart**                      | Replace AreaChart with vertical BarChart     |
| Top Topics        | Horizontal bar (BarChart layout="vertical") | **Horizontal bar chart, sorted high→low** | Add client-side sort before rendering        |

### Domain Pie Chart Change

Remove `innerRadius={60}` from the PieChart to convert from donut to true pie:

```tsx
<Pie data={domainData} dataKey="count" nameKey="domain" outerRadius={100} label />
```

### Monthly Trends Change

Replace `AreaChart` with `BarChart`:

```tsx
<BarChart data={trends}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
</BarChart>
```

### Top Topics Sort (Change)

The current code passes `data.topTopics` directly without sorting. Add client-side sort:

```typescript
const sortedTopics = [...topics].sort((a, b) => b.count - a.count);
```

Pass `sortedTopics` to the chart instead of `topics`.

**Files affected:**

- `components/admin/analytics-charts.tsx`

---

## Non-Goals

- No changes to database schema or column names
- No changes to API payloads or internal `'short'`/`'long'` string values
- No changes to authentication or authorization
- No changes to the public-facing pages (except domain filter options if they reference DOMAINS)
- No changes to bookmark panel placeholder text ("Optional note...")
