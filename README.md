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
- OpenAI-compatible API key for assistant prompts (`OPENAI_API_KEY`)

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

## LLM env vars

`/api/assist` is AI-only. Configure one provider:

OpenAI-compatible API:

```bash
export ASSIST_PROVIDER=openai
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-5.1
# Optional overrides:
# export OPENAI_MODELS=gpt-5.1,gpt-5.4
# export OPENAI_BASE_URL=https://api.openai.com/v1
# export OPENAI_API_ENDPOINT=/responses
# export OPENAI_CHAT_ENDPOINT=/chat/completions
```

Cloudflare AI:

```bash
export ASSIST_PROVIDER=cloudflare
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct
# Optional multi-model retry chain:
# export CLOUDFLARE_MODELS=@cf/meta/llama-3.1-8b-instruct,@cf/meta/llama-3.3-70b-instruct-fp8-fast
```

`openai` is now the local default when `ASSIST_PROVIDER` and `AI_PROVIDER` are both unset.

Preferred naming:
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MODELS`
- Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_MODEL`, `CLOUDFLARE_MODELS`

Legacy compatibility aliases:
- `AI_PROVIDER` is still accepted as a provider selector alias
- `AI_NAME` is still accepted as a Cloudflare model alias
- `AI_MODELS` is still accepted as a Cloudflare retry-chain alias

When `ASSIST_PROVIDER=openai`, `/api/assist` uses Structured Outputs (`response_format: json_schema`, strict mode).

The default OpenAI endpoint is `/responses`. Set `OPENAI_API_ENDPOINT` or `OPENAI_CHAT_ENDPOINT` only if you need a non-default compatible API shape.

If you set `CLOUDFLARE_AI_BASE_URL`, include the Cloudflare API version path (`/client/v4`), for example:
`https://api.cloudflare.com/client/v4`

If no provider credentials are set, `/api/assist` returns a runtime config error (`ai_credentials_missing`, `openai_token_missing`, or `cloudflare_ai_credentials_missing`).

## If `tectonic-cli` is not found

If `Run Workload` fails with `tectonic_cli_not_found` (or `which tectonic-cli` is empty), build from your local Tectonic repo and add it to `PATH`:

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

- No Worker, D1, R2, or container is required in local mode.
- Run state is session-local in UI and process-local in the local server.
