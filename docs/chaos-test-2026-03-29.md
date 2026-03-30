# UI Chaos Test Findings (2026-03-29)

This note captures the prompt-driven UI chaos testing run against the local app with Ollama-backed assist enabled.

## Scope

- Browser path exercised through Playwright against `http://127.0.0.1:8791`
- Multiple back-and-forth prompt sequences
- Fresh generation, interleaved edits, preset-backed edits, and fractional preset scaling
- JSON validated via `window.getCurrentWorkloadJson()`

## Verified Working Cases

- Fresh prompt: `Generate an insert-only workload with 1000 inserts`
  - Correct JSON: one phase, `inserts` only, `op_count = 1000`
- Preset load: `KVBench / kvbench-i`
  - Correct JSON: two phases
- Preset follow-up: `Add a new phase with 10000 deletes only`
  - Correct JSON: third phase appended, delete-only phase preserved
- Fractional preset scale: `0.01`
  - Correct JSON after preset load: `inserts = 10000`, `empty_point_queries = 8000`, `point_queries = 2000`
- Interleaved follow-up sequence
  - `Generate an insert-only workload with 1000 inserts`
  - `Interleave 500 point queries with the inserts`
  - `Also add 100 updates`
  - `Change the point queries distribution to uniform`
  - Correct JSON: single interleaved phase with `inserts`, `point_queries`, and `updates`

## Failure Cases Found

### 1. `phase N` edits were not treated as targeted phase edits

Prompt sequence:

- `Generate an insert-only workload with 1000 inserts`
- `Add a new phase with 5000 point queries`
- `Change phase 2 point queries distribution to zipf`

Observed failure before the fix:

- The edit leaked into phase 1 instead of modifying phase 2
- A new `point_queries` spec appeared in the first phase

Why it happened:

- The explicit target parser recognized `group 2`, but not `phase 2`
- As a result, the request fell through to generic operation-patch handling instead of targeted structured editing

Status:

- Fixed

### 2. Phase ordinals were being mistaken for operation-count hints

Prompt sequence:

- `Change phase 2 point queries distribution to zipf`

Observed failure before the fix:

- The target phase sometimes had its `point_queries.op_count` overwritten by an AI-provided default like `500000`

Why it happened:

- During targeted edits, the count-extraction path could treat the `2` in `phase 2` as a count-like hint
- That allowed an over-specified AI patch to overwrite `op_count` even though the user only asked for a distribution change

Status:

- Fixed

### 3. Browser-session persistence can contaminate “fresh” chaos runs

Observed failure mode:

- A supposedly fresh prompt sequence could inherit preset-backed structured state from an earlier run
- That made some early chaos-test results look worse than the actual product behavior

Why it happened:

- The app persists workload state in browser storage
- Reloading the page alone is not a true reset for prompt-chaos testing

Status:

- Test harness issue, not product logic
- Mitigation: clear `localStorage` and `sessionStorage` between Playwright scenarios

## Fixes Applied

- Added `phase` as an explicit structured target alias alongside `group` in the prompt target parser
- Tightened targeted structured-edit fallback so distribution-only phase edits:
  - stay in the addressed phase
  - preserve the existing `op_count`
  - still work even when the AI patch is sparse
- Added deterministic regression tests for both failure modes

## Regression Coverage Added

- `intent boundaries: phase-targeted distribution edits stay in the addressed phase`
- `intent boundaries: phase-targeted distribution edits still work when the AI patch is sparse`

## Notes

- The Playwright tool itself timed out on one large all-in-one matrix run after 120 seconds. Splitting the matrix into smaller browser scenarios avoids that limitation.
- The remaining long-running validation is best covered by the existing Node test suites, which are better suited to large prompt matrices than a single Playwright tool call.
