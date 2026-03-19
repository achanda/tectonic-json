# Formal verification scaffold

This directory contains the first bounded formal model for the deterministic assist interpreter.

Scope:
- the constrained assist DSL after AI output has already been accepted
- deterministic interpreter semantics
- structural safety invariants around sections, groups, and flat operation edits

Out of scope:
- natural-language correctness
- model understanding of prompts
- network/provider behavior

Files:
- `assist_program_dsl.md`
  - reference for the constrained DSL emitted by the AI
- `assist_interpreter.tla`
  - bounded TLA+ model of the deterministic interpreter state machine
- `assist_interpreter.cfg`
  - TLC configuration with a small finite state space

Properties checked in the TLA+ model:
- `TypeInvariant`
  - interpreter state stays well-typed
- `DerivedStructureMetadataInvariant`
  - `sections_count` and `groups_per_section` stay derived from `sections`
- `StructureChangeRequiresReplace`
  - only `replace_sections` is allowed to change structure metadata
- `ClearOperationsClearsFlatOps`
  - `clear_operations` immediately empties the flat operation set

Matching executable harness:
- `test/assist-interpreter-invariants.test.mjs`
  - deterministic invariant checks against the real JavaScript interpreter
  - includes bounded randomized programs and direct semantic regression checks

Run both the JavaScript invariant harness and the bounded TLA+ model:

```sh
make test-formal
```

Run just the JavaScript invariant harness:

```sh
make test-formal-js
```

Run just the bounded TLA+ model with TLC:

```sh
make test-formal-tla
```

Notes:
- this is intentionally the first slice, not the full application model
- the TLA+ model focuses on the deterministic interpreter core because that is the part we can actually verify
- prompt-specific fallbacks and UI rendering are still covered by regular tests, not this model
