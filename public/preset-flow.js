(function initPresetFlowModule(global) {
  "use strict";

  function createController(config) {
    const refs = (config && config.refs) || {};
    const state = (config && config.state) || {};

    const getActivePresetJson =
      typeof state.getActivePresetJson === "function"
        ? state.getActivePresetJson
        : function getActivePresetJsonFallback() {
            return null;
          };
    const setActivePresetJson =
      typeof state.setActivePresetJson === "function"
        ? state.setActivePresetJson
        : function setActivePresetJsonFallback() {};
    const getCustomWorkloadMode =
      typeof state.getCustomWorkloadMode === "function"
        ? state.getCustomWorkloadMode
        : function getCustomWorkloadModeFallback() {
            return false;
          };
    const setCustomWorkloadMode =
      typeof state.setCustomWorkloadMode === "function"
        ? state.setCustomWorkloadMode
        : function setCustomWorkloadModeFallback() {};

    const cloneJsonValue =
      typeof config.cloneJsonValue === "function"
        ? config.cloneJsonValue
        : function cloneJsonValueFallback(value) {
            return value;
          };
    const ensureWorkloadStructureState =
      typeof config.ensureWorkloadStructureState === "function"
        ? config.ensureWorkloadStructureState
        : function ensureWorkloadStructureStateFallback() {};
    const loadActiveStructureIntoForm =
      typeof config.loadActiveStructureIntoForm === "function"
        ? config.loadActiveStructureIntoForm
        : function loadActiveStructureIntoFormFallback() {};
    const updateJsonFromForm =
      typeof config.updateJsonFromForm === "function"
        ? config.updateJsonFromForm
        : function updateJsonFromFormFallback() {};
    const resetFormInterface =
      typeof config.resetFormInterface === "function"
        ? config.resetFormInterface
        : function resetFormInterfaceFallback() {};
    const renderGeneratedJson =
      typeof config.renderGeneratedJson === "function"
        ? config.renderGeneratedJson
        : function renderGeneratedJsonFallback() {};
    const updateInteractiveStats =
      typeof config.updateInteractiveStats === "function"
        ? config.updateInteractiveStats
        : function updateInteractiveStatsFallback() {};
    const validateGeneratedJson =
      typeof config.validateGeneratedJson === "function"
        ? config.validateGeneratedJson
        : function validateGeneratedJsonFallback() {
            return Promise.resolve();
          };
    const setValidationStatus =
      typeof config.setValidationStatus === "function"
        ? config.setValidationStatus
        : function setValidationStatusFallback() {};

    const presetIndexPath =
      typeof config.presetIndexPath === "string" && config.presetIndexPath
        ? config.presetIndexPath
        : "/presets/index.json";

    let presetCatalog = [];

    function setPresetSelectionNote(message) {
      if (!refs.presetSelectionNote) {
        return;
      }
      const text = typeof message === "string" ? message.trim() : "";
      refs.presetSelectionNote.textContent = text;
      refs.presetSelectionNote.hidden = text === "";
    }

    function clearLoadedPresetState() {
      setActivePresetJson(null);
      if (refs.presetFamilySelect) {
        refs.presetFamilySelect.value = "";
      }
      if (refs.presetFileSelect) {
        refs.presetFileSelect.innerHTML =
          '<option value="">Choose a file...</option>';
        refs.presetFileSelect.value = "";
        refs.presetFileSelect.disabled = true;
      }
      setPresetSelectionNote("");
    }

    function syncLandingUi() {
      const hasPreset = !!getActivePresetJson();
      const showPreview = getCustomWorkloadMode() || hasPreset;

      if (refs.appHeader) {
        refs.appHeader.hidden = !getCustomWorkloadMode();
      }
      if (refs.appShell && refs.appShell.classList) {
        refs.appShell.classList.toggle("landing", !getCustomWorkloadMode());
      }
      if (refs.builderPanel) {
        refs.builderPanel.hidden = !getCustomWorkloadMode();
      }
      if (refs.previewPanel) {
        refs.previewPanel.hidden = !showPreview;
      }
      if (refs.runsPanel) {
        refs.runsPanel.hidden = !showPreview;
      }
      if (refs.runWorkloadBtn) {
        refs.runWorkloadBtn.hidden = !showPreview;
      }
      if (refs.downloadJsonBtn) {
        refs.downloadJsonBtn.hidden = !showPreview;
      }
      if (refs.copyBtn) {
        refs.copyBtn.hidden = !showPreview;
      }
      if (refs.validationResult) {
        refs.validationResult.hidden = !showPreview;
      }
      if (refs.newWorkloadBtn) {
        refs.newWorkloadBtn.hidden = !getCustomWorkloadMode();
      }
      if (refs.welcomePanel) {
        refs.welcomePanel.hidden = getCustomWorkloadMode();
      }
    }

    function enableCustomWorkloadMode() {
      setCustomWorkloadMode(true);
      clearLoadedPresetState();
      ensureWorkloadStructureState();
      loadActiveStructureIntoForm();
      updateJsonFromForm();
      syncLandingUi();
      if (refs.assistantInput) {
        refs.assistantInput.focus();
      }
    }

    function renderPresetFamilyOptions() {
      if (!refs.presetFamilySelect) {
        return;
      }
      const families = Array.from(
        new Set(
          presetCatalog
            .map(function mapPresetFamily(preset) {
              return typeof preset.family === "string" ? preset.family : "";
            })
            .filter(Boolean),
        ),
      ).sort();
      refs.presetFamilySelect.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Choose a family...";
      refs.presetFamilySelect.appendChild(defaultOption);
      families.forEach(function appendFamilyOption(family) {
        const option = document.createElement("option");
        option.value = family;
        option.textContent = family;
        refs.presetFamilySelect.appendChild(option);
      });
    }

    function renderPresetFileOptions(family) {
      if (!refs.presetFileSelect) {
        return;
      }
      const normalizedFamily = typeof family === "string" ? family.trim() : "";
      const matchingPresets = presetCatalog.filter(function filterPresetFamily(
        preset,
      ) {
        return preset.family === normalizedFamily;
      });
      refs.presetFileSelect.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Choose a file...";
      refs.presetFileSelect.appendChild(defaultOption);
      matchingPresets.forEach(function appendPresetOption(preset) {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        refs.presetFileSelect.appendChild(option);
      });
      refs.presetFileSelect.value = "";
      refs.presetFileSelect.disabled = matchingPresets.length === 0;
    }

    async function loadPresetCatalog() {
      const response = await fetch(presetIndexPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load preset catalog.");
      }
      const data = await response.json();
      presetCatalog = Array.isArray(data)
        ? data.filter(function isValidPresetEntry(preset) {
            return !!(
              preset &&
              typeof preset === "object" &&
              typeof preset.id === "string" &&
              typeof preset.family === "string" &&
              typeof preset.label === "string" &&
              typeof preset.path === "string"
            );
          })
        : [];
      renderPresetFamilyOptions();
      renderPresetFileOptions("");
    }

    function handlePresetFamilyChange(event) {
      const family =
        event && event.target && typeof event.target.value === "string"
          ? event.target.value
          : "";
      setCustomWorkloadMode(false);
      setActivePresetJson(null);
      setPresetSelectionNote("");
      renderPresetFileOptions(family);
      updateJsonFromForm();
      syncLandingUi();
    }

    async function handlePresetFileChange(event) {
      const presetId =
        event && event.target && typeof event.target.value === "string"
          ? event.target.value
          : "";
      setCustomWorkloadMode(false);
      if (!presetId) {
        setActivePresetJson(null);
        setPresetSelectionNote("");
        updateJsonFromForm();
        syncLandingUi();
        return;
      }

      const preset = presetCatalog.find(function matchPreset(entry) {
        return entry.id === presetId;
      });
      if (!preset) {
        setActivePresetJson(null);
        setPresetSelectionNote("");
        updateJsonFromForm();
        syncLandingUi();
        return;
      }

      try {
        const response = await fetch(preset.path, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load preset JSON.");
        }
        const loadedJson = await response.json();
        resetFormInterface();
        if (refs.presetFamilySelect) {
          refs.presetFamilySelect.value = preset.family;
        }
        renderPresetFileOptions(preset.family);
        if (refs.presetFileSelect) {
          refs.presetFileSelect.value = preset.id;
          refs.presetFileSelect.disabled = false;
        }
        setActivePresetJson(cloneJsonValue(loadedJson));
        renderGeneratedJson(loadedJson);
        updateInteractiveStats(loadedJson);
        void validateGeneratedJson(loadedJson);
        setPresetSelectionNote(
          preset.family +
            "/" +
            preset.label +
            " loaded from " +
            preset.source +
            ". " +
            preset.description,
        );
        syncLandingUi();
      } catch (error) {
        setActivePresetJson(null);
        setPresetSelectionNote("");
        updateJsonFromForm();
        setValidationStatus(
          error && error.message ? error.message : "Failed to load preset JSON.",
          "invalid",
        );
        syncLandingUi();
      }
    }

    function bindEvents() {
      if (refs.presetFamilySelect) {
        refs.presetFamilySelect.addEventListener(
          "change",
          handlePresetFamilyChange,
        );
      }
      if (refs.presetFileSelect) {
        refs.presetFileSelect.addEventListener(
          "change",
          handlePresetFileChange,
        );
      }
      if (refs.customWorkloadBtn) {
        refs.customWorkloadBtn.addEventListener(
          "click",
          enableCustomWorkloadMode,
        );
      }
    }

    return {
      bindEvents: bindEvents,
      clearLoadedPresetState: clearLoadedPresetState,
      enableCustomWorkloadMode: enableCustomWorkloadMode,
      handlePresetFamilyChange: handlePresetFamilyChange,
      handlePresetFileChange: handlePresetFileChange,
      loadPresetCatalog: loadPresetCatalog,
      setPresetSelectionNote: setPresetSelectionNote,
      syncLandingUi: syncLandingUi,
    };
  }

  global.TectonicPresetFlow = {
    createController: createController,
  };
})(globalThis);
