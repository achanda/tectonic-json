# JSON Schema Chat Interface - Specification

## Project Overview
- **Project name**: JSON Schema Chat
- **Type**: Web application (Cloudflare Workers + static frontend)
- **Core functionality**: Chat interface that uses Cloudflare Workers AI to generate JSON documents conforming to a user-provided JSON schema
- **Target users**: Developers and data engineers who need to quickly generate valid JSON from natural language

## Architecture

### Backend (Cloudflare Workers)
- Single Worker handling:
  - Static HTML/JS frontend serving
  - `/api/chat` endpoint for LLM interactions
- Uses `@cf/meta/llama-3.1-8b-instruct` or similar model
- JSON mode enabled for structured output

### Frontend
- Single HTML page with embedded CSS/JS
- Split view: schema editor (left), chat + output (right)

## UI/UX Specification

### Layout Structure
- **Header**: App title, minimal height (60px)
- **Main content**: Two-column layout
  - Left panel (40%): JSON Schema input
  - Right panel (60%): Chat interface + generated JSON
- **Responsive**: Stack panels vertically on mobile (<768px)

### Visual Design

#### Color Palette
- Background: `#0d1117` (dark)
- Surface: `#161b22`
- Border: `#30363d`
- Primary accent: `#58a6ff` (blue)
- Success: `#3fb950` (green)
- Error: `#f85149` (red)
- Text primary: `#e6edf3`
- Text secondary: `#8b949e`

#### Typography
- Font family: `"JetBrains Mono", "Fira Code", monospace` for code
- Font family: `"DM Sans", system-ui` for UI text
- Headings: 18px bold
- Body: 14px
- Code: 13px

#### Spacing
- Container padding: 20px
- Panel gap: 16px
- Element spacing: 12px

### Components

1. **Schema Editor**
   - Textarea with JSON syntax highlighting (basic)
   - Placeholder with example schema
   - "Validate Schema" button
   - Validation status indicator

2. **Chat Interface**
   - Message bubbles (user: right-aligned blue, assistant: left-aligned surface)
   - Input field with send button
   - Loading spinner during API calls

3. **JSON Output Panel**
   - Read-only textarea showing generated JSON
   - "Copy" button
   - "Validate" button against schema
   - Validation result badge

## Functionality Specification

### Core Features

1. **Schema Input**
   - User can paste/edit JSON schema
   - Schema validation on input (basic JSON parse + structure check)
   - Persist schema in localStorage

2. **Chat Interaction**
   - User types natural language request
   - System sends: schema + conversation history + user message
   - Assistant responds with JSON (enforced via `response_format: { type: "json_object" }`)
   - Display assistant response in chat

3. **JSON Validation**
   - Validate generated JSON against schema using external library
   - Show validation errors if any
   - Indicate success when valid

4. **Cloudflare Best Practices**
   - Use `LLAMA_3_1_8B_INSTRUCT` or `LLAMA_3_2_1B_INSTRUCT` model
   - Set `max_tokens` limit (2000)
   - Include schema in system prompt for enforcement
   - Handle rate limits gracefully

### User Flows

1. **Initial Setup**
   - User loads page → sees default example schema
   - User replaces with their schema
   - Schema validated automatically

2. **Generate JSON**
   - User types request in chat
   - Clicks send or presses Enter
   - Loading state shown
   - Response displayed in chat
   - JSON extracted and shown in output panel

3. **Validation**
   - Click "Validate" button
   - Results shown (valid/invalid with errors)

### Edge Cases
- Invalid JSON schema → show error, prevent chat
- LLM returns non-JSON → show error, allow retry
- Empty schema → show warning
- Network error → show retry option

## Acceptance Criteria

1. Page loads locally via `wrangler dev`
2. User can input and validate a JSON schema
3. User can send chat messages and receive JSON responses
4. Generated JSON is displayed separately
5. JSON can be validated against the schema
6. All Cloudflare Workers AI best practices followed
7. UI is responsive and visually polished
