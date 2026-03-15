import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const helperPath = path.resolve(
  "/Users/Abhishek/src/tectonic-json/public/ui-structured-normalization.js",
);

async function loadUiStructuredNormalizer() {
  const source = await fs.readFile(helperPath, "utf8");
  const context = vm.createContext({
    globalThis: {},
  });
  vm.runInContext(source, context, { filename: helperPath });
  return context.globalThis.TectonicUiStructuredNormalization;
}

function createUiStructuredConfig() {
  return {
    defaultCharacterSet: "alphanumeric",
    operationDefaults: {
      inserts: {
        op_count: 500000,
        key_len: 20,
        val_len: 1024,
        key_pattern: "uniform",
        val_pattern: "uniform",
        key_hot_len: 20,
        key_hot_amount: 100,
        key_hot_probability: 0.8,
        val_hot_len: 256,
        val_hot_amount: 100,
        val_hot_probability: 0.8,
      },
      updates: {
        op_count: 500000,
        val_len: 1024,
        val_pattern: "uniform",
        val_hot_len: 256,
        val_hot_amount: 100,
        val_hot_probability: 0.8,
        selection_distribution: "uniform",
        selection_min: 0,
        selection_max: 1,
      },
      point_queries: {
        op_count: 500000,
        selection_distribution: "uniform",
        selection_min: 0,
        selection_max: 1,
      },
    },
    stringPatternDefaults: {
      key_pattern: "uniform",
      val_pattern: "uniform",
      key_hot_len: 20,
      key_hot_amount: 100,
      key_hot_probability: 0.8,
      val_hot_len: 256,
      val_hot_amount: 100,
      val_hot_probability: 0.8,
    },
    selectionParamDefaults: {
      selection_min: 0,
      selection_max: 1,
    },
    selectionDistributionParams: {
      uniform: ["selection_min", "selection_max"],
    },
    rangeFormats: ["StartCount", "StartEnd"],
    opsWithOpCount: ["inserts", "updates", "point_queries"],
    opsWithSorted: [],
    opsWithKey: ["inserts"],
    opsWithValue: ["inserts", "updates"],
    opsWithSelection: ["updates", "point_queries"],
    opsWithRange: [],
  };
}

test("structured UI normalization expands sparse phased operations to schema-valid specs", async () => {
  const helper = await loadUiStructuredNormalizer();
  assert.equal(
    typeof helper.normalizePatchedStructureSections,
    "function",
  );

  const normalized = helper.normalizePatchedStructureSections(
    [
      {
        groups: [
          {
            inserts: {
              op_count: 1000000,
            },
          },
          {
            point_queries: {
              op_count: 400000,
            },
            updates: {
              op_count: 100000,
            },
          },
        ],
      },
    ],
    createUiStructuredConfig(),
  );
  const normalizedJson = JSON.parse(JSON.stringify(normalized));

  assert.equal(normalizedJson.length, 1);
  assert.equal(normalizedJson[0].groups.length, 2);
  assert.equal(normalizedJson[0].groups[0].inserts.op_count, 1000000);
  assert.equal(
    normalizedJson[0].groups[0].inserts.key.uniform.len,
    20,
  );
  assert.equal(
    normalizedJson[0].groups[0].inserts.val.uniform.len,
    1024,
  );
  assert.equal(
    normalizedJson[0].groups[1].point_queries.op_count,
    400000,
  );
  assert.deepEqual(normalizedJson[0].groups[1].point_queries.selection, {
    uniform: {
      min: 0,
      max: 1,
    },
  });
  assert.equal(normalizedJson[0].groups[1].updates.op_count, 100000);
  assert.deepEqual(normalizedJson[0].groups[1].updates.selection, {
    uniform: {
      min: 0,
      max: 1,
    },
  });
  assert.deepEqual(normalizedJson[0].groups[1].updates.val, {
    uniform: {
      len: 1024,
      character_set: "alphanumeric",
    },
  });
});
