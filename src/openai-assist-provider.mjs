export const DEFAULT_OPENAI_MODEL = "gpt-5.1";

export function isOpenAiAssistProvider(value) {
  const provider = readString(value).toLowerCase();
  return provider === "openai" || provider === "openai_compatible";
}

export function getOpenAiModel(envLike = process.env) {
  const env = normalizeEnv(envLike);
  return (
    readString(env.OPENAI_MODEL) ||
    firstModel(readString(env.OPENAI_MODELS)) ||
    readLegacyOpenAiModel(env) ||
    DEFAULT_OPENAI_MODEL
  );
}

export function getOpenAiModels(envLike = process.env) {
  const env = normalizeEnv(envLike);
  const explicitChain =
    readString(env.OPENAI_MODELS) || readLegacyOpenAiModels(env);
  const fromChain = splitModels(explicitChain).filter(
    (value) => !value.startsWith("@cf/"),
  );
  if (fromChain.length > 0) {
    return uniqueStrings(fromChain);
  }
  return [getOpenAiModel(env)];
}

export function buildOpenAiAssistEnv(envLike = process.env) {
  const env = normalizeEnv(envLike);
  const model = getOpenAiModel(env);
  const models = getOpenAiModels(env).join(",");
  return {
    OPENAI_MODEL: model,
    OPENAI_MODELS: models,
    AI_NAME: model,
    AI_MODELS: models,
  };
}

function readLegacyOpenAiModel(env) {
  const legacy = readString(env.AI_NAME);
  if (!legacy || legacy.startsWith("@cf/")) {
    return "";
  }
  return legacy;
}

function readLegacyOpenAiModels(env) {
  const legacy = readString(env.AI_MODELS);
  if (!legacy || legacy.includes("@cf/")) {
    return "";
  }
  return legacy;
}

function firstModel(value) {
  return splitModels(value)[0] || "";
}

function splitModels(value) {
  return readString(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeEnv(envLike) {
  return envLike && typeof envLike === "object" ? envLike : {};
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
