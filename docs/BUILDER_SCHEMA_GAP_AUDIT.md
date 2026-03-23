# Builder vs Schema Gap Audit

This document audits the current custom workload builder against the workload schema in [public/workload-schema.json](/Users/Abhishek/src/tectonic-json/public/workload-schema.json).

The goal is to identify features that are:

- fully editable in the current builder
- only partially editable
- preserved but not really editable
- dropped or rewritten on round-trip

## Summary

The builder covers the basic operation matrix well:

- all schema operations are present
- per-operation `op_count` is supported
- per-operation `selection` distributions are supported
- per-operation `range_format` is supported
- per-operation `selectivity` is supported as a constant
- per-operation key/value expressions are supported in simplified form

The major gaps are:

1. recursive expression completeness
2. proactive advanced-expression authoring
3. section/group-level `character_set`
4. round-trip fidelity for section/group metadata

## What is fully supported

These schema concepts are directly editable in the builder:

- top-level `character_set`
- section structure:
  - sections
  - groups
  - `skip_key_contains_check`
- operations:
  - `empty_point_deletes`
  - `empty_point_queries`
  - `inserts`
  - `merges`
  - `point_deletes`
  - `point_queries`
  - `range_deletes`
  - `range_queries`
  - `sorted`
  - `updates`
- operation-level `character_set`
- constant `op_count`
- constant `k`
- constant `l`
- constant `selectivity`
- `selection` distributions:
  - `uniform`
  - `normal`
  - `beta`
  - `zipf`
  - `exponential`
  - `log_normal`
  - `poisson`
  - `weibull`
  - `pareto`
- `range_format`:
  - `StartCount`
  - `StartEnd`
- simple string pattern authoring for key/value:
  - `uniform`
  - `hot_range`

## Partial support

These schema concepts exist, but the builder only exposes part of the schema surface.

### 1. `StringExpr` is only partially editable

Schema:

- `StringExpr` can be:
  - plain string
  - `uniform`
  - `weighted`
  - `segmented`
  - `hot_range`
- `weighted.value` is recursively another `StringExpr`
- `segmented.segments[]` are recursively `StringExpr`

Current builder:

- the simple form only gives real field-level controls for:
  - `uniform`
  - `hot_range`
- choosing `weighted` in the simple form does not expose weighted entries
- choosing `segmented` in the simple form does not expose multiple segments or separator editing
- the simple form synthesizes a placeholder shape instead of letting the user author the full expression

Impact:

- users cannot fully create or refine arbitrary schema-valid string expressions from the regular form

### 2. Advanced string editing is gated and not proactive

There is an advanced editor in [public/advanced-expressions.js](/Users/Abhishek/src/tectonic-json/public/advanced-expressions.js), but it is only shown through the `Assistant-applied advanced config` panel.

Current behavior:

- the advanced editor appears only when an advanced expression already exists
- there is no explicit `Advanced` or `Edit expression` action to create one from scratch

Impact:

- users can edit some advanced expressions after a preset or the assistant creates them
- users cannot proactively author the full schema surface from the normal builder

### 3. Advanced string editing is still not schema-complete

The advanced string editor supports:

- constant string
- `uniform`
- `hot_range`
- `weighted`
- `segmented`

But it is still not schema-complete because:

- `weighted.value` only accepts:
  - plain text
  - `{{uniform}}`
  - `{{uniform:20}}`
- `segmented.segments[]` only accept:
  - plain text
  - `{{uniform}}`
  - `{{uniform:20}}`

What is missing:

- nested `weighted` inside `weighted`
- nested `segmented` inside `segmented`
- nested `hot_range`
- nested constant/uniform values with their own independent inline structure beyond the limited token syntax

Impact:

- recursive `StringExpr` is only partially editable even through the advanced panel

### 4. `NumberExpr` is only partially proactive

Schema:

- `NumberExpr` can be:
  - constant number
  - any `Distribution`

This applies to:

- `op_count`
- `selectivity`
- `k`
- `l`

Current builder:

- the normal form exposes only constant values for these fields
- advanced number-expression editing exists, but only when advanced state already exists

Impact:

- distribution-valued `op_count`
- distribution-valued `selectivity`
- distribution-valued `k`
- distribution-valued `l`

are not proactively authorable from the regular builder

## Preserved but not really editable

These values can survive in some cases, but the user does not have a complete builder surface for them.

### 5. Assistant/preset-injected advanced expressions

When presets or the assistant inject:

- `key`
- `val`
- `selection`
- distribution-valued `op_count`
- distribution-valued `selectivity`
- distribution-valued `k`
- distribution-valued `l`

the builder can often preserve them and sometimes edit them through the advanced panel.

But this support is inconsistent:

- some shapes are editable
- some shapes are only summarized
- unsupported shapes show:
  - `This expression shape is preserved but not editable here yet.`

Impact:

- the builder is not a complete editor for the schema
- it is a partial editor with best-effort preservation

## Unsupported or lossy features

These are the most serious gaps because the schema allows them, but the builder either cannot express them or rewrites them away.

### 6. Section-level `character_set` is not editable as a true section field

Schema:

- `WorkloadSpecSection.character_set` is supported

Current builder:

- no section-level `character_set` control exists
- when JSON is rebuilt in [public/app.js](/Users/Abhishek/src/tectonic-json/public/app.js), each section inherits the top-level `character_set` instead

Impact:

- different sections cannot have different character sets through the builder
- mixed-section character sets are rewritten

### 7. Group-level `character_set` is not editable

Schema:

- `WorkloadSpecGroup.character_set` is supported

Current builder:

- no group-level `character_set` control exists
- group-level `character_set` is not emitted by the builder

Impact:

- groups cannot override section/top-level character set through the builder

### 8. Section/group `character_set` is lossy on round-trip

The structured normalizer in [public/ui-structured-normalization.js](/Users/Abhishek/src/tectonic-json/public/ui-structured-normalization.js):

- reads section/group character sets only to seed defaults
- then drops them from the normalized UI state

The JSON rebuild path in [public/app.js](/Users/Abhishek/src/tectonic-json/public/app.js):

- writes top-level `character_set`
- writes that same value onto every section
- never writes group-level `character_set`

Impact:

- loading a spec with section/group character-set overrides is not faithful
- editing and saving through the builder can silently rewrite valid workload specs

This is the highest-risk correctness gap in the current builder.

## User-visible product gaps

From a user point of view, the current builder has these practical limitations:

1. You cannot fully author recursive string expressions from the normal form.
2. You cannot proactively open advanced expression editors for a blank field.
3. Segmented and weighted expressions are much easier to preserve than to create.
4. You cannot set per-section character sets.
5. You cannot set per-group character sets.
6. Specs using section/group character-set overrides do not round-trip faithfully.

## Priority fixes

If the requirement is:

> if a workload can be generated or loaded, the user should be able to fully inspect and edit it

then the fix order should be:

1. Preserve section/group `character_set` in UI state and round-trip output.
2. Add explicit section-level and group-level `character_set` controls.
3. Add a proactive `Advanced expression` entry point for:
   - `key`
   - `val`
   - `selection`
   - `op_count`
   - `selectivity`
   - `k`
   - `l`
4. Replace the placeholder segmented/weighted simple form behavior with real authoring controls, or always route those patterns through the advanced editor.
5. Extend advanced string editing so recursive `StringExpr` is actually schema-complete.

## Bottom line

The builder is currently:

- a good editor for common workloads
- a partial editor for advanced expressions
- not yet a full editor for the schema

The most important missing property is round-trip fidelity for advanced specs, especially section/group metadata.
