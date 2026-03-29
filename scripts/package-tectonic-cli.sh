#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/bootstrap-lib.sh"

TECTONIC_SOURCE_DIR="${TECTONIC_SOURCE_DIR:-$(cd "$BOOTSTRAP_REPO_ROOT/../Tectonic" 2>/dev/null && pwd || true)}"
if [ -z "$TECTONIC_SOURCE_DIR" ] || [ ! -f "$TECTONIC_SOURCE_DIR/Cargo.toml" ]; then
  bootstrap_fail "Set TECTONIC_SOURCE_DIR to a local Tectonic checkout."
fi

bootstrap_require_commands cargo tar

DIST_DIR="${DIST_DIR:-$BOOTSTRAP_REPO_ROOT/dist}"
PACKAGE_PLATFORMS="${PACKAGE_PLATFORMS:-$BOOTSTRAP_PLATFORM}"
SUCCESSFUL_PLATFORMS=()
FAILED_PLATFORMS=()

mkdir -p "$DIST_DIR"

bootstrap_log "Packaging tectonic-cli for platforms: $PACKAGE_PLATFORMS"
bootstrap_log "Source: $TECTONIC_SOURCE_DIR"
bootstrap_log "Build mode: --all-features"

resolve_cassandra_sys_lib_path() {
  local platform env_key specific_key specific_value default_value
  platform="$1"
  env_key="$(bootstrap_platform_env_key "$platform")"
  specific_key="CASSANDRA_SYS_LIB_PATH_${env_key}"
  specific_value="${!specific_key:-}"
  if [ -n "$specific_value" ]; then
    printf '%s\n' "$specific_value"
    return
  fi
  if [ -n "${CASSANDRA_SYS_LIB_PATH:-}" ]; then
    printf '%s\n' "$CASSANDRA_SYS_LIB_PATH"
    return
  fi
  default_value="$(bootstrap_default_cassandra_sys_lib_path "$platform")"
  printf '%s\n' "$default_value"
}

ensure_rust_target_installed() {
  local rust_target
  rust_target="$1"
  if ! command -v rustup >/dev/null 2>&1; then
    return 0
  fi
  if rustup target list --installed | grep -qx "$rust_target"; then
    return 0
  fi
  bootstrap_log "Installing Rust target $rust_target"
  rustup target add "$rust_target"
}

resolve_built_tectonic_bin() {
  local rust_target default_path discovered_path
  rust_target="$1"
  default_path="$TECTONIC_SOURCE_DIR/target/$rust_target/release/tectonic-cli"
  if [ -x "$default_path" ]; then
    printf '%s\n' "$default_path"
    return 0
  fi
  discovered_path="$(
    find "$TECTONIC_SOURCE_DIR/target" \
      -path "*/$rust_target/release/tectonic-cli" \
      -type f -perm -u+x 2>/dev/null | head -n 1
  )"
  if [ -n "$discovered_path" ] && [ -x "$discovered_path" ]; then
    printf '%s\n' "$discovered_path"
    return 0
  fi
  return 1
}

TMP_DIR="$(mktemp -d)"
cleanup_tmp() {
  rm -rf "$TMP_DIR"
}
trap cleanup_tmp EXIT

build_and_package_platform() {
  local platform rust_target asset_name asset_path built_bin cassandra_sys_lib_path
  platform="$1"
  rust_target="$(bootstrap_rust_target "$platform")"
  asset_name="$(bootstrap_tectonic_asset_name "$platform")"
  asset_path="$DIST_DIR/$asset_name"
  cassandra_sys_lib_path="$(resolve_cassandra_sys_lib_path "$platform")"

  bootstrap_log "Building $platform ($rust_target)"
  ensure_rust_target_installed "$rust_target"

  if (
    cd "$TECTONIC_SOURCE_DIR"
    if [ -n "$cassandra_sys_lib_path" ]; then
      export CASSANDRA_SYS_LIB_PATH="$cassandra_sys_lib_path"
      bootstrap_log "Using CASSANDRA_SYS_LIB_PATH=$CASSANDRA_SYS_LIB_PATH"
    fi
    cargo build --release --target "$rust_target" -p tectonic-cli --bin tectonic-cli --all-features
  ); then
    built_bin="$(resolve_built_tectonic_bin "$rust_target" || true)"
    if [ -z "$built_bin" ]; then
      bootstrap_log "Build for $platform completed but no tectonic-cli binary was found under target/$rust_target."
      FAILED_PLATFORMS+=("$platform")
      return
    fi
    bootstrap_log "Using built binary at $built_bin"
    rm -f "$TMP_DIR/tectonic-cli"
    cp "$built_bin" "$TMP_DIR/tectonic-cli"
    chmod +x "$TMP_DIR/tectonic-cli"
    tar -czf "$asset_path" -C "$TMP_DIR" tectonic-cli
    bootstrap_log "Created $asset_path"
    SUCCESSFUL_PLATFORMS+=("$platform")
    return
  fi

  bootstrap_log "Build failed for $platform"
  FAILED_PLATFORMS+=("$platform")
}

OLD_IFS="$IFS"
IFS=','
for platform in $PACKAGE_PLATFORMS; do
  platform="$(printf '%s' "$platform" | xargs)"
  [ -n "$platform" ] || continue
  build_and_package_platform "$platform"
done
IFS="$OLD_IFS"

if [ "${#SUCCESSFUL_PLATFORMS[@]}" -gt 0 ]; then
  bootstrap_log "Packaged platforms: ${SUCCESSFUL_PLATFORMS[*]}"
fi
if [ "${#FAILED_PLATFORMS[@]}" -gt 0 ]; then
  bootstrap_fail "Failed platforms: ${FAILED_PLATFORMS[*]}"
fi
