import fs from "node:fs";

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOrInsertScalar(text, key, value) {
  const activePattern = new RegExp(`^${escapeRegex(key)}:.*$`, "m");
  const commentedPattern = new RegExp(`^#\\s*${escapeRegex(key)}:.*$`, "m");
  const rendered = `${key}: ${value}`;
  if (activePattern.test(text)) {
    return text.replace(activePattern, rendered);
  }
  if (commentedPattern.test(text)) {
    return text.replace(commentedPattern, rendered);
  }
  return `${text.trimEnd()}\n${rendered}\n`;
}

function replaceOrInsertList(text, key, values) {
  const rendered = `${key}:\n${values.map((value) => `    - ${value}`).join("\n")}`;
  const activePattern = new RegExp(`^${escapeRegex(key)}:\\n(?:\\s*-\\s*.*\\n?)+`, "m");
  const commentedPattern = new RegExp(`^#\\s*${escapeRegex(key)}:\\n(?:\\s*#\\s*-\\s*.*\\n?)+`, "m");
  if (activePattern.test(text)) {
    return text.replace(activePattern, `${rendered}\n`);
  }
  if (commentedPattern.test(text)) {
    return text.replace(commentedPattern, `${rendered}\n`);
  }
  return `${text.trimEnd()}\n${rendered}\n`;
}

export function updateCassandraConfig(text, options) {
  const {
    dataDir,
    commitlogDir,
    savedCachesDir,
    hintsDir,
    cdcDir,
    host,
    port,
  } = options;

  let next = text;
  next = replaceOrInsertScalar(next, "commitlog_directory", commitlogDir);
  next = replaceOrInsertScalar(next, "saved_caches_directory", savedCachesDir);
  next = replaceOrInsertScalar(next, "hints_directory", hintsDir);
  next = replaceOrInsertScalar(next, "cdc_raw_directory", cdcDir);
  next = replaceOrInsertScalar(next, "listen_address", host);
  next = replaceOrInsertScalar(next, "rpc_address", host);
  next = replaceOrInsertScalar(next, "native_transport_address", host);
  next = replaceOrInsertScalar(next, "native_transport_port", port);
  next = replaceOrInsertList(next, "data_file_directories", [dataDir]);
  return next;
}

export function rewriteCassandraConfigFile(configPath, options) {
  const text = fs.readFileSync(configPath, "utf8");
  const updated = updateCassandraConfig(text, options);
  fs.writeFileSync(configPath, updated);
}
