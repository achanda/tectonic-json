# Tectonic JSON Generator

A chat + form interface for designing Tectonic workload specs, then generating real workloads with a locally installed `tectonic-cli` binary.

## Features

- Assistant-guided workload spec authoring
- Fully editable form-backed spec generation
- Live JSON preview + validation
- Local workload execution (`tectonic-cli generate`)
- Download both `spec.json` and generated `workload.tar.gz`

## Requirements

- Node.js 18+
- `tectonic-cli` installed on host machine and available on PATH
- Optional for LLM assist: OpenAI-compatible API key (`OPENAI_API_KEY`)

## Setup

```bash
npm install
```

## Development

Run everything with one command:

```bash
npm run dev
```

Open [http://localhost:8787](http://localhost:8787).

This starts:
- static UI hosting from `public/`
- `POST /api/assist`
- `POST/GET /api/workloads/*` (direct local `tectonic-cli` execution)

Known artifact location on host:

- Latest workload file: `generated-workloads/latest-workload.tar.gz`
- Latest spec file: `generated-workloads/latest-spec.json`
- Per-run artifacts: `generated-workloads/runs/<run_id>/`

## Optional LLM env vars

If not set, assistant uses deterministic fallback parsing.

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4.1-mini
# Optional overrides:
# export OPENAI_BASE_URL=https://api.openai.com/v1
# export OPENAI_CHAT_ENDPOINT=/chat/completions
```

## Notes

- No Worker, D1, R2, or container is required in local mode.
- Run state is session-local in UI and process-local in the local server.
