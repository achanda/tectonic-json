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
const OLLAMA_ONLY = !LIVE_PROVIDER.binding || LIVE_PROVIDER.name !== "ollama";

function buildCurrentJson(state) {
  if (
    !state ||
    !Array.isArray(state.sections) ||
    !state.sections.some(
      (section) =>
        section &&
        Array.isArray(section.groups) &&
        section.groups.some((group) => group && Object.keys(group).length > 0),
    )
  ) {
    return null;
  }
  return {
    character_set: state.character_set,
    sections: JSON.parse(JSON.stringify(state.sections)),
  };
}

function appendConversation(conversation, prompt, result) {
  return [
    ...conversation,
    { role: "user", text: prompt },
    { role: "assistant", text: result.summary || "" },
  ];
}

async function applyAssistTurn({ prompt, state, conversation, answers = {} }) {
  const result = await requestLiveAssist({
    prompt,
    formState: state,
    currentJson: buildCurrentJson(state),
    conversation,
    answers,
    provider: LIVE_PROVIDER,
  });
  return {
    result,
    nextState: applyPatchToState(state, result.patch),
    nextConversation: appendConversation(conversation, prompt, result),
  };
}

function createStructuredState(groups) {
  return applyPatchToState(createFormState({}), {
    sections: [
      {
        character_set: "alphanumeric",
        skip_key_contains_check: true,
        groups,
      },
    ],
    sections_count: 1,
    groups_per_section: groups.length,
    clear_operations: false,
    operations: {},
  });
}

function canonicalGroupProjection(group) {
  const projection = {};
  for (const operationName of configuredOperations(group)) {
    const operation = group[operationName] || {};
    projection[operationName] = {
      op_count: operation.op_count ?? null,
      selection_distribution: operation.selection_distribution || null,
      selection: operation.selection || null,
      selectivity: operation.selectivity ?? null,
    };
  }
  return projection;
}

function canonicalStateProjection(state) {
  return (state.sections?.[0]?.groups || []).map((group) =>
    canonicalGroupProjection(group),
  );
}

test(
  "ollama regression: append a phase then retarget distribution to phase 2",
  { skip: OLLAMA_ONLY, timeout: 240000 },
  async () => {
    let state = createFormState({});
    let conversation = [];

    for (const prompt of [
      "Generate an insert-only workload with 1000 inserts",
      "Add a new phase with 5000 point queries",
      "Change phase 2 point queries distribution to zipf",
    ]) {
      const turn = await applyAssistTurn({ prompt, state, conversation });
      state = turn.nextState;
      conversation = turn.nextConversation;
    }

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
    assert.equal(state.sections[0].groups[0].inserts.op_count, 1000);
    assert.equal(state.sections[0].groups[1].point_queries.op_count, 5000);
    assert.equal(
      state.sections[0].groups[1].point_queries.selection_distribution,
      "zipf",
    );
    assert.ok(state.sections[0].groups[1].point_queries.selection?.zipf);
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        state.sections[0].groups[0],
        "point_queries",
      ),
      false,
    );
  },
);

test(
  "ollama regression: in-place interleaved follow-ups stay in one phase",
  { skip: OLLAMA_ONLY, timeout: 240000 },
  async () => {
    let state = createFormState({});
    let conversation = [];

    for (const prompt of [
      "Generate an insert-only workload with 1000 inserts",
      "Interleave 500 point queries with the inserts",
      "Also add 100 updates",
      "Change the point queries distribution to uniform",
    ]) {
      const turn = await applyAssistTurn({ prompt, state, conversation });
      state = turn.nextState;
      conversation = turn.nextConversation;
    }

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 1);
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[0]),
      ["inserts", "point_queries", "updates"],
    );
    assert.equal(state.sections[0].groups[0].inserts.op_count, 1000);
    assert.equal(state.sections[0].groups[0].point_queries.op_count, 500);
    assert.equal(state.sections[0].groups[0].updates.op_count, 100);
    assert.equal(
      state.sections[0].groups[0].point_queries.selection_distribution,
      "uniform",
    );
  },
);

test(
  "ollama regression: preset-backed state appends a delete-only phase",
  { skip: OLLAMA_ONLY, timeout: 180000 },
  async () => {
    const initialState = createStructuredState([
      {
        inserts: {
          enabled: true,
          op_count: 1000000,
          key: { uniform: { len: 512 } },
          val: { uniform: { len: 512 } },
        },
      },
      {
        empty_point_queries: {
          enabled: true,
          op_count: 800000,
          key: {
            segmented: {
              separator: "",
              segments: [
                { hot_range: { len: 2, amount: 10, probability: 0.7 } },
                { uniform: { len: 30 } },
              ],
            },
          },
        },
        point_queries: {
          enabled: true,
          op_count: 200000,
          selection_distribution: "uniform",
          selection_min: 0,
          selection_max: 1,
        },
      },
    ]);

    const result = await requestLiveAssist({
      prompt: "Add a new phase with 10000 deletes only",
      formState: initialState,
      currentJson: buildCurrentJson(initialState),
      conversation: [],
      provider: LIVE_PROVIDER,
    });
    const state = applyPatchToState(initialState, result.patch);

    assert.equal(state.sections_count, 1);
    assert.equal(state.groups_per_section, 3);
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[0]),
      ["inserts"],
    );
    assert.deepEqual(
      configuredOperations(state.sections[0].groups[1]),
      ["empty_point_queries", "point_queries"],
    );
    const deleteOps = configuredOperations(state.sections[0].groups[2]);
    assert.equal(deleteOps.length, 1);
    assert.ok(
      ["point_deletes", "range_deletes", "empty_point_deletes"].includes(
        deleteOps[0],
      ),
    );
    assert.equal(state.sections[0].groups[2][deleteOps[0]].op_count, 10000);
  },
);

test(
  "ollama regression: phase-targeted conversation is repeatable across runs",
  { skip: OLLAMA_ONLY, timeout: 360000 },
  async () => {
    const prompts = [
      "Generate an insert-only workload with 1000 inserts",
      "Add a new phase with 5000 point queries",
      "Change phase 2 point queries distribution to zipf",
    ];
    const projections = [];

    for (let index = 0; index < 3; index += 1) {
      let state = createFormState({});
      let conversation = [];
      for (const prompt of prompts) {
        const turn = await applyAssistTurn({ prompt, state, conversation });
        state = turn.nextState;
        conversation = turn.nextConversation;
      }
      projections.push(canonicalStateProjection(state));
    }

    assert.deepEqual(projections[0], projections[1]);
    assert.deepEqual(projections[1], projections[2]);
  },
);
