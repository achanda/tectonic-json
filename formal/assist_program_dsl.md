# Assist program DSL

This document describes the constrained DSL that the AI returns for `/api/assist`.

The model does not directly emit a final workload patch anymore. It emits a `program`, and the backend deterministically interprets that program into the normalized patch/state pipeline.

## Purpose

The DSL exists to narrow the model contract:
- AI chooses intent
- deterministic code applies semantics
- normalization, validation, and follow-up merging remain in application code

This improves:
- safety
- local-model robustness
- testability
- formal verification of the deterministic core

## Top-level shape

The AI output includes:

```json
{
  "summary": "Enable 50k point queries",
  "program": [
    {
      "kind": "set_operation_fields",
      "operation": "point_queries",
      "fields": [
        { "field": "op_count", "number_value": 50000 },
        { "field": "enabled", "boolean_value": true }
      ]
    }
  ],
  "clarifications": [],
  "assumptions": []
}
```

`program` must be an array of commands.

## Supported commands

The interpreter currently supports exactly these command kinds:
- `set_top_field`
- `clear_operations`
- `set_operation_fields`
- `append_group`
- `set_group_operation_fields`
- `rename_group_operation`
- `replace_sections`

## Command encoding

Two wire formats are accepted.

Direct form:

```json
{
  "kind": "set_operation_fields",
  "operation": "updates",
  "fields": [
    { "field": "op_count", "number_value": 1000000 }
  ]
}
```

Alias form:

```json
{
  "command": "set_operation_fields",
  "operation": "updates",
  "fields": [
    { "field": "op_count", "number_value": 1000000 }
  ]
}
```

Nested form:

```json
{
  "set_operation_fields": {
    "operation": "updates",
    "fields": [
      { "field": "op_count", "number_value": 1000000 }
    ]
  }
}
```

The backend canonicalizes all of these into the same internal command representation before interpretation.

## Typed values

Top-level field commands and operation field entries use typed value slots.

Supported slots:
- `string_value`
- `number_value`
- `boolean_value`
- `json_value`

Only one slot should be populated for a given field entry.

Examples:

```json
{ "field": "op_count", "number_value": 50000 }
```

```json
{ "field": "enabled", "boolean_value": true }
```

```json
{ "field": "selection_distribution", "string_value": "zipf" }
```

```json
{
  "field": "selection",
  "json_value": "{\"uniform\":{\"min\":1,\"max\":1000000}}"
}
```

## `set_top_field`

Sets a top-level patch field.

Shape:

```json
{
  "kind": "set_top_field",
  "field": "character_set",
  "string_value": "alphanumeric"
}
```

Supported fields:
- `character_set`
- `sections_count`
- `groups_per_section`
- `skip_key_contains_check`

Notes:
- `character_set` expects `string_value`
- `sections_count` and `groups_per_section` accept `number_value` or numeric `string_value`
- `skip_key_contains_check` expects `boolean_value`

## `clear_operations`

Clears the accumulated flat operation edits in the generated patch.

Shape:

```json
{
  "kind": "clear_operations"
}
```

Semantics:
- sets `clear_operations = true`
- resets the current flat `operations` map for this interpreted program

This command does not directly rewrite `sections`. Structural replacement is handled separately through `replace_sections`.

## `set_operation_fields`

Sets fields for one operation in the flat `patch.operations` map.

Shape:

```json
{
  "kind": "set_operation_fields",
  "operation": "point_queries",
  "fields": [
    { "field": "op_count", "number_value": 50000 },
    { "field": "selection_distribution", "string_value": "uniform" }
  ]
}
```

Semantics:
- commands for the same operation merge
- if any non-empty field patch is emitted and `enabled` is not explicitly present, the interpreter sets `enabled = true`
- unknown operation names are ignored

Typical uses:
- enabling an operation
- changing counts
- changing distribution or range parameters
- setting operation-local character sets

## `append_group`

Appends a new group to an existing section.

Shape:

```json
{
  "kind": "append_group",
  "section_index": 1,
  "group": {
    "operations": [
      {
        "name": "point_deletes",
        "fields": [
          { "field": "enabled", "boolean_value": true }
        ]
      }
    ]
  }
}
```

Semantics:
- `section_index` is 1-based and defaults to `1`
- the interpreter starts from the current section/group structure
- the new group is appended to the target section unless `after_group_index` is provided
- only the new group is added; existing groups are preserved

Typical uses:
- `add another group`
- `add a second group`
- `append a new phase group with deletes`

## `set_group_operation_fields`

Sets fields for one operation inside a specific group.

Shape:

```json
{
  "kind": "set_group_operation_fields",
  "section_index": 1,
  "group_index": 2,
  "operation": "point_queries",
  "fields": [
    { "field": "selection_distribution", "string_value": "normal" }
  ]
}
```

Semantics:
- `section_index` and `group_index` are 1-based
- the interpreter edits only the targeted group
- if non-empty fields are set and `enabled` is not present, the operation is enabled
- if the resulting operation becomes disabled or empty, it is removed from that group

Typical uses:
- changing distribution in one group
- changing counts in one later phase
- enabling or disabling one group-local operation without rewriting the full structure

## `rename_group_operation`

Converts one operation into another inside a specific group.

Shape:

```json
{
  "kind": "rename_group_operation",
  "section_index": 1,
  "group_index": 2,
  "from_operation": "updates",
  "to_operation": "merges"
}
```

Semantics:
- `section_index` and `group_index` are 1-based
- the interpreter copies the source operation fields into the target operation
- unrelated operations in the same group are preserved
- the source operation is removed from that group

Typical uses:
- `change updates in group 2 to merges`
- `convert inserts in group 3 to updates`

## `replace_sections`

Replaces the structured section/group layout in the patch.

Shape:

```json
{
  "kind": "replace_sections",
  "sections": [
    {
      "groups": [
        {
          "inserts": {
            "enabled": true,
            "op_count": 5000000
          }
        }
      ]
    },
    {
      "groups": [
        {
          "updates": {
            "enabled": true,
            "op_count": 1000000
          }
        }
      ]
    }
  ]
}
```

Semantics:
- replaces `patch.sections`
- derives:
  - `sections_count`
  - `groups_per_section`

Use this command when the model needs to express explicit structure, such as:
- multi-phase workloads
- targeted section/group layouts
- explicit structural rewrites

## Interpreter rules

The deterministic interpreter currently applies these rules:

1. Commands are interpreted in order.
2. Unknown commands are ignored.
3. Repeated `set_operation_fields` commands merge into the same flat operation patch.
4. `clear_operations` resets previously accumulated flat operation patches.
5. `replace_sections` sets structured layout metadata from the provided sections.
6. The result of program interpretation is still normalized by the backend before it is used.

## Relationship to final patch

The DSL is not the final UI/backend patch format.

Pipeline:

```text
AI output -> program -> deterministic interpreter -> patch normalization -> state merge -> final workload JSON
```

This distinction matters:
- the DSL is intentionally small
- fallback logic, clarifications, assumptions, and state-aware merge behavior happen after interpretation

## Design constraints

The DSL is intentionally limited.

It is designed to encode:
- intent
- targeted edits
- bounded structural replacements

It is not designed to let the model freely invent arbitrary final backend state.

## Verification boundary

What we can verify:
- the interpreter semantics
- structural invariants after interpretation
- that only explicit structural commands rewrite sections

What we cannot verify here:
- whether the model interpreted the user’s English correctly

That is why the DSL exists: it reduces the untrusted surface to a small, deterministic command language.
