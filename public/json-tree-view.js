(() => {
  function createViewer({ container }) {
    function render(json) {
      if (!container) {
        return;
      }
      container.innerHTML = "";
      container.appendChild(
        createJsonTreeNode(null, json, {
          isRoot: true,
          sectionIndex: null,
          groupIndex: null,
          parentKey: null,
        }),
      );
    }

    function focusGroup(target) {
      if (
        !container ||
        !target ||
        !Number.isInteger(target.sectionIndex) ||
        !Number.isInteger(target.groupIndex)
      ) {
        return false;
      }
      const groupNode = container.querySelector(
        '[data-json-node="group"][data-section-index="' +
          target.sectionIndex +
          '"][data-group-index="' +
          target.groupIndex +
          '"]',
      );
      if (!groupNode) {
        return false;
      }
      expandAncestors(groupNode);
      highlightNode(groupNode);
      groupNode.scrollIntoView({ block: "center", inline: "nearest" });
      return true;
    }

    return {
      render,
      focusGroup,
    };
  }

  function createJsonTreeNode(key, value, context) {
    if (Array.isArray(value)) {
      return createJsonTreeCollectionNode(key, value, context, "[", "]");
    }
    if (value && typeof value === "object") {
      return createJsonTreeCollectionNode(key, value, context, "{", "}");
    }
    return createJsonTreePrimitiveNode(key, value);
  }

  function createJsonTreeCollectionNode(
    key,
    value,
    context,
    openChar,
    closeChar,
  ) {
    const isArray = Array.isArray(value);
    const details = document.createElement("details");
    details.open = true;

    if (Number.isInteger(context.sectionIndex)) {
      details.dataset.sectionIndex = String(context.sectionIndex);
    }
    if (Number.isInteger(context.groupIndex)) {
      details.dataset.groupIndex = String(context.groupIndex);
      details.dataset.jsonNode = "group";
    } else if (
      Number.isInteger(context.sectionIndex) &&
      context.parentKey === "sections"
    ) {
      details.dataset.jsonNode = "section";
    }

    const summary = document.createElement("summary");
    const summaryRow = document.createElement("div");
    summaryRow.className = "json-tree-summary";
    summaryRow.title = isArray
      ? value.length + " item" + (value.length === 1 ? "" : "s")
      : Object.keys(value).length +
        " key" +
        (Object.keys(value).length === 1 ? "" : "s");

    const marker = document.createElement("span");
    marker.className = "json-tree-marker";
    marker.textContent = "▸";
    summaryRow.appendChild(marker);

    const line = document.createElement("span");
    line.className = "json-tree-line";
    appendJsonEntryPrefix(line, key);
    const opener = document.createElement("span");
    opener.textContent = openChar;
    line.appendChild(opener);
    const collapsedPreview = document.createElement("span");
    collapsedPreview.className = "json-tree-collapsed-preview";
    collapsedPreview.textContent = closeChar;
    line.appendChild(collapsedPreview);
    summaryRow.appendChild(line);
    summary.appendChild(summaryRow);
    details.appendChild(summary);

    const children = document.createElement("div");
    children.className = "json-tree-children";

    if (isArray) {
      value.forEach((item, index) => {
        children.appendChild(
          createJsonTreeNode(null, item, {
            isRoot: false,
            sectionIndex:
              context.parentKey === "sections" ? index : context.sectionIndex,
            groupIndex:
              context.parentKey === "groups" ? index : context.groupIndex,
            parentKey: context.parentKey,
          }),
        );
      });
    } else {
      Object.entries(value).forEach(([childKey, childValue]) => {
        children.appendChild(
          createJsonTreeNode(childKey, childValue, {
            isRoot: false,
            sectionIndex: context.sectionIndex,
            groupIndex: context.groupIndex,
            parentKey: childKey,
          }),
        );
      });
    }

    const closing = document.createElement("div");
    closing.className = "json-tree-line json-tree-closing";
    closing.textContent = closeChar;
    children.appendChild(closing);
    details.appendChild(children);
    return details;
  }

  function createJsonTreePrimitiveNode(key, value) {
    const line = document.createElement("div");
    line.className = "json-tree-line";
    appendJsonEntryPrefix(line, key);
    line.appendChild(formatJsonPrimitiveNode(value));
    return line;
  }

  function appendJsonEntryPrefix(container, key) {
    if (key === null || key === undefined || key === "") {
      return;
    }
    const keyNode = document.createElement("span");
    keyNode.className = "json-tree-key";
    keyNode.textContent = '"' + key + '"';
    container.appendChild(keyNode);
    container.appendChild(document.createTextNode(": "));
  }

  function formatJsonPrimitiveNode(value) {
    const node = document.createElement("span");
    if (typeof value === "string") {
      node.className = "json-tree-string";
      node.textContent = '"' + value + '"';
      return node;
    }
    if (typeof value === "number") {
      node.className = "json-tree-number";
      node.textContent = String(value);
      return node;
    }
    if (typeof value === "boolean") {
      node.className = "json-tree-boolean";
      node.textContent = String(value);
      return node;
    }
    node.className = "json-tree-null";
    node.textContent = value === null ? "null" : String(value);
    return node;
  }

  function expandAncestors(node) {
    let current = node;
    while (current) {
      if (current.tagName === "DETAILS") {
        current.open = true;
      }
      current = current.parentElement;
    }
  }

  function highlightNode(node) {
    const container = node && node.closest(".json-tree");
    if (!container || !node) {
      return;
    }
    container
      .querySelectorAll(".json-tree-focus")
      .forEach((item) => item.classList.remove("json-tree-focus"));
    const summary = node.querySelector(":scope > summary > .json-tree-summary");
    const highlightTarget = summary || node;
    highlightTarget.classList.add("json-tree-focus");
  }

  globalThis.TectonicJsonTreeView = {
    createViewer,
  };
})();
