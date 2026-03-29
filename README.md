# Tectonic JSON Generator

A local chat + form interface for designing Tectonic workload specs, editing them directly in the builder, and benchmarking them against local database engines with `tectonic-cli`.

## Quick Start

Run the whole project with one command:

```bash
make
```

`make` will:

- detect your OS and CPU automatically
- reuse a working local Node.js, Java, Ollama, `tectonic-cli`, or Cassandra setup when it already satisfies the pinned requirements
- otherwise bootstrap a repo-local Node.js runtime
- otherwise bootstrap a repo-local Java 17 runtime for Cassandra when a compatible Cassandra setup is not already available
- install npm dependencies
- install Ollama if it is missing
- install Cassandra `5.0.7` if it is missing
- start Cassandra for the current app session if it is not already running and functional on `127.0.0.1:9042`
- verify Cassandra with `cqlsh`
- start Ollama for the current app session if it is not already running
- pull the pinned default local model (`llama3:latest`)
- verify that Ollama resolves it to digest `365c0bd3c000`
- download the matching prebuilt `tectonic-cli` release asset for your platform
- start the app on [http://127.0.0.1:8787](http://127.0.0.1:8787)

Use `Ctrl+C` to stop the app. If `make` started Cassandra or Ollama for this session, it will stop those processes on exit.

## Supported Platforms

The bootstrap path currently targets:

- macOS `arm64`
- macOS `x86_64`
- Linux `x86_64`
- Linux `arm64`

You can inspect the resolved platform and bootstrap asset selection with:

```bash
make bootstrap-info
```

## What `make up` Expects

- `curl`
- `tar`
- `make`
- `python3` for `cqlsh`
- internet access for first-time downloads

Ollama's current official macOS support starts at macOS 14+. See the official docs:

- [Ollama macOS docs](https://docs.ollama.com/macos)
- [Ollama Linux docs](https://docs.ollama.com/linux)

## Runtime Defaults

`make` starts the app with:

- `AI_PROVIDER=ollama`
- `OLLAMA_MODEL=llama3:latest`
- `TECTONIC_BIN=<repo-local prebuilt binary>`
- Cassandra pinned to `5.0.7` on `127.0.0.1:9042`

The app server entrypoint remains:

```bash
node src/server.mjs
```

If you want to run the app manually after bootstrapping tools yourself, that still works.

## Benchmarking

The local runner benchmarks directly from the workload spec with `tectonic-cli benchmark`.

Supported databases in the UI:

- `rocksdb`
- `cassandra`
- `printdb`

For Cassandra runs, `make up` targets:

```text
127.0.0.1:9042
```

The runner writes artifacts under:

- `generated-workloads/latest-spec.json`
- `generated-workloads/latest-benchmark-output.txt`
- `generated-workloads/runs/<run_id>/`

## Development

If you already have Node installed and want the traditional local dev flow:

```bash
npm install
AI_PROVIDER=ollama OLLAMA_MODEL=llama3:latest npm run dev
```

The repo-local bootstrap scripts live in [scripts/bootstrap-lib.sh](scripts/bootstrap-lib.sh) and [scripts/run-local-dev.sh](scripts/run-local-dev.sh).

## Tests

Run the full local test suite:

```bash
npm test
```

Run the demo-oriented Ollama coverage:

```bash
make test-demo
```

## Maintainer: Prebuilt `tectonic-cli` Assets

End users do not need a local Rust or Tectonic checkout. `make` downloads platform-specific `tectonic-cli` release assets from this repo's GitHub releases.

Asset naming convention:

```text
tectonic-cli-v<version>-darwin-arm64.tar.gz
tectonic-cli-v<version>-darwin-x64.tar.gz
tectonic-cli-v<version>-linux-arm64.tar.gz
tectonic-cli-v<version>-linux-x64.tar.gz
```

To package the current platform locally from a sibling `../Tectonic` checkout:

```bash
make package-tectonic
```

To attempt the full platform matrix:

```bash
make package-tectonic-all
```

That target runs [scripts/package-tectonic-cli.sh](scripts/package-tectonic-cli.sh), which builds `tectonic-cli` with all currently available features enabled:

```bash
cargo build --release -p tectonic-cli --all-features
```

For multi-platform packaging, the script maps the repo bootstrap platforms to Rust targets:

- `darwin-arm64` -> `aarch64-apple-darwin`
- `darwin-x64` -> `x86_64-apple-darwin`
- `linux-arm64` -> `aarch64-unknown-linux-gnu`
- `linux-x64` -> `x86_64-unknown-linux-gnu`

You can override the platform list with:

```bash
PACKAGE_PLATFORMS=darwin-arm64,linux-x64 make package-tectonic
```

If Cassandra libraries live outside the default linker path, set `CASSANDRA_SYS_LIB_PATH` before packaging. On Apple Silicon macOS, that often means:

```bash
export CASSANDRA_SYS_LIB_PATH=/opt/homebrew/lib
make package-tectonic
```

For platform-specific overrides, use env vars like:

```bash
export CASSANDRA_SYS_LIB_PATH_DARWIN_ARM64=/opt/homebrew/lib
export CASSANDRA_SYS_LIB_PATH_DARWIN_X64=/usr/local/lib
```

Packaged artifacts are written to:

```text
dist/
```

Those tarballs should then be uploaded to the GitHub release tag configured by the bootstrap scripts.
