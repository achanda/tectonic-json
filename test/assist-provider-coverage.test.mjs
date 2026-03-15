import assert from "node:assert/strict";
import test from "node:test";

import workerEntrypoint, { __test } from "../src/index.js";

const { normalizeFormState, normalizeSchemaHints } = __test;

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

function createRequest(prompt) {
  return new Request("https://example.com/api/assist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      form_state: createFormState({
        inserts: {
          enabled: true,
          character_set: "alphanumeric",
          op_count: 1000000,
          key: "id",
          val: { uniform: { len: 16 } },
        },
      }),
      schema_hints: SCHEMA_HINTS,
      current_json: null,
      conversation: [],
      answers: {},
    }),
  });
}

test("provider coverage: /api/assist normalizes prompts through both cloudflare and openai paths", async (t) => {
  const providers = [
    {
      name: "cloudflare",
      env: {
        ASSIST_PROVIDER: "cloudflare",
        CLOUDFLARE_MODEL: "@cf/meta/llama-3.1-8b-instruct",
      },
      assertRequest(call) {
        assert.equal(call.model, "@cf/meta/llama-3.1-8b-instruct");
        assert.equal(call.options.response_format?.type, "json_schema");
        assert.equal(call.options.tools, null);
        assert.equal(call.options.tool_choice, null);
      },
    },
    {
      name: "openai",
      env: {
        ASSIST_PROVIDER: "openai",
        OPENAI_MODEL: "gpt-5.1",
      },
      assertRequest(call) {
        assert.equal(call.model, "gpt-5.1");
        assert.equal(call.options.response_format, null);
        assert.equal(Array.isArray(call.options.tools), true);
        assert.equal(call.options.tools.length, 1);
        assert.equal(call.options.tools[0].type, "function");
        assert.deepEqual(call.options.tool_choice, {
          type: "function",
          name: "submit_workload_patch",
        });
      },
    },
  ];

  for (const provider of providers) {
    await t.test(provider.name, async () => {
      const calls = [];
      const response = await workerEntrypoint.fetch(
        createRequest("Add 50k point querie"),
        {
          ...provider.env,
          AI: {
            run: async (model, options) => {
              calls.push({ model, options });
              return {
                response: JSON.stringify({
                  summary: "Update the workload with 50k point queries.",
                  patch: {
                    operations: {
                      empty_point_deletes: {
                        enabled: true,
                        op_count: 500000,
                      },
                    },
                  },
                  clarifications: [],
                  assumptions: [],
                }),
              };
            },
          },
          ASSETS: {
            fetch: async () => new Response("not found", { status: 404 }),
          },
        },
      );

      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(calls.length, 1);
      provider.assertRequest(calls[0]);
      assert.deepEqual(Object.keys(body.patch.operations).sort(), [
        "point_queries",
      ]);
      assert.equal(body.patch.operations.point_queries.enabled, true);
      assert.equal(body.patch.operations.point_queries.op_count, 50000);
    });
  }
});
