import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPatchToState,
  configuredOperations,
  createFormState,
  getSelectedProviderConfig,
  requestLiveAssist,
} from "./live-assist-test-helpers.mjs";

const LIVE_PROVIDER = getSelectedProviderConfig();

const TWO_PHASE_EQUIVALENT_PROMPTS = [
  "Preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations",
  "Please preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations.",
  "Can you preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations?",
  "Seed the database with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations",
  "Load the database with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations",
];

function createInsertSeed() {
  return {
    enabled: true,
    character_set: "alphanumeric",
    op_count: 1000000,
    key: "id",
    val: { uniform: { len: 16 } },
  };
}

async function requestAssist(prompt, formState = createFormState({})) {
  return requestLiveAssist({ prompt, formState, provider: LIVE_PROVIDER });
}

test(
  "ambiguity prompts keep required clarifications and suppress guessed operations",
  { skip: !LIVE_PROVIDER.binding, timeout: 120000 },
  async (t) => {
    const cases = [
      {
        name: "generic workload",
        prompt: "Generate a workload",
        expectedBindingType: "operations_set",
      },
      {
        name: "queries",
        prompt: "Add queries",
        expectedBindingType: "operations_set",
      },
      {
        name: "deletes",
        prompt: "Add deletes",
        expectedBindingType: "operations_set",
      },
    ];

    for (const testCase of cases) {
      await t.test(testCase.name, { timeout: 60000 }, async () => {
        const result = await requestAssist(
          testCase.prompt,
          createFormState({ inserts: createInsertSeed() }),
        );

        assert.equal(result.clarifications.length, 1);
        assert.equal(
          result.clarifications[0].binding.type,
          testCase.expectedBindingType,
        );
        assert.deepEqual(result.patch.operations || {}, {});
        assert.equal(result.patch.clear_operations, false);
      });
    }
  },
);

test(
  "synonym and filler variants normalize to the same two-phase structure",
  { skip: !LIVE_PROVIDER.binding, timeout: 300000 },
  async (t) => {
    for (const prompt of TWO_PHASE_EQUIVALENT_PROMPTS) {
      await t.test(prompt, { timeout: 60000 }, async () => {
        const result = await requestAssist(prompt);

        assert.equal(result.patch.sections.length, 1);
        assert.equal(result.patch.sections[0].groups.length, 2);
        assert.deepEqual(
          configuredOperations(result.patch.sections[0].groups[0]),
          ["inserts"],
        );
        assert.deepEqual(
          configuredOperations(result.patch.sections[0].groups[1]),
          ["point_queries", "updates"],
        );
        assert.equal(result.patch.sections[0].groups[0].inserts.op_count, 1000000);
        assert.equal(
          result.patch.sections[0].groups[1].point_queries.op_count,
          400000,
        );
        assert.equal(result.patch.sections[0].groups[1].updates.op_count, 100000);
      });
    }
  },
);

test(
  "operation synonym prompts map to the intended operation",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async (t) => {
    const cases = [
      {
        name: "point reads",
        prompt: "Add 50k point reads",
        expectedOperation: "point_queries",
      },
      {
        name: "read modify write",
        prompt: "Add 50k read-modify-write operations",
        expectedOperation: "merges",
      },
      {
        name: "rmw shorthand",
        prompt: "Add 50k rmw operations",
        expectedOperation: "merges",
      },
    ];

    for (const testCase of cases) {
      await t.test(testCase.name, { timeout: 60000 }, async () => {
        const result = await requestAssist(
          testCase.prompt,
          createFormState({ inserts: createInsertSeed() }),
        );

        assert.deepEqual(Object.keys(result.patch.operations).sort(), [
          testCase.expectedOperation,
        ]);
        assert.equal(
          result.patch.operations[testCase.expectedOperation].enabled,
          true,
        );
        assert.equal(
          result.patch.operations[testCase.expectedOperation].op_count,
          50000,
        );
      });
    }
  },
);

test(
  "multi-turn regression: insert-only then add point reads then change distribution",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async () => {
    let state = createFormState({});

    const first = await requestAssist(
      "Generate an insert-only workload with 1M operations",
      state,
    );
    state = applyPatchToState(state, first.patch);

    const second = await requestAssist("Add 50k point reads", state);
    state = applyPatchToState(state, second.patch);

    const third = await requestAssist(
      "change point queries distribution to zipf",
      state,
    );

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 1);
    assert.equal(state.operations.inserts.enabled, true);
    assert.equal(state.operations.inserts.op_count, 1000000);
    assert.deepEqual(Object.keys(second.patch.operations).sort(), ["point_queries"]);
    assert.equal(second.patch.operations.point_queries.op_count, 50000);
    assert.deepEqual(Object.keys(third.patch.operations).sort(), ["point_queries"]);
    assert.equal(
      third.patch.operations.point_queries.selection_distribution,
      "zipf",
    );
  },
);

test(
  "multi-turn regression: insert-only then add point reads",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async () => {
    let state = createFormState({});

    const first = await requestAssist(
      "Generate an insert-only workload with 250k inserts",
      state,
    );
    state = applyPatchToState(state, first.patch);

    const second = await requestAssist("Add 5k point reads", state);
    state = applyPatchToState(state, second.patch);

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 1);
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[0]),
      ["inserts", "point_queries"],
    );
    assert.equal(state.operations.inserts.op_count, 250000);
    assert.equal(state.operations.point_queries.op_count, 5000);
  },
);

test(
  "multi-turn regression: insert-only then interleave point queries with inserts",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async () => {
    let state = createFormState({});

    const first = await requestAssist(
      "Generate a insert-only workload with 250k inserts",
      state,
    );
    state = applyPatchToState(state, first.patch);

    const second = await requestAssist(
      "interleave 5k point queries with the inserts",
      state,
    );
    state = applyPatchToState(state, second.patch);

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 1);
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[0]),
      ["inserts", "point_queries"],
    );
    assert.equal(state.operations.inserts.enabled, true);
    assert.equal(state.operations.inserts.op_count, 250000);
    assert.equal(state.operations.point_queries.enabled, true);
    assert.equal(state.operations.point_queries.op_count, 5000);
    assert.equal(second.patch.sections, null);
    assert.equal(second.patch.operations.point_queries.op_count, 5000);
  },
);

test(
  "multi-turn regression: insert-only then add a later phase",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async () => {
    let state = createFormState({});

    const first = await requestAssist(
      "Generate an insert-only workload with 250k inserts",
      state,
    );
    state = applyPatchToState(state, first.patch);

    const second = await requestAssist(
      "then add a second phase with 5k point queries",
      state,
    );
    state = applyPatchToState(state, second.patch);

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 2);
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[0]),
      ["inserts"],
    );
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[1]),
      ["point_queries"],
    );
    assert.equal(state.sections[0].groups[0].inserts.op_count, 250000);
    assert.equal(state.sections[0].groups[1].point_queries.op_count, 5000);
  },
);

test(
  "multi-turn regression: add range deletes, edit distribution, then remove",
  { skip: !LIVE_PROVIDER.binding, timeout: 180000 },
  async () => {
    let state = createFormState({});

    const first = await requestAssist(
      "Generate an insert-only workload with 1M operations",
      state,
    );
    state = applyPatchToState(state, first.patch);

    const second = await requestAssist("Add 50k range deletes", state);
    state = applyPatchToState(state, second.patch);

    const third = await requestAssist(
      "change range deletes distribution to normal",
      state,
    );
    state = applyPatchToState(state, third.patch);

    const fourth = await requestAssist("remove range deletes", state);

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 1);
    assert.equal(state.operations.inserts.enabled, true);
    assert.equal(state.operations.inserts.op_count, 1000000);
    assert.deepEqual(Object.keys(second.patch.operations).sort(), ["range_deletes"]);
    assert.equal(second.patch.operations.range_deletes.op_count, 50000);
    assert.deepEqual(Object.keys(third.patch.operations).sort(), ["range_deletes"]);
    assert.equal(
      third.patch.operations.range_deletes.selection_distribution,
      "normal",
    );
    assert.deepEqual(Object.keys(fourth.patch.operations).sort(), ["range_deletes"]);
    assert.equal(fourth.patch.operations.range_deletes.enabled, false);
  },
);
