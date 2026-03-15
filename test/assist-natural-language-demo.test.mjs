import assert from "node:assert/strict";
import test from "node:test";

import { __test } from "../src/index.js";

const { normalizeAssistPayload, normalizeFormState, normalizeSchemaHints } =
  __test;

const OPERATION_ORDER = [
  "inserts",
  "updates",
  "merges",
  "point_queries",
  "range_queries",
  "point_deletes",
  "range_deletes",
  "empty_point_queries",
  "empty_point_deletes",
  "sorted",
];

const OPERATION_LABELS = {
  inserts: "inserts",
  updates: "updates",
  merges: "merges",
  point_queries: "point queries",
  range_queries: "range queries",
  point_deletes: "point deletes",
  range_deletes: "range deletes",
  empty_point_queries: "empty point queries",
  empty_point_deletes: "empty point deletes",
  sorted: "sorted",
};

const CAPABILITIES = {
  inserts: {
    has_op_count: true,
    has_key: true,
    has_val: true,
    has_selection: false,
    has_range: false,
    has_sorted: false,
    has_character_set: true,
  },
  updates: {
    has_op_count: true,
    has_key: false,
    has_val: true,
    has_selection: true,
    has_range: false,
    has_sorted: false,
    has_character_set: true,
  },
  merges: {
    has_op_count: true,
    has_key: false,
    has_val: true,
    has_selection: true,
    has_range: false,
    has_sorted: false,
    has_character_set: true,
  },
  point_queries: {
    has_op_count: true,
    has_key: false,
    has_val: false,
    has_selection: true,
    has_range: false,
    has_sorted: false,
    has_character_set: false,
  },
  range_queries: {
    has_op_count: true,
    has_key: false,
    has_val: false,
    has_selection: true,
    has_range: true,
    has_sorted: false,
    has_character_set: false,
  },
  point_deletes: {
    has_op_count: true,
    has_key: false,
    has_val: false,
    has_selection: true,
    has_range: false,
    has_sorted: false,
    has_character_set: false,
  },
  range_deletes: {
    has_op_count: true,
    has_key: false,
    has_val: false,
    has_selection: true,
    has_range: true,
    has_sorted: false,
    has_character_set: false,
  },
  empty_point_queries: {
    has_op_count: true,
    has_key: true,
    has_val: false,
    has_selection: false,
    has_range: false,
    has_sorted: false,
    has_character_set: true,
  },
  empty_point_deletes: {
    has_op_count: true,
    has_key: true,
    has_val: false,
    has_selection: false,
    has_range: false,
    has_sorted: false,
    has_character_set: true,
  },
  sorted: {
    has_op_count: true,
    has_key: false,
    has_val: false,
    has_selection: false,
    has_range: false,
    has_sorted: true,
    has_character_set: false,
  },
};

const SCHEMA_HINTS = normalizeSchemaHints({
  operation_order: OPERATION_ORDER,
  operation_labels: OPERATION_LABELS,
  capabilities: CAPABILITIES,
});

function createFormState(operationOverrides = {}) {
  return normalizeFormState(
    {
      character_set: "alphanumeric",
      sections_count: 1,
      groups_per_section: 1,
      skip_key_contains_check: true,
      operations: operationOverrides,
    },
    SCHEMA_HINTS,
  );
}

function requestAssist(prompt) {
  return normalizeAssistPayload(
    {
      summary: "Applied prompt.",
      patch: {
        operations: {},
      },
      clarifications: [],
      assumptions: [],
    },
    SCHEMA_HINTS,
    createFormState({}),
    prompt,
  );
}

function getConfiguredOperations(group) {
  return OPERATION_ORDER.filter((operationName) =>
    Object.prototype.hasOwnProperty.call(group || {}, operationName),
  ).sort();
}

function assertSectionGroupShape(body, expectedGroupCount) {
  assert.equal(Array.isArray(body.patch.sections), true);
  assert.equal(body.clarifications.length, 0);
  assert.equal(body.patch.sections.length, 1);
  assert.equal(body.patch.sections[0].groups.length, expectedGroupCount);
}

function assertGroupOperations(body, sectionIndex, groupIndex, expectedOps) {
  const group = body.patch.sections[sectionIndex].groups[groupIndex];
  assert.deepEqual(getConfiguredOperations(group), [...expectedOps].sort());
}

test("demo 1: single shot workload", async (t) => {
  const scenarios = [
    {
      name: "single shot inserts",
      prompt: "Generate a single shot workload with 1M inserts",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 1000000);
      },
    },
    {
      name: "single shot insert-only wording",
      prompt: "Generate a single shot insert-only workload with 250k inserts",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 250000);
      },
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const body = await requestAssist(scenario.prompt);

      assertSectionGroupShape(body, 1);
      scenario.assertions(body);
    });
  }
});

test("demo 2: two phase interleaved workload", async (t) => {
  const scenarios = [
    {
      name: "preload plus interleave with raw counts and short range queries",
      prompt:
        "Preload the DB with 1M inserts, then interleave 300k updates and 200k short range queries",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["range_queries", "updates"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 1000000);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 300000);
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.op_count,
          200000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.selectivity,
          0.001,
        );
      },
    },
    {
      name: "preload plus percentage interleave",
      prompt:
        "Preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          400000,
        );
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 100000);
      },
    },
    {
      name: "write heavy phrasing",
      prompt:
        "Preload the DB with 1M inserts, then interleave a write heavy phase with 70% updates and 30% point queries for 400k operations",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 280000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          120000,
        );
      },
    },
    {
      name: "write only phrasing",
      prompt: "Preload the DB with 1M inserts, then write only for 250k operations",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["updates"]);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 250000);
      },
    },
    {
      name: "long range query phrasing",
      prompt:
        "Preload the DB with 1M inserts, then interleave 300k point queries and 200k long range queries",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "range_queries"]);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          300000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.op_count,
          200000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.selectivity,
          0.1,
        );
      },
    },
    {
      name: "load the database phrasing with percentage long range queries",
      prompt:
        "Load the database with 2M inserts, then interleave 75% point queries and 25% long range queries for 800k operations",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 2000000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          600000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.op_count,
          200000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.selectivity,
          0.1,
        );
      },
    },
    {
      name: "seed the database phrasing with percentage short range queries",
      prompt:
        "Seed the database with 2M inserts, then interleave 60% point queries and 40% short range queries for 500k operations",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 2000000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          300000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.op_count,
          200000,
        );
        assert.equal(
          body.patch.sections[0].groups[1].range_queries.selectivity,
          0.001,
        );
      },
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const body = await requestAssist(scenario.prompt);

      assertSectionGroupShape(body, 2);
      scenario.assertions(body);
    });
  }
});

test("demo 3: three phase interleaved workload", async (t) => {
  const scenarios = [
    {
      name: "write-heavy then analytics",
      prompt:
        "Build a three phase workload: preload the DB with 1M inserts, then interleave a write-heavy phase with 70% updates and 30% point queries for 400k operations, then interleave 60% point queries and 40% long range queries for 600k operations.",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assertGroupOperations(body, 0, 2, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 1000000);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 280000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          120000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].point_queries.op_count,
          360000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.op_count,
          240000,
        );
      },
    },
    {
      name: "high level serving then broader scan",
      prompt:
        "I want three phases: seed the database, then a hot serving phase, then a broader scan phase. Preload 1M inserts, then interleave 80% point queries and 20% updates for 500k operations, then interleave 70% point queries and 30% long range queries for 300k operations.",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assertGroupOperations(body, 0, 2, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 1000000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          400000,
        );
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 100000);
        assert.equal(
          body.patch.sections[0].groups[2].point_queries.op_count,
          210000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.op_count,
          90000,
        );
      },
    },
    {
      name: "high level write only then short range read phase",
      prompt:
        "Generate a three phase workload: first load the database with 5M inserts, next run a write-only phase for 1M operations, then run an interleaved read phase with 80% point queries and 20% short range queries for 2M operations.",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["updates"]);
        assertGroupOperations(body, 0, 2, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 5000000);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 1000000);
        assert.equal(
          body.patch.sections[0].groups[2].point_queries.op_count,
          1600000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.op_count,
          400000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.selectivity,
          0.001,
        );
      },
    },
    {
      name: "mixed read-write then analytics phase phrasing",
      prompt:
        "Create a three phase workload with a preload phase, then a mixed read/write phase, then a query-heavy analytics phase. Preload 2M inserts, then interleave 500k updates and 500k point queries, then interleave 800k point queries and 200k long range queries.",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assertGroupOperations(body, 0, 2, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 2000000);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 500000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          500000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].point_queries.op_count,
          800000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.op_count,
          200000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.selectivity,
          0.1,
        );
      },
    },
    {
      name: "explicit percentage mixes across both later phases",
      prompt:
        "Make a three phase workload where we first preload the DB, then do an interleaved write-heavy phase, then do an interleaved read-heavy phase. Use 1M inserts, then 600k operations at 75% updates and 25% point queries, then 900k operations at 90% point queries and 10% range queries.",
      assertions(body) {
        assertGroupOperations(body, 0, 0, ["inserts"]);
        assertGroupOperations(body, 0, 1, ["point_queries", "updates"]);
        assertGroupOperations(body, 0, 2, ["point_queries", "range_queries"]);
        assert.equal(body.patch.sections[0].groups[0].inserts.op_count, 1000000);
        assert.equal(body.patch.sections[0].groups[1].updates.op_count, 450000);
        assert.equal(
          body.patch.sections[0].groups[1].point_queries.op_count,
          150000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].point_queries.op_count,
          810000,
        );
        assert.equal(
          body.patch.sections[0].groups[2].range_queries.op_count,
          90000,
        );
      },
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const body = await requestAssist(scenario.prompt);

      assertSectionGroupShape(body, 3);
      scenario.assertions(body);
    });
  }
});
