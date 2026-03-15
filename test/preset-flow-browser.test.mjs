import assert from "node:assert/strict";
import test from "node:test";

class FakeClassList {
  constructor() {
    this.tokens = new Set();
  }

  toggle(token, force) {
    if (force === undefined) {
      if (this.tokens.has(token)) {
        this.tokens.delete(token);
        return false;
      }
      this.tokens.add(token);
      return true;
    }
    if (force) {
      this.tokens.add(token);
      return true;
    }
    this.tokens.delete(token);
    return false;
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = String(tagName || "div").toUpperCase();
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.textContent = "";
    this.children = [];
    this.focused = false;
    this.classList = new FakeClassList();
    this._innerHTML = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  focus() {
    this.focused = true;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value || "");
    this.children = [];
  }
}

function createTestContext() {
  const refs = {
    appHeader: new FakeElement("header"),
    appShell: new FakeElement("div"),
    assistantInput: new FakeElement("textarea"),
    builderPanel: new FakeElement("section"),
    copyBtn: new FakeElement("button"),
    customWorkloadBtn: new FakeElement("button"),
    downloadJsonBtn: new FakeElement("button"),
    newWorkloadBtn: new FakeElement("button"),
    presetFamilySelect: new FakeElement("select"),
    presetFileSelect: new FakeElement("select"),
    presetSelectionNote: new FakeElement("p"),
    previewPanel: new FakeElement("section"),
    runWorkloadBtn: new FakeElement("button"),
    runsPanel: new FakeElement("section"),
    validationResult: new FakeElement("p"),
    welcomePanel: new FakeElement("section"),
  };

  let activePresetJson = null;
  let customWorkloadMode = false;
  const calls = {
    renderGeneratedJson: [],
    updateInteractiveStats: [],
    validateGeneratedJson: [],
    setValidationStatus: [],
  };

  const loadedPresetJson = {
    sections: [{ groups: [{ inserts: { op_count: 1000 } }] }],
  };

  const fakeFetch = async (url) => {
    if (url === "/presets/index.json") {
      return {
        ok: true,
        async json() {
          return [
            {
              id: "scale-001m",
              family: "scale",
              label: "001m.spec.json",
              path: "/presets/scale/001m.spec.json",
              source: "example-specs/scale/001m.spec.json",
              description: "Scale workload example.",
            },
          ];
        },
      };
    }
    if (url === "/presets/scale/001m.spec.json") {
      return {
        ok: true,
        async json() {
          return loadedPresetJson;
        },
      };
    }
    throw new Error("Unexpected fetch URL: " + url);
  };

  return {
    calls,
    fakeFetch,
    loadedPresetJson,
    refs,
    state: {
      getActivePresetJson() {
        return activePresetJson;
      },
      setActivePresetJson(value) {
        activePresetJson = value;
      },
      getCustomWorkloadMode() {
        return customWorkloadMode;
      },
      setCustomWorkloadMode(value) {
        customWorkloadMode = value === true;
      },
    },
  };
}

test("preset flow controller covers landing, preset load, and custom mode", async () => {
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };

  await import("../public/preset-flow.js");

  const ctx = createTestContext();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ctx.fakeFetch;

  try {
    const controller = globalThis.TectonicPresetFlow.createController({
      refs: ctx.refs,
      state: ctx.state,
      cloneJsonValue(value) {
        return JSON.parse(JSON.stringify(value));
      },
      ensureWorkloadStructureState() {},
      loadActiveStructureIntoForm() {},
      updateJsonFromForm() {},
      resetFormInterface() {},
      renderGeneratedJson(value) {
        ctx.calls.renderGeneratedJson.push(value);
      },
      updateInteractiveStats(value) {
        ctx.calls.updateInteractiveStats.push(value);
      },
      validateGeneratedJson(value) {
        ctx.calls.validateGeneratedJson.push(value);
        return Promise.resolve();
      },
      setValidationStatus(message, tone) {
        ctx.calls.setValidationStatus.push({ message, tone });
      },
    });

    await controller.loadPresetCatalog();
    controller.syncLandingUi();

    assert.equal(ctx.refs.welcomePanel.hidden, false);
    assert.equal(ctx.refs.builderPanel.hidden, true);
    assert.equal(ctx.refs.previewPanel.hidden, true);
    assert.equal(ctx.refs.runsPanel.hidden, true);
    assert.equal(ctx.refs.newWorkloadBtn.hidden, true);
    assert.equal(ctx.refs.presetFamilySelect.children.length, 2);
    assert.equal(ctx.refs.presetFileSelect.children.length, 1);

    controller.handlePresetFamilyChange({ target: { value: "scale" } });
    assert.equal(ctx.refs.presetFileSelect.disabled, false);
    assert.equal(ctx.refs.presetFileSelect.children.length, 2);

    await controller.handlePresetFileChange({ target: { value: "scale-001m" } });
    assert.deepEqual(ctx.state.getActivePresetJson(), ctx.loadedPresetJson);
    assert.equal(ctx.refs.previewPanel.hidden, false);
    assert.equal(ctx.refs.runsPanel.hidden, false);
    assert.equal(ctx.refs.welcomePanel.hidden, false);
    assert.equal(ctx.refs.builderPanel.hidden, true);
    assert.match(ctx.refs.presetSelectionNote.textContent, /scale\/001m\.spec\.json/);
    assert.equal(ctx.calls.renderGeneratedJson.length, 1);
    assert.deepEqual(ctx.calls.renderGeneratedJson[0], ctx.loadedPresetJson);
    assert.equal(ctx.calls.validateGeneratedJson.length, 1);

    controller.enableCustomWorkloadMode();
    assert.equal(ctx.state.getCustomWorkloadMode(), true);
    assert.equal(ctx.state.getActivePresetJson(), null);
    assert.equal(ctx.refs.welcomePanel.hidden, true);
    assert.equal(ctx.refs.builderPanel.hidden, false);
    assert.equal(ctx.refs.previewPanel.hidden, false);
    assert.equal(ctx.refs.runsPanel.hidden, false);
    assert.equal(ctx.refs.assistantInput.focused, true);
    assert.equal(ctx.refs.presetFamilySelect.value, "");
    assert.equal(ctx.refs.presetFileSelect.value, "");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
