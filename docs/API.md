# API

This document describes the current HTTP API exposed by the local app server.

Base URL:

- `http://127.0.0.1:8787`

## App endpoints

### `POST /api/assist`

Natural-language workload editing.

Request body:

- `prompt` required
- optional:
  - `schema_hints`
  - `form_state`
  - `current_json`
  - `conversation`
  - `answers`

Behavior:

- normalizes the current workload context
- tries deterministic prompt handlers first
- otherwise calls the configured AI provider
- returns a normalized assist payload for the UI

Typical response fields:

- `summary`
- `patch`
- `clarifications`
- `assumptions`
- `questions`
- `assumption_texts`
- `source`
- sometimes `ai_output` and `ai_timing`

Common errors:

- `400` invalid JSON or missing prompt
- `502` AI request failed or produced unusable output
- `503` AI provider not configured

Defined in:

- [/Users/Abhishek/src/tectonic-json/src/server.mjs](/Users/Abhishek/src/tectonic-json/src/server.mjs)
- [/Users/Abhishek/src/tectonic-json/src/index.js](/Users/Abhishek/src/tectonic-json/src/index.js)

### `GET /api/health`

App health and runtime configuration.

Response includes:

- `ok`
- app `mode`
- AI provider enablement/config
- workload runner config

Defined in:

- [/Users/Abhishek/src/tectonic-json/src/server.mjs](/Users/Abhishek/src/tectonic-json/src/server.mjs)

## Workload runner endpoints

The app server routes `/api/workloads/*` directly to the local workload runner.

Defined in:

- [/Users/Abhishek/src/tectonic-json/src/server.mjs](/Users/Abhishek/src/tectonic-json/src/server.mjs)
- [/Users/Abhishek/src/tectonic-json/src/local-tectonic-runner.mjs](/Users/Abhishek/src/tectonic-json/src/local-tectonic-runner.mjs)

### `GET /api/workloads/health`

Runner health/config.

Response includes:

- `ok`
- runner type
- host/port
- `tectonic_bin`
- output directory

### `POST /api/workloads/runs`

Start a benchmark run.

Request body:

- `spec_json` required
- optional `run_options`:
  - `database`
  - `timeout_seconds`

Behavior:

- normalizes and validates the workload spec
- writes the per-run spec artifact
- starts `tectonic-cli benchmark -w <spec> -d <database>`
- returns a queued/starting run record

Response includes:

- `run_id`
- `status`
- `created_at`
- `progress_text`
- `progress`
- `output_paths`
- `downloads`

### `GET /api/workloads/runs/:runId`

Fetch run status.

Response includes:

- `run_id`
- `status`
- `progress_text`
- `progress`
- `error`
- `output_paths`
- `artifacts`
- `links`
- `created_at`
- `benchmark_stats` when available

### `POST /api/workloads/runs/:runId/cancel`

Cancel an active benchmark run.

Behavior:

- marks the run cancelled
- sends `SIGTERM`
- later escalates to `SIGKILL` if the child does not exit

### `GET /api/workloads/runs/:runId/download/spec`

Download the run input spec JSON.

### `GET /api/workloads/runs/:runId/download/output`

Download the benchmark output log.

Returns `409` if the output artifact is not ready yet.

## Notes

- There is no current `/api/chat` route in this app.
- Static assets and `/` are served by the app server but are not part of the API.
