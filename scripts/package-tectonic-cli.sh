#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/bootstrap-lib.sh"

TECTONIC_SOURCE_DIR="${TECTONIC_SOURCE_DIR:-$(cd "$BOOTSTRAP_REPO_ROOT/../Tectonic" 2>/dev/null && pwd || true)}"
if [ -z "$TECTONIC_SOURCE_DIR" ] || [ ! -f "$TECTONIC_SOURCE_DIR/Cargo.toml" ]; then
  bootstrap_fail "Set TECTONIC_SOURCE_DIR to a local Tectonic checkout."
fi

bootstrap_require_commands cargo tar

CASSANDRA_SYS_LIB_PATH="${CASSANDRA_SYS_LIB_PATH:-$(bootstrap_default_cassandra_sys_lib_path)}"
DIST_DIR="${DIST_DIR:-$BOOTSTRAP_REPO_ROOT/dist}"
ASSET_NAME="$(bootstrap_tectonic_asset_name)"
ASSET_PATH="$DIST_DIR/$ASSET_NAME"

mkdir -p "$DIST_DIR"

bootstrap_log "Packaging tectonic-cli for $BOOTSTRAP_PLATFORM"
bootstrap_log "Source: $TECTONIC_SOURCE_DIR"
bootstrap_log "Build mode: --all-features"

(
  cd "$TECTONIC_SOURCE_DIR"
  if [ -n "$CASSANDRA_SYS_LIB_PATH" ]; then
    export CASSANDRA_SYS_LIB_PATH
    bootstrap_log "Using CASSANDRA_SYS_LIB_PATH=$CASSANDRA_SYS_LIB_PATH"
  fi
  cargo build --release -p tectonic-cli --all-features
)

TMP_DIR="$(mktemp -d)"
cleanup_tmp() {
  rm -rf "$TMP_DIR"
}
trap cleanup_tmp EXIT

cp "$TECTONIC_SOURCE_DIR/target/release/tectonic-cli" "$TMP_DIR/tectonic-cli"
chmod +x "$TMP_DIR/tectonic-cli"
tar -czf "$ASSET_PATH" -C "$TMP_DIR" tectonic-cli

bootstrap_log "Created $ASSET_PATH"
