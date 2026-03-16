import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPatchToState,
  createFormState,
  getSelectedProviderConfig,
  requestLiveAssist,
} from "./live-assist-test-helpers.mjs";

const LIVE_PROVIDER = getSelectedProviderConfig();
const PROVIDER_COVERAGE_PROMPT = "Add 50k point querie";

test(
  "live provider coverage: /api/assist uses the selected real AI binding",
  { skip: !LIVE_PROVIDER.binding, timeout: 60000 },
  async () => {
    const body = await requestLiveAssist({
      prompt: PROVIDER_COVERAGE_PROMPT,
      formState: createFormState({}),
      provider: LIVE_PROVIDER,
    });

    const state = applyPatchToState(createFormState({}), body.patch);
    assert.equal(typeof body.summary, "string");
    assert.ok(body.summary.trim().length > 0);
    assert.equal(state.operations.point_queries.enabled, true);
    assert.equal(state.operations.point_queries.op_count, 50000);
  },
);
