# Tectonic JSON Generator

A local chat + form interface for designing Tectonic workload specs, previewing the resulting JSON, and generating real workloads with a locally installed `tectonic-cli` binary.

## Features

- Assistant-guided workload spec authoring
- Fully editable form-backed spec generation
- Live JSON preview and validation
- Local workload execution with `tectonic-cli generate`
- Download both `spec.json` and generated `workload.tar.gz`

## Requirements

- Node.js 18+
- `tectonic-cli` installed on your machine and available on `PATH`
- Ollama if you want to use the chat assistant

## Quick Start

Install dependencies:

```bash
npm install
```

Run the app:

```bash
AI_PROVIDER=ollama OLLAMA_MODEL=llama3 npm run dev
```

Open [http://localhost:8787](http://localhost:8787).

If Ollama is not configured, the form UI still loads, but `POST /api/assist` will return a runtime config error.

## Local Server

Running the app starts:

- static UI hosting from `public/`
- `POST /api/assist`
- `POST/GET /api/workloads/*` for direct local `tectonic-cli` execution

Known artifact locations:

- Latest workload file: `generated-workloads/latest-workload.tar.gz`
- Latest spec file: `generated-workloads/latest-spec.json`
- Per-run artifacts: `generated-workloads/runs/<run_id>/`

## Natural-Language Prompt Shapes

The assistant is regression-tested against three common prompt families.

### 1. Single shot workload

Example:

```text
Generate a single shot workload with 1M inserts
```

Expected shape:

- `1` section
- `1` group
- operations in that one group

### 2. Two phase interleaved workload

These prompts mean:

- phase 1 preloads the database
- phase 2 is a second group with interleaved operations that share the same valid keys

Supported phrasing includes:

- `Preload the DB with 1M inserts, then interleave 300k updates and 200k short range queries`
- `Preload the DB with 1M inserts, then interleave 80% point queries and 20% updates for 500k operations`
- `Preload the DB with 1M inserts, then interleave a write heavy phase with 70% updates and 30% point queries for 400k operations`
- `Preload the DB with 1M inserts, then write only for 250k operations`
- `Preload the DB with 1M inserts, then interleave 300k point queries and 200k long range queries`

Expected shape:

- `1` section
- `2` groups
- group 1 is preload
- group 2 is the interleaved serving/query phase

### 3. Three phase interleaved workload

These prompts are intentionally higher level:

- preload phase
- interleaved middle phase
- interleaved final phase

Supported phrasing includes:

- `Build a three phase workload: preload the DB with 1M inserts, then interleave a write-heavy phase with 70% updates and 30% point queries for 400k operations, then interleave 60% point queries and 40% long range queries for 600k operations.`
- `I want three phases: seed the database, then a hot serving phase, then a broader scan phase. Preload 1M inserts, then interleave 80% point queries and 20% updates for 500k operations, then interleave 70% point queries and 30% long range queries for 300k operations.`
- `Generate a three phase workload: first load the database with 5M inserts, next run a write-only phase for 1M operations, then run an interleaved read phase with 80% point queries and 20% short range queries for 2M operations.`

Expected shape:

- `1` section
- `3` groups
- one group per phase

Relevant regression coverage lives in:

- `test/assist-natural-language-demo.test.mjs`
- `test/assist-natural-language-extended.test.mjs`
- `test/assist-chat-session.test.mjs`

## Tests

Run the full local test suite:

```bash
npm test
```

Run the demo-oriented natural-language coverage:

```bash
make test-demo
```

Run the formal interpreter checks:

```bash
make test-formal
```

## Ollama Configuration

Environment variables:

```bash
export AI_PROVIDER=ollama
export OLLAMA_MODEL=llama3
# Optional:
# export OLLAMA_MODELS=llama3,llama3.1
# export OLLAMA_BASE_URL=http://127.0.0.1:11434
# export OLLAMA_HOST=http://127.0.0.1:11434
# export OLLAMA_API_ENDPOINT=/api/chat
# export OLLAMA_TIMEOUT_MS=65000
```

Notes:

- The default Ollama base URL is `http://127.0.0.1:11434`
- The default Ollama endpoint is `/api/chat`
- `OLLAMA_API_ENDPOINT` can be changed if you need to target a different Ollama-compatible route

## Set Up Ollama Locally

1. Install Ollama.

macOS with Homebrew:

```bash
brew install ollama
```

Or install the desktop app from [ollama.com](https://ollama.com/download).

2. Start the Ollama server.

```bash
ollama serve
```

3. Pull a local model.

```bash
ollama pull llama3
```

4. Verify the local API is reachable.

```bash
curl http://127.0.0.1:11434/api/tags
```

5. Start this app against Ollama.

```bash
AI_PROVIDER=ollama OLLAMA_MODEL=llama3 npm run dev
```

## If `tectonic-cli` Is Not Found

If `Run Workload` fails with `tectonic_cli_not_found` or `which tectonic-cli` is empty, build from your local Tectonic repo and add it to `PATH`:

```bash
cd ~/src/Tectonic
cargo build --release --bin tectonic-cli
mkdir -p ~/.cargo/bin
ln -sf ~/src/Tectonic/target/release/tectonic-cli ~/.cargo/bin/tectonic-cli
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
exec zsh -l
which tectonic-cli
tectonic-cli --help
```

## Notes

- No Worker, D1, R2, or container is required in local mode
- Run state is session-local in the UI and process-local in the local server
