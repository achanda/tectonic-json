(function attachStructuredUiNormalization(global) {
  function cloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildUniformStringExpr(len, characterSet) {
    const uniform = { len };
    if (characterSet) {
      uniform.character_set = characterSet;
    }
    return { uniform };
  }

  function createEmptyGroupSpec() {
    return {};
  }

  function createEmptySectionState() {
    return {
      skip_key_contains_check: false,
      groups: [createEmptyGroupSpec()],
    };
  }

  function buildDefaultStringExprFromDefaults(
    target,
    characterSet,
    defaults,
    stringPatternDefaults,
  ) {
    const isKey = target === "key";
    const patternField = isKey ? "key_pattern" : "val_pattern";
    const lenField = isKey ? "key_len" : "val_len";
    const hotLenField = isKey ? "key_hot_len" : "val_hot_len";
    const hotAmountField = isKey ? "key_hot_amount" : "val_hot_amount";
    const hotProbabilityField = isKey
      ? "key_hot_probability"
      : "val_hot_probability";
    const defaultLen = isKey ? defaults.key_len || 20 : defaults.val_len || 256;
    const patternName = defaults[patternField] || "uniform";

    if (patternName === "hot_range") {
      return {
        hot_range: {
          len: defaults[hotLenField] ?? stringPatternDefaults[hotLenField],
          amount:
            defaults[hotAmountField] ?? stringPatternDefaults[hotAmountField],
          probability:
            defaults[hotProbabilityField] ??
            stringPatternDefaults[hotProbabilityField],
        },
      };
    }

    if (patternName === "weighted") {
      return {
        weighted: [
          {
            weight: 1,
            value: buildUniformStringExpr(defaultLen, characterSet),
          },
        ],
      };
    }

    if (patternName === "segmented") {
      return {
        segmented: {
          separator: "-",
          segments: [buildUniformStringExpr(defaultLen, characterSet)],
        },
      };
    }

    return buildUniformStringExpr(defaultLen, characterSet);
  }

  function buildDefaultSelectionSpecFromDefaults(
    defaults,
    selectionParamDefaults,
    selectionDistributionParams,
  ) {
    const distributionName = defaults.selection_distribution || "uniform";
    const paramFields = selectionDistributionParams[distributionName] || [];
    const params = {};
    paramFields.forEach((fieldName) => {
      const defaultValue =
        defaults[fieldName] === undefined || defaults[fieldName] === null
          ? selectionParamDefaults[fieldName]
          : defaults[fieldName];
      const paramKey =
        fieldName === "selection_n"
          ? "n"
          : fieldName.replace(/^selection_/, "");
      params[paramKey] = defaultValue;
    });
    return { [distributionName]: params };
  }

  function buildStructuredDefaultOperationSpec(op, characterSet, config) {
    const defaults = config.operationDefaults[op] || {};
    const rangeFormats = Array.isArray(config.rangeFormats)
      ? config.rangeFormats
      : [];
    const withOpCount = new Set(config.opsWithOpCount || []);
    const withSorted = new Set(config.opsWithSorted || []);
    const withKey = new Set(config.opsWithKey || []);
    const withValue = new Set(config.opsWithValue || []);
    const withSelection = new Set(config.opsWithSelection || []);
    const withRange = new Set(config.opsWithRange || []);
    const built = {};

    if (withOpCount.has(op)) {
      built.op_count = defaults.op_count || 500000;
    }
    if (withSorted.has(op)) {
      built.k = defaults.k === undefined ? 100 : defaults.k;
      built.l = defaults.l === undefined ? 1 : defaults.l;
    }
    if (withKey.has(op)) {
      built.key = buildDefaultStringExprFromDefaults(
        "key",
        characterSet,
        defaults,
        config.stringPatternDefaults,
      );
    }
    if (withValue.has(op)) {
      built.val = buildDefaultStringExprFromDefaults(
        "val",
        characterSet,
        defaults,
        config.stringPatternDefaults,
      );
    }
    if (withSelection.has(op)) {
      built.selection = buildDefaultSelectionSpecFromDefaults(
        defaults,
        config.selectionParamDefaults,
        config.selectionDistributionParams,
      );
    }
    if (withRange.has(op)) {
      built.selectivity =
        defaults.selectivity === undefined || defaults.selectivity === null
          ? 0.01
          : defaults.selectivity;
      built.range_format =
        defaults.range_format || rangeFormats[0] || "StartCount";
    }

    return built;
  }

  function normalizePatchedOperationSpec(op, spec, characterSet, config) {
    const normalized = buildStructuredDefaultOperationSpec(
      op,
      characterSet,
      config,
    );
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
      return normalized;
    }
    Object.entries(spec).forEach(function applyField(entry) {
      normalized[entry[0]] = cloneJsonValue(entry[1]);
    });
    return normalized;
  }

  function normalizePatchedStructureSections(rawSections, config) {
    if (!Array.isArray(rawSections) || rawSections.length === 0) {
      return [createEmptySectionState()];
    }
    const defaultCharacterSet =
      config && typeof config.defaultCharacterSet === "string"
        ? config.defaultCharacterSet
        : "";
    return rawSections.map((section) => {
      const sectionCharacterSet =
        section &&
        typeof section === "object" &&
        typeof section.character_set === "string" &&
        section.character_set.trim()
          ? section.character_set.trim()
          : defaultCharacterSet;
      const groups =
        section &&
        typeof section === "object" &&
        Array.isArray(section.groups) &&
        section.groups.length > 0
          ? section.groups.map((group) => {
              const normalizedGroup = {};
              if (group && typeof group === "object" && !Array.isArray(group)) {
                Object.entries(group).forEach(([op, spec]) => {
                  normalizedGroup[op] = normalizePatchedOperationSpec(
                    op,
                    spec,
                    sectionCharacterSet,
                    config,
                  );
                });
                return normalizedGroup;
              }
              return createEmptyGroupSpec();
            })
          : [createEmptyGroupSpec()];
      return {
        skip_key_contains_check: !!(
          section &&
          typeof section === "object" &&
          section.skip_key_contains_check === true
        ),
        groups,
      };
    });
  }

  global.TectonicUiStructuredNormalization = {
    normalizePatchedStructureSections,
  };
})(globalThis);
