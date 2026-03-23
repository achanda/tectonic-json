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
      const relevantFields = Array.isArray(fields) ? fields : [];
      if (relevantFields.length === 0) {
        container.classList.add("hidden");
        return;
      }
      relevantFields.forEach((field) => {
        const hasExplicitValue = Object.prototype.hasOwnProperty.call(
          entry || {},
          field,
        );
        list.appendChild(
          createAdvancedExpressionItem(
            op,
            field,
            hasExplicitValue ? entry[field] : null,
            hasExplicitValue,
          ),
        );
      });
      container.classList.remove("hidden");
    }

    function createAdvancedExpressionItem(op, field, value, hasExplicitValue) {
      if (!hasExplicitValue) {
        return createInactiveAdvancedExpressionItem(op, field);
      }
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

    function createInactiveAdvancedExpressionItem(op, field) {
      const item = document.createElement("div");
      item.className = "advanced-summary-item";

      const meta = document.createElement("div");
      meta.className = "advanced-summary-meta";

      const text = document.createElement("div");
      text.className = "advanced-summary-text";
      text.textContent =
        getAdvancedFieldLabel(field) +
        ": using the standard builder controls. Switch this field into advanced mode to edit the full expression.";
      meta.appendChild(text);

      const actions = document.createElement("div");
      actions.className = "advanced-summary-actions";

      const activateBtn = document.createElement("button");
      activateBtn.type = "button";
      activateBtn.className = "advanced-summary-clear";
      activateBtn.textContent = "Use advanced editor";
      activateBtn.addEventListener("click", () => {
        const initialValue = deps.createInitialAdvancedFieldValue(op, field);
        if (initialValue === null || initialValue === undefined) {
          return;
        }
        deps.setAdvancedFieldValue(op, field, initialValue);
        deps.updateJsonFromForm();
      });
      actions.appendChild(activateBtn);
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
      const segmentedSeparatorInput = createAdvancedTextInput(
        state.segmentedSeparator,
        "text",
      );

      function createDefaultStringLeafState() {
        return {
          variant: "constant",
          constant: "",
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedEntries: [],
          segmentedSeparator: "",
          segmentedSegments: [],
        };
      }

      function createStringLeafStateFromValue(exprValue) {
        if (typeof exprValue === "string") {
          return {
            ...createDefaultStringLeafState(),
            variant: "constant",
            constant: exprValue,
          };
        }
        const variant = getSingleExpressionVariant(exprValue);
        if (
          variant &&
          variant.name === "uniform" &&
          isExpressionObject(variant.value) &&
          typeof variant.value.len === "number"
        ) {
          return {
            ...createDefaultStringLeafState(),
            variant: "uniform",
            uniformLen: variant.value.len,
          };
        }
        if (
          variant &&
          variant.name === "hot_range" &&
          isExpressionObject(variant.value) &&
          typeof variant.value.len === "number" &&
          typeof variant.value.amount === "number" &&
          typeof variant.value.probability === "number"
        ) {
          return {
            ...createDefaultStringLeafState(),
            variant: "hot_range",
            hotLen: variant.value.len,
            hotAmount: variant.value.amount,
            hotProbability: variant.value.probability,
          };
        }
        if (variant && variant.name === "weighted" && Array.isArray(variant.value)) {
          const weightedEntries = variant.value
            .map((item) => createWeightedEntryStateFromValue(item))
            .filter(Boolean);
          if (weightedEntries.length !== variant.value.length) {
            return null;
          }
          return {
            ...createDefaultStringLeafState(),
            variant: "weighted",
            weightedEntries,
          };
        }
        if (
          variant &&
          variant.name === "segmented" &&
          isExpressionObject(variant.value) &&
          Array.isArray(variant.value.segments)
        ) {
          const segmentedSegments = variant.value.segments
            .map((segmentValue) => createStringLeafStateFromValue(segmentValue))
            .filter(Boolean);
          if (segmentedSegments.length !== variant.value.segments.length) {
            return null;
          }
          return {
            ...createDefaultStringLeafState(),
            variant: "segmented",
            segmentedSeparator:
              typeof variant.value.separator === "string"
                ? variant.value.separator
                : "",
            segmentedSegments,
          };
        }
        return null;
      }

      function buildStringLeafValueFromState(leafState) {
        if (leafState.variant === "constant") {
          return leafState.constant || "";
        }
        if (leafState.variant === "uniform") {
          return deps.buildUniformStringExpr(
            deps.intOrDefault(leafState.uniformLen, 20),
            deps.getEffectiveOperationCharacterSet(op),
          );
        }
        if (leafState.variant === "hot_range") {
          return {
            hot_range: {
              len: deps.intOrDefault(leafState.hotLen, 20),
              amount: deps.nonNegativeIntOrDefault(leafState.hotAmount, 0),
              probability: deps.probabilityOrDefault(
                leafState.hotProbability,
                0.8,
              ),
            },
          };
        }
        if (leafState.variant === "weighted") {
          if (!Array.isArray(leafState.weightedEntries) || leafState.weightedEntries.length === 0) {
            return null;
          }
          const weighted = [];
          for (const entryState of leafState.weightedEntries) {
            const weightedEntry = buildWeightedValueFromState(entryState);
            if (
              !weightedEntry ||
              !Number.isFinite(weightedEntry.weight) ||
              weightedEntry.weight <= 0
            ) {
              return null;
            }
            weighted.push(weightedEntry);
          }
          return { weighted };
        }
        if (leafState.variant === "segmented") {
          if (
            !Array.isArray(leafState.segmentedSegments) ||
            leafState.segmentedSegments.length === 0
          ) {
            return null;
          }
          const segments = leafState.segmentedSegments
            .map((segmentState) => buildStringLeafValueFromState(segmentState))
            .filter((segmentValue) => segmentValue !== null);
          if (segments.length !== leafState.segmentedSegments.length) {
            return null;
          }
          return {
            segmented: {
              separator: leafState.segmentedSeparator || "",
              segments,
            },
          };
        }
        return null;
      }

      function createLeafExpressionRow(titleText, leafState, onChange, options = {}) {
        const row = document.createElement("div");
        row.className = "advanced-expression-row";

        const head = document.createElement("div");
        head.className = "advanced-expression-row-head";
        const title = document.createElement("strong");
        title.textContent = titleText;
        head.appendChild(title);

        const actions = document.createElement("div");
        actions.className = "advanced-expression-row-actions";
        (options.actions || []).forEach((action) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "advanced-summary-clear";
          button.textContent = action.label;
          button.disabled = !!action.disabled;
          button.addEventListener("click", action.onClick);
          actions.appendChild(button);
        });
        head.appendChild(actions);
        row.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "advanced-expression-row-grid";

        const leafVariantSelect = createAdvancedSelect(
          ["constant", "uniform", "hot_range", "weighted", "segmented"],
          leafState.variant,
        );
        const leafConstantInput = createAdvancedTextInput(
          leafState.constant,
          "text",
        );
        const leafUniformLenInput = createAdvancedTextInput(
          leafState.uniformLen,
          "number",
        );
        leafUniformLenInput.min = "1";
        leafUniformLenInput.step = "1";
        const leafHotLenInput = createAdvancedTextInput(leafState.hotLen, "number");
        leafHotLenInput.min = "1";
        leafHotLenInput.step = "1";
        const leafHotAmountInput = createAdvancedTextInput(
          leafState.hotAmount,
          "number",
        );
        leafHotAmountInput.min = "0";
        leafHotAmountInput.step = "1";
        const leafHotProbabilityInput = createAdvancedTextInput(
          leafState.hotProbability,
          "number",
        );
        leafHotProbabilityInput.min = "0";
        leafHotProbabilityInput.max = "1";
        leafHotProbabilityInput.step = "any";
        const nestedSegmentedSeparatorInput = createAdvancedTextInput(
          leafState.segmentedSeparator,
          "text",
        );
        const nestedWeightedEntries = Array.isArray(leafState.weightedEntries)
          ? leafState.weightedEntries
          : (leafState.weightedEntries = []);
        const nestedSegmentedSegments = Array.isArray(leafState.segmentedSegments)
          ? leafState.segmentedSegments
          : (leafState.segmentedSegments = []);

        const typeField = createAdvancedFieldShell("Type", leafVariantSelect);
        const constantField = createAdvancedFieldShell(
          "Constant Value",
          leafConstantInput,
        );
        const uniformField = createAdvancedFieldShell(
          "Uniform Length",
          leafUniformLenInput,
        );
        const hotLenField = createAdvancedFieldShell(
          "Hot Prefix Length",
          leafHotLenInput,
        );
        const hotAmountField = createAdvancedFieldShell(
          "Hot Range Count",
          leafHotAmountInput,
        );
        const hotProbabilityField = createAdvancedFieldShell(
          "Hot Probability",
          leafHotProbabilityInput,
        );
        const nestedWeightedList = document.createElement("div");
        nestedWeightedList.className = "advanced-expression-collection";
        function renderNestedWeightedEntries() {
          nestedWeightedList.innerHTML = "";
          nestedWeightedEntries.forEach((entryState, index) => {
            const weightInput = createAdvancedTextInput(entryState.weight, "number");
            weightInput.min = "0.000001";
            weightInput.step = "any";
            weightInput.addEventListener("input", () => {
              entryState.weight = weightInput.value;
              onChange();
            });
            const weightField = createAdvancedFieldShell("Weight", weightInput);
            nestedWeightedList.appendChild(
              createLeafExpressionRow(
                "Entry " + String(index + 1),
                entryState,
                onChange,
                {
                  prependFields: [weightField],
                  actions: [
                    {
                      label: "Up",
                      disabled: index === 0,
                      onClick: () => {
                        if (index === 0) {
                          return;
                        }
                        const current = nestedWeightedEntries[index];
                        nestedWeightedEntries[index] = nestedWeightedEntries[index - 1];
                        nestedWeightedEntries[index - 1] = current;
                        renderNestedWeightedEntries();
                        onChange();
                      },
                    },
                    {
                      label: "Down",
                      disabled: index === nestedWeightedEntries.length - 1,
                      onClick: () => {
                        if (index >= nestedWeightedEntries.length - 1) {
                          return;
                        }
                        const current = nestedWeightedEntries[index];
                        nestedWeightedEntries[index] = nestedWeightedEntries[index + 1];
                        nestedWeightedEntries[index + 1] = current;
                        renderNestedWeightedEntries();
                        onChange();
                      },
                    },
                    {
                      label: "Remove",
                      disabled: nestedWeightedEntries.length <= 1,
                      onClick: () => {
                        if (nestedWeightedEntries.length <= 1) {
                          return;
                        }
                        nestedWeightedEntries.splice(index, 1);
                        renderNestedWeightedEntries();
                        onChange();
                      },
                    },
                  ],
                },
              ),
            );
          });
        }
        const addNestedWeightedEntryBtn = document.createElement("button");
        addNestedWeightedEntryBtn.type = "button";
        addNestedWeightedEntryBtn.className = "advanced-summary-clear";
        addNestedWeightedEntryBtn.textContent = "Add Entry";
        addNestedWeightedEntryBtn.addEventListener("click", () => {
          nestedWeightedEntries.push(createDefaultWeightedEntryState());
          renderNestedWeightedEntries();
          onChange();
        });
        const nestedWeightedEditor = document.createElement("div");
        nestedWeightedEditor.className = "advanced-expression-builder";
        nestedWeightedEditor.appendChild(nestedWeightedList);
        nestedWeightedEditor.appendChild(addNestedWeightedEntryBtn);
        const nestedWeightedField = createAdvancedFieldShell(
          "Weighted Entries",
          nestedWeightedEditor,
          "Each entry can itself be another full string expression.",
        );
        const nestedSegmentedList = document.createElement("div");
        nestedSegmentedList.className = "advanced-expression-collection";
        function renderNestedSegmentedSegments() {
          nestedSegmentedList.innerHTML = "";
          nestedSegmentedSegments.forEach((segmentState, index) => {
            nestedSegmentedList.appendChild(
              createLeafExpressionRow(
                "Segment " + String(index + 1),
                segmentState,
                onChange,
                {
                  actions: [
                    {
                      label: "Up",
                      disabled: index === 0,
                      onClick: () => {
                        if (index === 0) {
                          return;
                        }
                        const current = nestedSegmentedSegments[index];
                        nestedSegmentedSegments[index] = nestedSegmentedSegments[index - 1];
                        nestedSegmentedSegments[index - 1] = current;
                        renderNestedSegmentedSegments();
                        onChange();
                      },
                    },
                    {
                      label: "Down",
                      disabled: index === nestedSegmentedSegments.length - 1,
                      onClick: () => {
                        if (index >= nestedSegmentedSegments.length - 1) {
                          return;
                        }
                        const current = nestedSegmentedSegments[index];
                        nestedSegmentedSegments[index] = nestedSegmentedSegments[index + 1];
                        nestedSegmentedSegments[index + 1] = current;
                        renderNestedSegmentedSegments();
                        onChange();
                      },
                    },
                    {
                      label: "Remove",
                      disabled: nestedSegmentedSegments.length <= 1,
                      onClick: () => {
                        if (nestedSegmentedSegments.length <= 1) {
                          return;
                        }
                        nestedSegmentedSegments.splice(index, 1);
                        renderNestedSegmentedSegments();
                        onChange();
                      },
                    },
                  ],
                },
              ),
            );
          });
        }
        const addNestedSegmentBtn = document.createElement("button");
        addNestedSegmentBtn.type = "button";
        addNestedSegmentBtn.className = "advanced-summary-clear";
        addNestedSegmentBtn.textContent = "Add Segment";
        addNestedSegmentBtn.addEventListener("click", () => {
          nestedSegmentedSegments.push(createDefaultStringLeafState());
          renderNestedSegmentedSegments();
          onChange();
        });
        const nestedSegmentedEditor = document.createElement("div");
        nestedSegmentedEditor.className = "advanced-expression-builder";
        nestedSegmentedEditor.appendChild(nestedSegmentedList);
        nestedSegmentedEditor.appendChild(addNestedSegmentBtn);
        const nestedSegmentedSeparatorField = createAdvancedFieldShell(
          "Segment Separator",
          nestedSegmentedSeparatorInput,
        );
        const nestedSegmentedField = createAdvancedFieldShell(
          "Segments",
          nestedSegmentedEditor,
          "Each segment can itself be another full string expression.",
        );

        function refreshLeafVisibility() {
          const variant = leafState.variant;
          constantField.classList.toggle("hidden", variant !== "constant");
          uniformField.classList.toggle("hidden", variant !== "uniform");
          hotLenField.classList.toggle("hidden", variant !== "hot_range");
          hotAmountField.classList.toggle("hidden", variant !== "hot_range");
          hotProbabilityField.classList.toggle("hidden", variant !== "hot_range");
          nestedWeightedField.classList.toggle("hidden", variant !== "weighted");
          nestedSegmentedSeparatorField.classList.toggle(
            "hidden",
            variant !== "segmented",
          );
          nestedSegmentedField.classList.toggle("hidden", variant !== "segmented");
        }

        function syncLeafState() {
          leafState.variant = leafVariantSelect.value;
          leafState.constant = leafConstantInput.value;
          leafState.uniformLen = leafUniformLenInput.value;
          leafState.hotLen = leafHotLenInput.value;
          leafState.hotAmount = leafHotAmountInput.value;
          leafState.hotProbability = leafHotProbabilityInput.value;
          leafState.weightedEntries = nestedWeightedEntries;
          leafState.segmentedSeparator = nestedSegmentedSeparatorInput.value;
          leafState.segmentedSegments = nestedSegmentedSegments;
          if (leafState.variant === "weighted" && nestedWeightedEntries.length === 0) {
            nestedWeightedEntries.push(createDefaultWeightedEntryState());
          }
          if (
            leafState.variant === "segmented" &&
            nestedSegmentedSegments.length === 0
          ) {
            nestedSegmentedSegments.push(createDefaultStringLeafState());
          }
          renderNestedWeightedEntries();
          renderNestedSegmentedSegments();
          refreshLeafVisibility();
          onChange();
        }

        leafVariantSelect.addEventListener("change", syncLeafState);
        leafConstantInput.addEventListener("input", syncLeafState);
        leafUniformLenInput.addEventListener("input", syncLeafState);
        leafHotLenInput.addEventListener("input", syncLeafState);
        leafHotAmountInput.addEventListener("input", syncLeafState);
        leafHotProbabilityInput.addEventListener("input", syncLeafState);
        nestedSegmentedSeparatorInput.addEventListener("input", syncLeafState);

        grid.appendChild(typeField);
        (options.prependFields || []).forEach((fieldWrapper) => {
          grid.appendChild(fieldWrapper);
        });
        grid.appendChild(constantField);
        grid.appendChild(uniformField);
        grid.appendChild(hotLenField);
        grid.appendChild(hotAmountField);
        grid.appendChild(hotProbabilityField);
        grid.appendChild(nestedWeightedField);
        grid.appendChild(nestedSegmentedSeparatorField);
        grid.appendChild(nestedSegmentedField);
        row.appendChild(grid);
        renderNestedWeightedEntries();
        renderNestedSegmentedSegments();
        refreshLeafVisibility();
        return row;
      }

      function createDefaultWeightedEntryState() {
        return {
          weight: 1,
          ...createDefaultStringLeafState(),
        };
      }

      function createWeightedEntryStateFromValue(item) {
        if (!item || typeof item.weight !== "number") {
          return null;
        }
        const valueState = createStringLeafStateFromValue(item.value);
        if (!valueState) {
          return null;
        }
        return {
          weight: item.weight,
          ...valueState,
        };
      }

      function buildWeightedValueFromState(entryState) {
        const valueExpr = buildStringLeafValueFromState(entryState);
        if (valueExpr === null) {
          return null;
        }
        return {
          weight: deps.numberOrDefault(entryState.weight, 1),
          value: valueExpr,
        };
      }

      const weightedEntries = Array.isArray(state.weightedEntries)
        ? state.weightedEntries
            .map((item) => createWeightedEntryStateFromValue(item))
            .filter(Boolean)
        : [];
      if (state.variant === "weighted" && weightedEntries.length === 0) {
        return createUnsupportedAdvancedExpressionItem(op, field, value);
      }
      if (weightedEntries.length === 0) {
        weightedEntries.push(createDefaultWeightedEntryState());
      }

      const weightedList = document.createElement("div");
      weightedList.className = "advanced-expression-collection";
      function renderWeightedEntries() {
        weightedList.innerHTML = "";
        weightedEntries.forEach((entryState, index) => {
          const weightInput = createAdvancedTextInput(entryState.weight, "number");
          weightInput.min = "0.000001";
          weightInput.step = "any";
          weightInput.addEventListener("input", () => {
            entryState.weight = weightInput.value;
            updateAdvancedStringExpression();
          });
          const weightField = createAdvancedFieldShell("Weight", weightInput);
          const row = createLeafExpressionRow(
            "Entry " + String(index + 1),
            entryState,
            updateAdvancedStringExpression,
            {
              prependFields: [weightField],
              actions: [
                {
                  label: "Up",
                  disabled: index === 0,
                  onClick: () => {
                    if (index === 0) {
                      return;
                    }
                    const current = weightedEntries[index];
                    weightedEntries[index] = weightedEntries[index - 1];
                    weightedEntries[index - 1] = current;
                    renderWeightedEntries();
                    updateAdvancedStringExpression();
                  },
                },
                {
                  label: "Down",
                  disabled: index === weightedEntries.length - 1,
                  onClick: () => {
                    if (index >= weightedEntries.length - 1) {
                      return;
                    }
                    const current = weightedEntries[index];
                    weightedEntries[index] = weightedEntries[index + 1];
                    weightedEntries[index + 1] = current;
                    renderWeightedEntries();
                    updateAdvancedStringExpression();
                  },
                },
                {
                  label: "Remove",
                  disabled: weightedEntries.length <= 1,
                  onClick: () => {
                    if (weightedEntries.length <= 1) {
                      return;
                    }
                    weightedEntries.splice(index, 1);
                    renderWeightedEntries();
                    updateAdvancedStringExpression();
                  },
                },
              ],
            },
          );
          weightedList.appendChild(row);
        });
      }

      const addWeightedEntryBtn = document.createElement("button");
      addWeightedEntryBtn.type = "button";
      addWeightedEntryBtn.className = "advanced-summary-clear";
      addWeightedEntryBtn.textContent = "Add Entry";
      addWeightedEntryBtn.addEventListener("click", () => {
        weightedEntries.push(createDefaultWeightedEntryState());
        renderWeightedEntries();
        updateAdvancedStringExpression();
      });

      const weightedEditor = document.createElement("div");
      weightedEditor.className = "advanced-expression-builder";
      weightedEditor.appendChild(weightedList);
      weightedEditor.appendChild(addWeightedEntryBtn);

      const segmentedSegments = Array.isArray(state.segmentedSegments)
        ? state.segmentedSegments
            .map((segmentValue) => createStringLeafStateFromValue(segmentValue))
            .filter(Boolean)
        : [];
      if (state.variant === "segmented" && segmentedSegments.length === 0) {
        return createUnsupportedAdvancedExpressionItem(op, field, value);
      }
      if (segmentedSegments.length === 0) {
        segmentedSegments.push(createDefaultStringLeafState());
      }

      const segmentedList = document.createElement("div");
      segmentedList.className = "advanced-expression-collection";
      function renderSegmentedSegments() {
        segmentedList.innerHTML = "";
        segmentedSegments.forEach((segmentState, index) => {
          const row = createLeafExpressionRow(
            "Segment " + String(index + 1),
            segmentState,
            updateAdvancedStringExpression,
            {
              actions: [
                {
                  label: "Up",
                  disabled: index === 0,
                  onClick: () => {
                    if (index === 0) {
                      return;
                    }
                    const current = segmentedSegments[index];
                    segmentedSegments[index] = segmentedSegments[index - 1];
                    segmentedSegments[index - 1] = current;
                    renderSegmentedSegments();
                    updateAdvancedStringExpression();
                  },
                },
                {
                  label: "Down",
                  disabled: index === segmentedSegments.length - 1,
                  onClick: () => {
                    if (index >= segmentedSegments.length - 1) {
                      return;
                    }
                    const current = segmentedSegments[index];
                    segmentedSegments[index] = segmentedSegments[index + 1];
                    segmentedSegments[index + 1] = current;
                    renderSegmentedSegments();
                    updateAdvancedStringExpression();
                  },
                },
                {
                  label: "Remove",
                  disabled: segmentedSegments.length <= 1,
                  onClick: () => {
                    if (segmentedSegments.length <= 1) {
                      return;
                    }
                    segmentedSegments.splice(index, 1);
                    renderSegmentedSegments();
                    updateAdvancedStringExpression();
                  },
                },
              ],
            },
          );
          segmentedList.appendChild(row);
        });
      }

      const addSegmentBtn = document.createElement("button");
      addSegmentBtn.type = "button";
      addSegmentBtn.className = "advanced-summary-clear";
      addSegmentBtn.textContent = "Add Segment";
      addSegmentBtn.addEventListener("click", () => {
        segmentedSegments.push(createDefaultStringLeafState());
        renderSegmentedSegments();
        updateAdvancedStringExpression();
      });

      const segmentedEditor = document.createElement("div");
      segmentedEditor.className = "advanced-expression-builder";
      segmentedEditor.appendChild(segmentedList);
      segmentedEditor.appendChild(addSegmentBtn);

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
        weightedEditor,
        "Add, remove, and reorder weighted entries. Each entry edits its weight and value directly.",
      );
      const segmentedSeparatorField = createAdvancedFieldShell(
        "Segment Separator",
        segmentedSeparatorInput,
      );
      const segmentedField = createAdvancedFieldShell(
        "Segments",
        segmentedEditor,
        "Add, remove, and reorder segments. Each segment can itself be another full string expression.",
      );

      function parseWeightedExpression() {
        if (weightedEntries.length === 0) {
          return null;
        }
        const items = [];
        for (const entryState of weightedEntries) {
          const weightedValue = buildWeightedValueFromState(entryState);
          if (
            !weightedValue ||
            !Number.isFinite(weightedValue.weight) ||
            weightedValue.weight <= 0
          ) {
            return null;
          }
          items.push(weightedValue);
        }
        return { weighted: items };
      }

      function parseSegmentedExpression() {
        if (segmentedSegments.length === 0) {
          return null;
        }
        const segments = segmentedSegments
          .map((segmentState) => buildStringLeafValueFromState(segmentState))
          .filter((segmentValue) => segmentValue !== null);
        if (segments.length !== segmentedSegments.length || segments.length === 0) {
          return null;
        }
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
      segmentedSeparatorInput.addEventListener(
        "input",
        updateAdvancedStringExpression,
      );

      refreshStringEditorVisibility();
      renderWeightedEntries();
      renderSegmentedSegments();
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
          weightedEntries: [],
          segmentedSeparator: ":",
          segmentedSegments: [],
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
          weightedEntries: [],
          segmentedSeparator: ":",
          segmentedSegments: [],
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
          weightedEntries: [],
          segmentedSeparator: ":",
          segmentedSegments: [],
        };
      }
      if (variant.name === "weighted") {
        if (!Array.isArray(variant.value)) {
          return null;
        }
        return {
          variant: "weighted",
          constant: "",
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedEntries: deps.cloneJsonValue(variant.value),
          segmentedSeparator: ":",
          segmentedSegments: [],
        };
      }
      if (
        variant.name === "segmented" &&
        isExpressionObject(variant.value) &&
        Array.isArray(variant.value.segments)
      ) {
        return {
          variant: "segmented",
          constant: "",
          uniformLen: 20,
          hotLen: deps.stringPatternDefaults.key_hot_len,
          hotAmount: deps.stringPatternDefaults.key_hot_amount,
          hotProbability: deps.stringPatternDefaults.key_hot_probability,
          weightedEntries: [],
          segmentedSeparator:
            typeof variant.value.separator === "string"
              ? variant.value.separator
              : ":",
          segmentedSegments: deps.cloneJsonValue(variant.value.segments),
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
