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

function buildCurrentJson(state) {
  if (
    !state ||
    !Array.isArray(state.sections) ||
    !state.sections.some(
      (section) =>
        section &&
        Array.isArray(section.groups) &&
        section.groups.some(
          (group) => group && Object.keys(group).length > 0,
        ),
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

async function createOneGroupWriteReadState() {
  return {
    state: createFormState({
      inserts: { enabled: true, op_count: 250000 },
      point_queries: {
        enabled: true,
        op_count: 5000,
        selection_distribution: "uniform",
      },
    }),
    conversation: [],
  };
}

async function createTwoGroupWriteDeleteState() {
  return {
    state: applyPatchToState(createFormState({}), {
      sections: [
        {
          groups: [
            {
              inserts: {
                op_count: 250000,
              },
            },
            {
              updates: {
                op_count: 5000,
                selection_distribution: "uniform",
              },
              range_deletes: {
                op_count: 5000,
                selection_distribution: "uniform",
                selectivity: 0.01,
                range_format: "StartCount",
              },
            },
          ],
        },
      ],
      sections_count: 1,
      groups_per_section: 2,
    }),
    conversation: [],
  };
}

test(
  "structural intent paraphrases: append-group variants map to a new delete group",
  { skip: !LIVE_PROVIDER.binding, timeout: 240000 },
  async () => {
    const prompts = [
      "Add another group with point deletes, range deletes, and empty point deletes",
      "Create a new group for point deletes, range deletes, and empty point deletes",
      "Put point deletes, range deletes, and empty point deletes into a second group",
    ];

    for (const prompt of prompts) {
      const { state: initialState, conversation } =
        await createOneGroupWriteReadState();
      const result = await applyAssistTurn({
        prompt,
        state: initialState,
        conversation,
      });
      const state = result.nextState;

      assert.equal(state.sections_count, 1, prompt);
      assert.equal(state.groups_per_section, 2, prompt);
      assert.deepEqual(
        configuredOperations(state.sections[0].groups[0]),
        ["inserts", "point_queries"],
        prompt,
      );
      assert.deepEqual(
        configuredOperations(state.sections[0].groups[1]),
        ["empty_point_deletes", "point_deletes", "range_deletes"],
        prompt,
      );
    }
  },
);

test(
  "structural intent paraphrases: rename variants only rewrite the targeted second group",
  { skip: !LIVE_PROVIDER.binding, timeout: 240000 },
  async () => {
    const prompts = [
      "Change updates in group 2 to merges",
      "Convert the second group's updates into merges",
      "In group 2, replace updates with merges",
    ];

    for (const prompt of prompts) {
      const { state: initialState, conversation } =
        await createTwoGroupWriteDeleteState();
      const result = await applyAssistTurn({
        prompt,
        state: initialState,
        conversation,
      });
      const state = result.nextState;

      assert.equal(state.sections_count, 1, prompt);
      assert.equal(state.groups_per_section, 2, prompt);
      assert.deepEqual(
        configuredOperations(state.sections[0].groups[0]),
        ["inserts"],
        prompt,
      );
      assert.deepEqual(
        configuredOperations(state.sections[0].groups[1]),
        ["merges", "range_deletes"],
        prompt,
      );
      assert.equal(state.sections[0].groups[1].updates, undefined, prompt);
    }
  },
);
