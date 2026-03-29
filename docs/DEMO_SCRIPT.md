# 5-Minute Demo Script

This is the recommended end-to-end demo flow for the app. It focuses on features that are already covered by automated tests, so the live walkthrough stays on the safest path.

Relevant coverage:
- `test/assist-natural-language-demo.test.mjs`
- `test/assist-chat-session.test.mjs`
- `test/assistant-panel-browser.test.mjs`
- `test/preset-scale-browser.test.mjs`
- `test/local-tectonic-runner.test.mjs`

## Goal

Show that the app can:
- generate a complex workload from natural language
- refine it conversationally without breaking prior structure
- handle ambiguity with clarification UI
- let the user fine-tune the result in the form
- run the same workload across multiple databases
- show results in both summary charts and detailed stats

## 0:00-0:30

Open on the landing screen.

Say:

> This app gives you two ways to build a benchmark workload: start from a known workload and customize it, or start from scratch in plain English.

## 0:30-1:30

Use `Option 2`.

Prompt:

```text
Build a three phase workload: preload the DB with 1M inserts, then interleave a write-heavy phase with 70% updates and 30% point queries for 400k operations, then interleave 60% point queries and 40% long range queries for 600k operations.
```

Say:

> In one prompt, it generates a multi-phase workload with counts, ratios, and mixed operation types.

Show:
- the assistant response
- the generated workload structure
- that the result is editable in the form

## 1:30-2:15

Refine it with chat.

Prompt:

```text
change point queries distribution to normal
```

Say:

> I’m not regenerating from scratch. I’m editing the existing workload conversationally.

Show:
- only the point-query behavior changes
- the assistant explains assumptions it used

## 2:15-2:45

Show ambiguity handling.

Prompt:

```text
Add another group with all deletes
```

When the clarification appears, select:
- `point_deletes`
- `range_deletes`
- `empty_point_deletes`

Say:

> When a request is ambiguous, the app asks for clarification instead of silently guessing.

Show the new delete group.

## 2:45-3:15

Show direct form customization.

Click `Customize Further`.

Pick a range operation and show:
- `Selectivity`
- `Scanned Entries`

Say:

> The assistant output is still fully editable. For range operations, I can tune the width either by selectivity or by scanned-entry count.

## 3:15-4:00

Run the workload.

Select multiple databases:
- `rocksdb`
- `cassandra`
- `printdb`

Click `Run Workload`.

Say:

> The same generated spec can be benchmarked directly across multiple storage engines from the UI.

## 4:00-4:45

Show results.

Point to:
- the 3 overview graphs at the top
- the metric explorer below
- `Overall Stats`
- `Phase-wise Stats`
- `Per-operation Stats`

Say:

> The top gives a clean comparison view, and the explorer lets me switch across overall, phase, and operation-level measurements without crowding the page.

## 4:45-5:00

Close with the other entry path.

Say:

> I could also start from a known preset workload and customize it the same way with chat and form controls.

## Backup Prompt

If the three-phase prompt feels too long live, use:

```text
Preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations
```

## Safest Demo Arc

If time is tight, this is the most reliable sequence:
1. Generate from chat.
2. Refine with chat.
3. Resolve one clarification.
4. Tweak one field in the form.
5. Run across databases.
6. Show overview charts, explorer, and detailed stats.
