#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/bootstrap-lib.sh"

key="${1:-}"

case "$key" in
  platform) printf '%s\n' "$BOOTSTRAP_PLATFORM" ;;
  node-version) printf '%s\n' "$BOOTSTRAP_NODE_VERSION" ;;
  java-version) printf '%s\n' "$BOOTSTRAP_JAVA_VERSION" ;;
  node-archive) bootstrap_node_archive_name ;;
  node-url) bootstrap_node_archive_url ;;
  node-bin) bootstrap_node_bin ;;
  rust-target) bootstrap_rust_target ;;
  tectonic-version) printf '%s\n' "$BOOTSTRAP_TECTONIC_CLI_VERSION" ;;
  tectonic-asset) bootstrap_tectonic_asset_name ;;
  tectonic-url) bootstrap_tectonic_asset_url ;;
  tectonic-bin) bootstrap_tectonic_bin ;;
  ollama-version) printf '%s\n' "$BOOTSTRAP_OLLAMA_VERSION" ;;
  ollama-model) printf '%s\n' "$BOOTSTRAP_OLLAMA_MODEL" ;;
  ollama-digest) printf '%s\n' "$BOOTSTRAP_OLLAMA_MODEL_DIGEST" ;;
  cassandra-version) printf '%s\n' "$BOOTSTRAP_CASSANDRA_VERSION" ;;
  cassandra-url) bootstrap_cassandra_archive_url ;;
  cassandra-sys-lib-path) bootstrap_default_cassandra_sys_lib_path ;;
  *)
    cat >&2 <<'EOF'
Usage: scripts/bootstrap-info.sh <key>

Keys:
  platform
  node-version
  java-version
  node-archive
  node-url
  node-bin
  rust-target
  tectonic-version
  tectonic-asset
  tectonic-url
  tectonic-bin
  ollama-version
  ollama-model
  ollama-digest
  cassandra-version
  cassandra-url
  cassandra-sys-lib-path
EOF
    exit 1
    ;;
esac
