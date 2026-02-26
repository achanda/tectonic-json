# JSON Schema Chat

A chat interface for designing JSON documents using Cloudflare Workers AI. Describe what JSON you want in natural language, and the LLM generates valid JSON that conforms to your schema.

## Features

- **Schema Editor**: Paste or write a JSON Schema with validation
- **Natural Language Input**: Describe the JSON you want in plain English
- **JSON Validation**: Validate generated JSON against your schema using Ajv
- **Cloudflare Workers AI**: Uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with JSON mode enforced
- **Local Storage**: Schema persists across sessions

## Requirements

- Node.js 18+
- Cloudflare account with Workers AI enabled
- npm or yarn

## Important: Workers AI requires deployment

Workers AI does not work in local development (`npm run dev`). You must deploy to Cloudflare to use the AI features:

```bash
npm run deploy
```

Then open your deployed worker URL.

## Setup

```bash
npm install
```

## Development (UI only)

```bash
npm run dev
```

Open http://localhost:8787

Note: The chat functionality requires deployment since Workers AI isn't available locally.

## Deployment

```bash
npm run deploy
```

Requires a Cloudflare account with Workers AI enabled.

## Environment Variables

In `wrangler.toml`:

```toml
[vars]
AI_NAME = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
```

## Usage

1. Enter a JSON Schema in the left panel
2. Type a request in the chat (e.g., "Create a user profile with name, email, and age")
3. The generated JSON appears in the output panel
4. Click "Validate" to verify it conforms to your schema
