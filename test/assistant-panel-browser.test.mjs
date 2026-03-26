import assert from "node:assert/strict";
import test from "node:test";

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  setFromString(value) {
    this.tokens = new Set(
      String(value || "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    );
  }

  syncOwner() {
    this.owner._className = Array.from(this.tokens).join(" ");
  }

  add(...tokens) {
    tokens.forEach((token) => {
      if (token) {
        this.tokens.add(token);
      }
    });
    this.syncOwner();
  }

  remove(...tokens) {
    tokens.forEach((token) => {
      this.tokens.delete(token);
    });
    this.syncOwner();
  }

  toggle(token, force) {
    if (force === undefined) {
      if (this.tokens.has(token)) {
        this.tokens.delete(token);
        this.syncOwner();
        return false;
      }
      this.tokens.add(token);
      this.syncOwner();
      return true;
    }

    if (force) {
      this.tokens.add(token);
    } else {
      this.tokens.delete(token);
    }
    this.syncOwner();
    return force;
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
    this.focused = false;
    this.value = "";
    this.children = [];
    this.listeners = new Map();
    this.scrollHeight = 0;
    this.scrollTop = 0;
    this._className = "";
    this._innerHTML = "";
    this._textContent = "";
    this.classList = new FakeClassList(this);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value || "");
    this.classList.setFromString(this._className);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value || "");
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value || "");
    this.children = [];
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    this.scrollHeight = this.children.length;
    return child;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  focus() {
    this.focused = true;
  }
}

class FakeSelectElement extends FakeElement {
  constructor() {
    super("select");
    this.multiple = false;
    this.size = 0;
  }

  get options() {
    return this.children;
  }

  get selectedOptions() {
    return this.children.filter((child) => child.selected);
  }
}

class FakeOptionElement extends FakeElement {
  constructor() {
    super("option");
    this.selected = false;
  }
}

class FakeInputElement extends FakeElement {
  constructor(type = "text") {
    super("input");
    this.type = type;
    this.min = "";
    this.max = "";
    this.step = "";
  }
}

class FakeTextAreaElement extends FakeElement {
  constructor() {
    super("textarea");
  }
}

function createElement(tagName) {
  const lower = String(tagName || "div").toLowerCase();
  if (lower === "select") {
    return new FakeSelectElement();
  }
  if (lower === "option") {
    return new FakeOptionElement();
  }
  if (lower === "input") {
    return new FakeInputElement();
  }
  if (lower === "textarea") {
    return new FakeTextAreaElement();
  }
  return new FakeElement(lower);
}

function flattenText(node) {
  if (!node) {
    return "";
  }
  const ownText = typeof node.textContent === "string" ? node.textContent : "";
  return [ownText, ...node.children.map((child) => flattenText(child))]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function createRefs() {
  return {
    assistantApplyBtn: new FakeElement("button"),
    assistantClearBtn: new FakeElement("button"),
    assistantComposerHint: new FakeElement("p"),
    assistantInput: new FakeTextAreaElement(),
    assistantStatus: new FakeElement("span"),
    assistantTimeline: new FakeElement("div"),
  };
}

test("assistant panel renders a natural assistant reply with assumptions and form guidance", async () => {
  globalThis.document = { createElement };
  globalThis.HTMLSelectElement = FakeSelectElement;
  globalThis.window = {
    sessionStorage: {
      store: new Map(),
      getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
      },
      setItem(key, value) {
        this.store.set(key, String(value));
      },
    },
  };

  await import("../public/assistant-panel.js");

  const refs = createRefs();
  const applyCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        patch: { operations: { inserts: { enabled: true, op_count: 100000 } } },
        summary: "Created an insert-only workload with 100K operations.",
        clarifications: [],
        assumptions: [
          { text: "Used the default alphanumeric character set." },
          { text: "Used default 20-byte keys for inserts." },
        ],
      };
    },
  });

  try {
    const controller = globalThis.TectonicAssistantPanel.createController({
      refs,
      applyAssistantPatch(patch) {
        applyCalls.push(patch);
      },
      getActivePresetJson() {
        return null;
      },
      getCurrentFormState() {
        return {};
      },
      getCurrentWorkloadJson() {
        return {};
      },
      getSchemaHintsForAssist() {
        return {};
      },
      getSelectedOperations() {
        return [];
      },
      updateJsonFromForm() {},
    });

    refs.assistantInput.value = "Generate an insert-only workload with 100K operations.";
    await controller.handleApply();

    assert.equal(applyCalls.length, 1);
    assert.equal(refs.assistantTimeline.children.length, 2);
    assert.equal(refs.assistantStatus.textContent, "Applied");

    const assistantTurn = refs.assistantTimeline.children[1];
    const renderedText = flattenText(assistantTurn);

    assert.match(assistantTurn.className, /\bassistant\b/);
    assert.match(renderedText, /Created an insert-only workload with 100K operations\./);
    assert.match(renderedText, /Assumptions I used:/);
    assert.match(renderedText, /Used the default alphanumeric character set\./);
    assert.match(renderedText, /Used default 20-byte keys for inserts\./);
    assert.match(
      renderedText,
      /You can fine-tune anything in the form if you want to adjust the generated workload\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("assistant panel rewrites a first-turn update summary to generated", async () => {
  globalThis.document = { createElement };
  globalThis.HTMLSelectElement = FakeSelectElement;
  globalThis.window = {
    sessionStorage: {
      store: new Map(),
      getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
      },
      setItem(key, value) {
        this.store.set(key, String(value));
      },
    },
  };

  await import("../public/assistant-panel.js");

  const refs = createRefs();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        patch: { operations: { inserts: { enabled: true, op_count: 1000000 } } },
        summary: "Updated the workload.",
        clarifications: [],
        assumptions: [],
      };
    },
  });

  try {
    const controller = globalThis.TectonicAssistantPanel.createController({
      refs,
      applyAssistantPatch() {},
      getActivePresetJson() {
        return null;
      },
      getCurrentFormState() {
        return {};
      },
      getCurrentWorkloadJson() {
        return {};
      },
      getSchemaHintsForAssist() {
        return {};
      },
      getSelectedOperations() {
        return [];
      },
      updateJsonFromForm() {},
    });

    refs.assistantInput.value = "Generate a workload with 1M inserts";
    await controller.handleApply();

    const assistantTurn = refs.assistantTimeline.children[1];
    const renderedText = flattenText(assistantTurn);

    assert.match(renderedText, /Generated the workload\./);
    assert.doesNotMatch(renderedText, /Updated the workload\./);
    assert.match(
      renderedText,
      /No extra assistant-side assumptions were added\./,
    );
    assert.doesNotMatch(
      renderedText,
      /No extra assumptions were needed beyond what you asked for\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("assistant panel keeps updated summaries for follow-up edits", async () => {
  globalThis.document = { createElement };
  globalThis.HTMLSelectElement = FakeSelectElement;
  globalThis.window = {
    sessionStorage: {
      store: new Map(),
      getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
      },
      setItem(key, value) {
        this.store.set(key, String(value));
      },
    },
  };

  await import("../public/assistant-panel.js");

  const refs = createRefs();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        patch: { operations: { point_queries: { enabled: true, op_count: 50000 } } },
        summary: "Updated the workload.",
        clarifications: [],
        assumptions: [],
      };
    },
  });

  try {
    const controller = globalThis.TectonicAssistantPanel.createController({
      refs,
      applyAssistantPatch() {},
      getActivePresetJson() {
        return null;
      },
      getCurrentFormState() {
        return {
          operations: {
            inserts: {
              enabled: true,
              op_count: 1000000,
            },
          },
        };
      },
      getCurrentWorkloadJson() {
        return {};
      },
      getSchemaHintsForAssist() {
        return {};
      },
      getSelectedOperations() {
        return ["inserts"];
      },
      updateJsonFromForm() {},
    });

    refs.assistantInput.value = "Add 50K point queries";
    await controller.handleApply();

    const assistantTurn = refs.assistantTimeline.children[1];
    const renderedText = flattenText(assistantTurn);

    assert.match(renderedText, /Updated the workload\./);
    assert.doesNotMatch(renderedText, /Generated the workload\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
