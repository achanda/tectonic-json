export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export function isCloudflareAssistProvider(value) {
  return readString(value).toLowerCase() === "cloudflare";
}

export function getCloudflareModel(envLike = process.env) {
  const env = normalizeEnv(envLike);
  return (
    readString(env.CLOUDFLARE_MODEL) ||
    readString(env.AI_NAME) ||
    firstModel(readString(env.CLOUDFLARE_MODELS)) ||
    firstModel(readString(env.AI_MODELS)) ||
    DEFAULT_CLOUDFLARE_MODEL
  );
}

export function getCloudflareModels(envLike = process.env) {
  const env = normalizeEnv(envLike);
  const explicitChain =
    readString(env.CLOUDFLARE_MODELS) || readString(env.AI_MODELS);
  const fromChain = splitModels(explicitChain);
  if (fromChain.length > 0) {
    return uniqueStrings(fromChain);
  }
  return [getCloudflareModel(env)];
}

export function buildCloudflareAssistEnv(envLike = process.env) {
  const env = normalizeEnv(envLike);
  const model = getCloudflareModel(env);
  const models = getCloudflareModels(env).join(",");
  return {
    CLOUDFLARE_MODEL: model,
    CLOUDFLARE_MODELS: models,
    AI_NAME: model,
    AI_MODELS: models,
  };
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
