(() => {
  function createRenderer(deps) {
    function render(container, op, entry, fields) {
      if (!container) {
        return;
      }
      const list = container.querySelector(".advanced-summary-list");
      if (!list) {
        return;
      }
      list.innerHTML = "";
      const activeFields = (fields || []).filter((field) =>
        Object.prototype.hasOwnProperty.call(entry || {}, field),
      );
      if (activeFields.length === 0) {
        container.classList.add("hidden");
        return;
      }
      activeFields.forEach((field) => {
        list.appendChild(createAdvancedExpressionItem(op, field, entry[field]));
      });
      container.classList.remove("hidden");
    }

    function createAdvancedExpressionItem(op, field, value) {
      if (["op_count", "k", "l", "selectivity", "selection"].includes(field)) {
        return createAdvancedNumberExprItem(op, field, value);
      }
      if (["key", "val"].includes(field)) {
        return createAdvancedStringExprItem(op, field, value);
      }
      return createUnsupportedAdvancedExpressionItem(op, field, value);
    }

    function createUnsupportedAdvancedExpressionItem(op, field, value) {
      const item = document.createElement("div");
      item.className = "advanced-summary-item";

      const meta = document.createElement("div");
      meta.className = "advanced-summary-meta";

      const text = document.createElement("div");
      text.className = "advanced-summary-text";
      text.textContent =
        getAdvancedFieldLabel(field) +
        ": " +
        formatExpressionSummary(value) +
        ". This expression shape is preserved but not editable here yet.";
      meta.appendChild(text);

      const actions = document.createElement("div");
      actions.className = "advanced-summary-actions";

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "advanced-summary-clear";
      clearBtn.textContent = "Clear";
      clearBtn.addEventListener("click", () => {
        deps.clearAdvancedFieldValue(op, field);
        deps.updateJsonFromForm();
      });
      actions.appendChild(clearBtn);
      meta.appendChild(actions);

      item.appendChild(meta);
      return item;
    }

    function createAdvancedNumberExprItem(op, field, value) {
      const state = getAdvancedNumberExprState(field, value);
      if (!state) {
        return createUnsupportedAdvancedExpressionItem(op, field, value);
      }

      const item = document.createElement("div");
      item.className = "advanced-summary-item";

      const meta = document.createElement("div");
      meta.className = "advanced-summary-meta";

      const text = document.createElement("div");
      text.className = "advanced-summary-text";
      text.textContent =
        getAdvancedFieldLabel(field) + ": " + formatExpressionSummary(value);
      meta.appendChild(text);

      const actions = document.createElement("div");
      actions.className = "advanced-summary-actions";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "advanced-summary-clear";
      clearBtn.textContent = "Clear";
      clearBtn.addEventListener("click", () => {
        deps.clearAdvancedFieldValue(op, field);
        deps.updateJsonFromForm();
      });
      actions.appendChild(clearBtn);
      meta.appendChild(actions);

      item.appendChild(meta);

      const controls = document.createElement("div");
      controls.className = "advanced-summary-controls";

      const constantInput = createAdvancedTextInput(state.constant, "number");
      constantInput.step = "any";
      if (field === "op_count" || field === "k") {
        constantInput.min = "0";
      }

      const distributionSelect = createAdvancedSelect(
        deps.getSelectionDistributionValues(),
        state.distribution,
      );
      const modeSelect =
        field === "selection"
          ? null
          : createAdvancedSelect(["constant", "distribution"], state.mode);

      const paramInputs = {};
      Object.entries(deps.selectionParamUi).forEach(([paramField, config]) => {
        const input = createAdvancedTextInput(
          state.params[paramField.replace(/^selection_/, "")] ??
            state.params[paramField] ??
            deps.selectionParamDefaults[paramField],
          "number",
        );
        input.step = config.step || "any";
        if (config.min !== undefined) {
          input.min = config.min;
        }
        paramInputs[paramField] = input;
      });

      const constantField = createAdvancedFieldShell(
        "Value",
        constantInput,
        "Use a constant number for this field.",
      );
      const distributionField = createAdvancedFieldShell(
        field === "selection" ? "Distribution" : "Expression Type",
        distributionSelect,
        field === "selection"
          ? "Choose how keys are sampled."
          : "Choose a distribution instead of a constant.",
      );
      const paramFields = {};
      Object.entries(deps.selectionParamUi).forEach(([paramField, config]) => {
        paramFields[paramField] = createAdvancedFieldShell(
          config.label,
          paramInputs[paramField],
        );
      });

      function updateAdvancedNumberExpr() {
        const rawValues = {};
        Object.entries(paramInputs).forEach(([paramField, input]) => {
          rawValues[paramField] = input.value;
        });
        const nextValue =
          field !== "selection" && modeSelect && modeSelect.value === "constant"
            ? deps.numberOrDefault(constantInput.value, state.constant || 0)
            : buildDistributionExpressionFromValues(
                distributionSelect.value || "uniform",
                rawValues,
              );
        deps.setAdvancedFieldValue(op, field, nextValue, { refresh: false });
        text.textContent =
          getAdvancedFieldLabel(field) + ": " + formatExpressionSummary(nextValue);
        deps.updateJsonFromForm();
      }

      function refreshNumberExprVisibility() {
        const useDistribution =
          field === "selection" ||
          !modeSelect ||
          modeSelect.value === "distribution";
        constantField.classList.toggle("hidden", useDistribution);
        distributionField.classList.toggle("hidden", !useDistribution);
        Object.entries(paramFields).forEach(([paramField, wrapper]) => {
          wrapper.classList.toggle(
            "hidden",
            !useDistribution ||
              !deps
                .getSelectionParamsForDistribution(distributionSelect.value)
                .includes(paramField),
          );
        });
      }

      if (modeSelect) {
        controls.appendChild(
          createAdvancedFieldShell(
            "Mode",
            modeSelect,
            "Switch between a constant value and a sampled distribution.",
          ),
        );
      }
      controls.appendChild(constantField);
      controls.appendChild(distributionField);
      Object.values(paramFields).forEach((wrapper) => {
        controls.appendChild(wrapper);
      });

      if (modeSelect) {
        modeSelect.addEventListener("change", () => {
          refreshNumberExprVisibility();
          updateAdvancedNumberExpr();
        });
      }
      distributionSelect.addEventListener("change", () => {
        refreshNumberExprVisibility();
        updateAdvancedNumberExpr();
      });
      constantInput.addEventListener("input", updateAdvancedNumberExpr);
      Object.values(paramInputs).forEach((input) => {
        input.addEventListener("input", updateAdvancedNumberExpr);
      });

      refreshNumberExprVisibility();
      item.appendChild(controls);
      return item;
    }

    function createAdvancedStringExprItem(op, field, value) {
      const state = getAdvancedStringExprState(value);
      if (!state) {
        return createUnsupportedAdvancedExpressionItem(op, field, value);
      }

      const item = document.createElement("div");
      item.className = "advanced-summary-item";

      const meta = document.createElement("div");
      meta.className = "advanced-summary-meta";

      const text = document.createElement("div");
      text.className = "advanced-summary-text";
      text.textContent =
        getAdvancedFieldLabel(field) + ": " + formatExpressionSummary(value);
      meta.appendChild(text);
      item.appendChild(meta);

      const controls = document.createElement("div");
      controls.className = "advanced-summary-controls";

      const variantSelect = createAdvancedSelect(
        ["constant", "uniform", "hot_range", "weighted", "segmented"],
        state.variant,
      );
      const constantInput = createAdvancedTextInput(state.constant, "text");
      const uniformLenInput = createAdvancedTextInput(state.uniformLen, "number");
      uniformLenInput.min = "1";
      uniformLenInput.step = "1";
      const hotLenInput = createAdvancedTextInput(state.hotLen, "number");
      hotLenInput.min = "1";
      hotLenInput.step = "1";
      const hotAmountInput = createAdvancedTextInput(state.hotAmount, "number");
      hotAmountInput.min = "0";
      hotAmountInput.step = "1";
      const hotProbabilityInput = createAdvancedTextInput(
        state.hotProbability,
        "number",
      );
      hotProbabilityInput.min = "0";
      hotProbabilityInput.max = "1";
      hotProbabilityInput.step = "any";
      const weightedTextarea = createAdvancedTextarea(
        state.weightedLines,
        "Example: 3 | user\n1 | {{uniform:20}}",
      );
      const segmentedSeparatorInput = createAdvancedTextInput(
        state.segmentedSeparator,
        "text",
      );
      const segmentedTextarea = createAdvancedTextarea(
        state.segmentedLines,
        "Example:\ntenant\n{{uniform:12}}",
      );

      const variantField = createAdvancedFieldShell(
        "Pattern",
        variantSelect,
        "Switch between constant, uniform, weighted, segmented, or hot-range values.",
      );
      const constantField = createAdvancedFieldShell(
        "Constant Value",
        constantInput,
      );
      const uniformField = createAdvancedFieldShell(
        "Uniform Length",
        uniformLenInput,
      );
      const hotLenField = createAdvancedFieldShell(
        "Hot Prefix Length",
        hotLenInput,
      );
      const hotAmountField = createAdvancedFieldShell(
        "Hot Range Count",
        hotAmountInput,
      );
      const hotProbabilityField = createAdvancedFieldShell(
        "Hot Probability",
        hotProbabilityInput,
      );
      const weightedField = createAdvancedFieldShell(
        "Weighted Entries",
        weightedTextarea,
        'One line per value. Format: "weight | value". Use {{uniform}} or {{uniform:20}} for generated values.',
      );
      const segmentedSeparatorField = createAdvancedFieldShell(
        "Segment Separator",
        segmentedSeparatorInput,
      );
      const segmentedField = createAdvancedFieldShell(
        "Segments",
        segmentedTextarea,
        "One segment per line. Use plain text or {{uniform}} / {{uniform:20}}.",
      );

      function parseWeightedExpression() {
        const lines = weightedTextarea.value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          weightedTextarea.setCustomValidity("Add at least one weighted entry.");
          return null;
        }
        const items = [];
        for (const line of lines) {
          const separatorIndex = line.indexOf("|");
          if (separatorIndex < 0) {
            weightedTextarea.setCustomValidity(
              'Use "weight | value" on each line.',
            );
            return null;
          }
          const weight = Number(line.slice(0, separatorIndex).trim());
          const rawValue = line.slice(separatorIndex + 1).trim();
          if (!Number.isFinite(weight) || weight <= 0 || !rawValue) {
            weightedTextarea.setCustomValidity(
              'Use "weight | value" on each line.',
            );
            return null;
          }
          const parsedValue = parseInlineStringExprToken(
            rawValue,
            deps.getEffectiveOperationCharacterSet(op),
          );
          if (parsedValue === null) {
            weightedTextarea.setCustomValidity(
              "Use plain text or {{uniform}} / {{uniform:20}} values.",
            );
            return null;
          }
          items.push({ weight, value: parsedValue });
        }
        weightedTextarea.setCustomValidity("");
        return { weighted: items };
      }

      function parseSegmentedExpression() {
        const lines = segmentedTextarea.value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          segmentedTextarea.setCustomValidity("Add at least one segment.");
          return null;
        }
        const segments = [];
        for (const line of lines) {
          const parsedSegment = parseInlineStringExprToken(
            line,
            deps.getEffectiveOperationCharacterSet(op),
          );
          if (parsedSegment === null) {
            segmentedTextarea.setCustomValidity(
              "Use plain text or {{uniform}} / {{uniform:20}} segments.",
            );
            return null;
          }
          segments.push(parsedSegment);
        }
        segmentedTextarea.setCustomValidity("");
        return {
          segmented: {
            separator: segmentedSeparatorInput.value || "",
            segments,
          },
        };
      }

      function buildStringExpressionFromEditor() {
        const variant = variantSelect.value;
        if (variant === "constant") {
          return constantInput.value;
        }
        if (variant === "uniform") {
          return deps.buildUniformStringExpr(
            deps.intOrDefault(uniformLenInput.value, state.uniformLen || 20),
            deps.getEffectiveOperationCharacterSet(op),
          );
        }
        if (variant === "hot_range") {
          return {
            hot_range: {
              len: deps.intOrDefault(hotLenInput.value, state.hotLen || 20),
              amount: deps.nonNegativeIntOrDefault(
                hotAmountInput.value,
                state.hotAmount || 0,
              ),
              probability: deps.probabilityOrDefault(
                hotProbabilityInput.value,
                state.hotProbability || 0.8,
              ),
            },
          };
        }
        if (variant === "weighted") {
          return parseWeightedExpression();
        }
        if (variant === "segmented") {
          return parseSegmentedExpression();
        }
        return null;
      }

      function updateAdvancedStringExpression() {
        const nextValue = buildStringExpressionFromEditor();
        if (nextValue === null) {
          return;
        }
        deps.setAdvancedFieldValue(op, field, nextValue, { refresh: false });
        text.textContent =
          getAdvancedFieldLabel(field) + ": " + formatExpressionSummary(nextValue);
        deps.updateJsonFromForm();
      }

      function refreshStringEditorVisibility() {
        const variant = variantSelect.value;
        constantField.classList.toggle("hidden", variant !== "constant");
        uniformField.classList.toggle("hidden", variant !== "uniform");
        hotLenField.classList.toggle("hidden", variant !== "hot_range");
        hotAmountField.classList.toggle("hidden", variant !== "hot_range");
        hotProbabilityField.classList.toggle("hidden", variant !== "hot_range");
        weightedField.classList.toggle("hidden", variant !== "weighted");
        segmentedSeparatorField.classList.toggle(
          "hidden",
          variant !== "segmented",
        );
        segmentedField.classList.toggle("hidden", variant !== "segmented");
      }

      controls.appendChild(variantField);
      controls.appendChild(constantField);
      controls.appendChild(uniformField);
      controls.appendChild(hotLenField);
      controls.appendChild(hotAmountField);
      controls.appendChild(hotProbabilityField);
      controls.appendChild(weightedField);
      controls.appendChild(segmentedSeparatorField);
      controls.appendChild(segmentedField);

      variantSelect.addEventListener("change", () => {
        refreshStringEditorVisibility();
        updateAdvancedStringExpression();
      });
      constantInput.addEventListener("input", updateAdvancedStringExpression);
      uniformLenInput.addEventListener("input", updateAdvancedStringExpression);
      hotLenInput.addEventListener("input", updateAdvancedStringExpression);
      hotAmountInput.addEventListener("input", updateAdvancedStringExpression);
      hotProbabilityInput.addEventListener(
        "input",
        updateAdvancedStringExpression,
      );
      weightedTextarea.addEventListener("change", updateAdvancedStringExpression);
      segmentedSeparatorInput.addEventListener(
        "input",
        updateAdvancedStringExpression,
      );
      segmentedTextarea.addEventListener(
        "change",
        updateAdvancedStringExpression,
      );

      refreshStringEditorVisibility();
      item.appendChild(controls);
      return item;
    }

    function getAdvancedFieldLabel(field) {
      if (field === "op_count") {
        return "Operation Count";
      }
      if (field === "k") {
        return "Sorted K";
      }
      if (field === "l") {
        return "Sorted L";
      }
      return deps.titleCaseFromSnake(field);
    }

    function createAdvancedFieldShell(labelText, control, hintText = "") {
      const wrapper = document.createElement("label");
      wrapper.className = "advanced-summary-field";

      const title = document.createElement("span");
      title.textContent = labelText;
      wrapper.appendChild(title);
      wrapper.appendChild(control);

      if (hintText) {
        const hint = document.createElement("small");
        hint.className = "advanced-summary-hint";
        hint.textContent = hintText;
        wrapper.appendChild(hint);
      }

      return wrapper;
    }

    function createAdvancedTextInput(value = "", type = "text") {
      const input = document.createElement("input");
      input.type = type;
      input.value = value == null ? "" : String(value);
      return input;
    }

    function createAdvancedSelect(options, value = "") {
      const select = document.createElement("select");
      (options || []).forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      });
      if (value !== "" && value !== null && value !== undefined) {
        select.value = String(value);
      }
      return select;
    }

    function createAdvancedTextarea(value = "", placeholder = "") {
      const textarea = document.createElement("textarea");
      textarea.value = value == null ? "" : String(value);
      textarea.placeholder = placeholder;
      return textarea;
    }

    function buildDistributionExpressionFromValues(distributionName, rawValues) {
      const params = {};
      deps
        .getSelectionParamsForDistribution(distributionName)
        .forEach((fieldName) => {
          const fallback = deps.selectionParamDefaults[fieldName];
          if (fieldName === "selection_n") {
            params.n = deps.intOrDefault(rawValues[fieldName], fallback || 1);
            return;
          }
          params[fieldName.replace(/^selection_/, "")] = deps.numberOrDefault(
            rawValues[fieldName],
            fallback,
          );
        });
      return { [distributionName]: params };
    }

    function getAdvancedNumberExprState(field, value) {
      if (typeof value === "number") {
        return {
          mode: "constant",
          constant: value,
          distribution: "uniform",
          params: {},
        };
      }
      const variant = getSingleExpressionVariant(value);
      if (
        variant &&
        deps.getSelectionDistributionValues().includes(variant.name) &&
        isExpressionObject(variant.value)
      ) {
        return {
          mode: "distribution",
          constant:
            field === "selectivity"
              ? 0.01
              : (deps.operationDefaults.sorted &&
                  deps.operationDefaults.sorted[field]) ||
                1,
          distribution: variant.name,
          params: deps.cloneJsonValue(variant.value),
        };
      }
      return null;
    }

    function parseInlineStringExprToken(text, characterSet) {
      const trimmed = String(text || "").trim();
      if (!trimmed) {
        return null;
      }
      const uniformMatch = trimmed.match(
        /^\{\{\s*uniform(?:\s*:\s*(\d+))?\s*\}\}$/i,
      );
      if (uniformMatch) {
        return deps.buildUniformStringExpr(
          deps.intOrDefault(uniformMatch[1], 20),
          characterSet,
        );
      }
      return trimmed;
    }

    function formatInlineStringExprToken(value) {
      if (typeof value === "string") {
        return value;
      }
      const variant = getSingleExpressionVariant(value);
      if (
        variant &&
        variant.name === "uniform" &&
        isExpressionObject(variant.value) &&
        typeof variant.value.len === "number"
      ) {
        return "{{uniform:" + String(variant.value.len) + "}}";
      }
      return null;
    }

    function formatWeightedEditorLines(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return "";
      }
      const lines = [];
      for (const item of items) {
        if (!item || typeof item.weight !== "number") {
          return null;
        }
        const valueToken = formatInlineStringExprToken(item.value);
        if (valueToken === null) {
          return null;
        }
        lines.push(String(item.weight) + " | " + valueToken);
      }
      return lines.join("\n");
    }

    function formatSegmentEditorLines(segments) {
      if (!Array.isArray(segments) || segments.length === 0) {
        return "";
      }
      const lines = [];
      for (const segment of segments) {
        const token = formatInlineStringExprToken(segment);
        if (token === null) {
          return null;
        }
        lines.push(token);
      }
      return lines.join("\n");
    }

    function getAdvancedStringExprState(value) {
      if (typeof value === "string") {
        return {
          variant: "constant",
          constant: value,
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedLines: "",
          segmentedSeparator: ":",
          segmentedLines: "",
        };
      }
      const variant = getSingleExpressionVariant(value);
      if (!variant) {
        return null;
      }
      if (
        variant.name === "uniform" &&
        isExpressionObject(variant.value) &&
        typeof variant.value.len === "number"
      ) {
        return {
          variant: "uniform",
          constant: "",
          uniformLen: variant.value.len,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedLines: "",
          segmentedSeparator: ":",
          segmentedLines: "",
        };
      }
      if (
        variant.name === "hot_range" &&
        isExpressionObject(variant.value) &&
        typeof variant.value.len === "number" &&
        typeof variant.value.amount === "number" &&
        typeof variant.value.probability === "number"
      ) {
        return {
          variant: "hot_range",
          constant: "",
          uniformLen: 20,
          hotLen: variant.value.len,
          hotAmount: variant.value.amount,
          hotProbability: variant.value.probability,
          weightedLines: "",
          segmentedSeparator: ":",
          segmentedLines: "",
        };
      }
      if (variant.name === "weighted") {
        const weightedLines = formatWeightedEditorLines(variant.value);
        if (weightedLines === null) {
          return null;
        }
        return {
          variant: "weighted",
          constant: "",
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedLines,
          segmentedSeparator: ":",
          segmentedLines: "",
        };
      }
      if (
        variant.name === "segmented" &&
        isExpressionObject(variant.value) &&
        Array.isArray(variant.value.segments)
      ) {
        const segmentedLines = formatSegmentEditorLines(variant.value.segments);
        if (segmentedLines === null) {
          return null;
        }
        return {
          variant: "segmented",
          constant: "",
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedLines: "",
          segmentedSeparator:
            typeof variant.value.separator === "string"
              ? variant.value.separator
              : ":",
          segmentedLines,
        };
      }
      return null;
    }

    function formatExpressionSummary(value) {
      if (typeof value === "string") {
        return '"' + value + '"';
      }
      if (typeof value === "number") {
        return String(value);
      }
      if (!isExpressionObject(value)) {
        return "configured";
      }
      const keys = Object.keys(value);
      if (keys.length !== 1) {
        return "configured";
      }
      const variant = keys[0];
      const inner = value[variant];
      if (!isExpressionObject(inner)) {
        return variant;
      }
      const params = Object.entries(inner)
        .map(([key, paramValue]) => {
          if (Array.isArray(paramValue)) {
            return key + ":" + paramValue.length;
          }
          if (isExpressionObject(paramValue)) {
            const nestedKeys = Object.keys(paramValue);
            return key + ":" + (nestedKeys[0] || "object");
          }
          return key + ":" + String(paramValue);
        })
        .join(", ");
      return variant + (params ? " (" + params + ")" : "");
    }

    function getSingleExpressionVariant(value) {
      if (!isExpressionObject(value)) {
        return null;
      }
      const keys = Object.keys(value);
      if (keys.length !== 1) {
        return null;
      }
      return {
        name: keys[0],
        value: value[keys[0]],
      };
    }

    function isExpressionObject(value) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    }

    return {
      render,
    };
  }

  globalThis.TectonicAdvancedExpressions = {
    createRenderer,
  };
})();
