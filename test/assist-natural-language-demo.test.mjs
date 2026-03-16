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

const DEMO_SINGLE_SHOT_PROMPTS = {
  singleShotInserts: "Generate a workload with 1M inserts",
  singleShotInsertOnly:
    "Generate a insert-only workload with 250k inserts",
};

const DEMO_TWO_PHASE_PROMPTS = {
  rawCountsWithShortRange:
    "Preload the DB with 1M inserts, then interleave 300k updates and 200k short range queries",
  percentageMix:
    "Preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations",
  writeHeavy:
    "Preload the DB with 1M inserts, then interleave a write heavy phase with 70% updates and 30% point queries for 400k operations",
  writeOnly:
    "Preload the DB with 1M inserts, then write only for 250k operations",
  longRange:
    "Preload the DB with 1M inserts, then interleave 300k point queries and 200k long range queries",
  loadDatabaseWithLongRangePercentages:
    "Load the database with 2M inserts, then interleave 75% point queries and 25% long range queries for 800k operations",
  seedDatabaseWithShortRangePercentages:
    "Seed the database with 2M inserts, then interleave 60% point queries and 40% short range queries for 500k operations",
};

const DEMO_THREE_PHASE_PROMPTS = {
  writeHeavyThenAnalytics:
    "Build a three phase workload: preload the DB with 1M inserts, then interleave a write-heavy phase with 70% updates and 30% point queries for 400k operations, then interleave 60% point queries and 40% long range queries for 600k operations.",
  hotServingThenBroaderScan:
    "I want three phases: seed the database, then a hot serving phase, then a broader scan phase. Preload 1M inserts, then interleave 80% point queries and 20% updates for 500k operations, then interleave 70% point queries and 30% long range queries for 300k operations.",
  writeOnlyThenShortRangeRead:
    "Generate a three phase workload: first load the database with 5M inserts, next run a write-only phase for 1M operations, then run an interleaved read phase with 80% point queries and 20% short range queries for 2M operations.",
  mixedReadWriteThenAnalytics:
    "Create a three phase workload with a preload phase, then a mixed read/write phase, then a query-heavy analytics phase. Preload 2M inserts, then interleave 500k updates and 500k point queries, then interleave 800k point queries and 200k long range queries.",
  explicitPercentageMixes:
    "Make a three phase workload where we first preload the DB, then do an interleaved write-heavy phase, then do an interleaved read-heavy phase. Use 1M inserts, then 600k operations at 75% updates and 25% point queries, then 900k operations at 90% point queries and 10% range queries.",
};

async function requestAssist(prompt) {
  return requestLiveAssist({ prompt, provider: LIVE_PROVIDER });
}

function assertSectionGroupShape(body, expectedGroupCount) {
  assert.equal(Array.isArray(body.patch.sections), true);
  assert.equal(body.clarifications.length, 0);
  assert.equal(body.patch.sections.length, 1);
  assert.equal(body.patch.sections[0].groups.length, expectedGroupCount);
}

function assertGroupOperations(body, sectionIndex, groupIndex, expectedOps) {
  const group = body.patch.sections[sectionIndex].groups[groupIndex];
  assert.deepEqual(configuredOperations(group), [...expectedOps].sort());
}

test(
  "demo 1: single shot workload",
  { skip: !LIVE_PROVIDER.binding, timeout: 120000 },
  async (t) => {
    const scenarios = [
      {
        name: "single shot inserts",
        prompt: DEMO_SINGLE_SHOT_PROMPTS.singleShotInserts,
        assertions(body) {
          const state = applyPatchToState(createFormState({}), body.patch);
          assert.equal(state.sections_count, 1);
          assert.equal(state.groups_per_section, 1);
          assert.equal(state.operations.inserts.enabled, true);
          assert.equal(state.operations.inserts.op_count, 1000000);
        },
      },
      {
        name: "single shot insert-only wording",
        prompt: DEMO_SINGLE_SHOT_PROMPTS.singleShotInsertOnly,
        assertions(body) {
          const state = applyPatchToState(createFormState({}), body.patch);
          assert.equal(state.sections_count, 1);
          assert.equal(state.groups_per_section, 1);
          assert.equal(state.operations.inserts.enabled, true);
          assert.equal(state.operations.inserts.op_count, 250000);
        },
      },
    ];

    for (const scenario of scenarios) {
      await t.test(scenario.name, { timeout: 60000 }, async () => {
        const body = await requestAssist(scenario.prompt);
        assert.equal(typeof body.summary, "string");
        assert.ok(body.summary.trim().length > 0);
        assert.equal(body.clarifications.length, 0);
        scenario.assertions(body);
      });
    }
  },
);

test(
  "demo 2: two phase interleaved workload",
  { skip: !LIVE_PROVIDER.binding, timeout: 240000 },
  async (t) => {
    const scenarios = [
      {
        name: "preload plus interleave with raw counts and short range queries",
        prompt: DEMO_TWO_PHASE_PROMPTS.rawCountsWithShortRange,
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
        prompt: DEMO_TWO_PHASE_PROMPTS.percentageMix,
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
        prompt: DEMO_TWO_PHASE_PROMPTS.writeHeavy,
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
        prompt: DEMO_TWO_PHASE_PROMPTS.writeOnly,
        assertions(body) {
          assertGroupOperations(body, 0, 0, ["inserts"]);
          assertGroupOperations(body, 0, 1, ["updates"]);
          assert.equal(body.patch.sections[0].groups[1].updates.op_count, 250000);
        },
      },
      {
        name: "long range query phrasing",
        prompt: DEMO_TWO_PHASE_PROMPTS.longRange,
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
        prompt: DEMO_TWO_PHASE_PROMPTS.loadDatabaseWithLongRangePercentages,
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
        prompt: DEMO_TWO_PHASE_PROMPTS.seedDatabaseWithShortRangePercentages,
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
      await t.test(scenario.name, { timeout: 60000 }, async () => {
        const body = await requestAssist(scenario.prompt);
        assert.equal(typeof body.summary, "string");
        assert.ok(body.summary.trim().length > 0);
        assertSectionGroupShape(body, 2);
        scenario.assertions(body);
      });
    }
  },
);

test(
  "demo 3: three phase interleaved workload",
  { skip: !LIVE_PROVIDER.binding, timeout: 240000 },
  async (t) => {
    const scenarios = [
      {
        name: "write-heavy then analytics",
        prompt: DEMO_THREE_PHASE_PROMPTS.writeHeavyThenAnalytics,
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
        prompt: DEMO_THREE_PHASE_PROMPTS.hotServingThenBroaderScan,
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
        prompt: DEMO_THREE_PHASE_PROMPTS.writeOnlyThenShortRangeRead,
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
        prompt: DEMO_THREE_PHASE_PROMPTS.mixedReadWriteThenAnalytics,
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
        prompt: DEMO_THREE_PHASE_PROMPTS.explicitPercentageMixes,
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
      await t.test(scenario.name, { timeout: 60000 }, async () => {
        const body = await requestAssist(scenario.prompt);
        assert.equal(typeof body.summary, "string");
        assert.ok(body.summary.trim().length > 0);
        assertSectionGroupShape(body, 3);
        scenario.assertions(body);
      });
    }
  },
);
