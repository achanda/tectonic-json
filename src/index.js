const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JSON Schema Chat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --success: #3fb950;
      --error: #f85149;
      --text: #e6edf3;
      --text-dim: #8b949e;
    }
    
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    header {
      height: 60px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    
    header h1 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    header h1::before {
      content: '{ }';
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      font-size: 16px;
    }
    
    main {
      flex: 1;
      display: flex;
      gap: 16px;
      padding: 20px;
      overflow: hidden;
    }
    
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .panel-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    
    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    
    .panel-body {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }
    
    .left-panel { width: 40%; min-width: 300px; }
    .right-panel { flex: 1; min-width: 0; }
    
    textarea {
      width: 100%;
      height: 100%;
      background: transparent;
      border: none;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }
    
    textarea::placeholder { color: var(--text-dim); }
    
    .btn {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      font-family: inherit;
    }
    
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-ghost {
      background: transparent;
      color: var(--text-dim);
      border: 1px solid var(--border);
    }
    
    .btn-ghost:hover { color: var(--text); border-color: var(--text-dim); }
    
    .status {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .status-valid .status-dot { background: var(--success); }
    .status-invalid .status-dot { background: var(--error); }
    .status-pending .status-dot { background: var(--text-dim); }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 12px;
    }
    
    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    
    .message-user {
      align-self: flex-end;
      background: var(--accent);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    
    .message-assistant {
      align-self: flex-start;
      background: var(--border);
      color: var(--text);
      border-bottom-left-radius: 4px;
    }
    
    .message-error {
      align-self: center;
      background: rgba(248, 81, 73, 0.15);
      color: var(--error);
      border: 1px solid var(--error);
    }
    
    .chat-input-area {
      display: flex;
      gap: 10px;
      padding: 16px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    
    .chat-input {
      flex: 1;
      padding: 12px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    
    .chat-input:focus { border-color: var(--accent); }
    
    .json-output {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
    }
    
    .json-output textarea {
      flex: 1;
      background: var(--bg);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--border);
    }
    
    .json-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .validation-result {
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      display: none;
    }
    
    .validation-result.show { display: block; }
    .validation-result.valid { background: rgba(63, 185, 80, 0.15); color: var(--success); border: 1px solid var(--success); }
    .validation-result.invalid { background: rgba(248, 81, 73, 0.15); color: var(--error); border: 1px solid var(--error); }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--text-dim);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-dim);
      text-align: center;
      padding: 40px;
    }
    
    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    @media (max-width: 768px) {
      main { flex-direction: column; }
      .left-panel { width: 100%; min-height: 300px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>JSON Schema Chat</h1>
  </header>
  <main>
    <div class="panel left-panel">
      <div class="panel-header">
        <span class="panel-title">JSON Schema</span>
        <span class="status status-pending" id="schemaStatus">
          <span class="status-dot"></span>
          <span id="schemaStatusText">Fixed schema</span>
        </span>
      </div>
      <div class="panel-body">
        <textarea id="schemaInput" spellcheck="false" readonly></textarea>
      </div>
    </div>
    <div class="right-panel" style="display: flex; flex-direction: column; gap: 16px;">
      <div class="panel" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
        <div class="panel-header">
          <span class="panel-title">Chat</span>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p>Describe what JSON you want to generate</p>
          </div>
        </div>
        <div class="chat-input-area">
	          <input type="text" class="chat-input" id="chatInput" value="generate a schema" placeholder="e.g., Create a user profile with name, email, and age...">
          <button class="btn btn-primary" id="sendBtn">Send</button>
        </div>
      </div>
      <div class="panel" style="height: 280px; flex-shrink: 0;">
        <div class="panel-header">
          <span class="panel-title">Generated JSON</span>
          <div class="json-actions">
            <div class="validation-result" id="validationResult"></div>
            <button class="btn btn-ghost" id="validateBtn">Validate</button>
            <button class="btn btn-ghost" id="copyBtn">Copy</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="json-output">
            <textarea id="jsonOutput" readonly placeholder="Generated JSON will appear here..."></textarea>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    const schemaInput = document.getElementById('schemaInput');
    const schemaStatus = document.getElementById('schemaStatus');
    const schemaStatusText = document.getElementById('schemaStatusText');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const jsonOutput = document.getElementById('jsonOutput');
    const validateBtn = document.getElementById('validateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const validationResult = document.getElementById('validationResult');

    let schema = null;
    let chatHistory = [];

    const s = "https://json-schema.org/draft/2020-12/schema";
    const defaultSchema = {
      "$schema": s,
      "title": "WorkloadSpec",
      "type": "object",
      "properties": {
        "character_set": {
          "description": "The domain from which the keys will be created from.",
          "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }]
        },
        "sections": {
          "description": "Sections of a workload where a key from one will (probably) not appear in another.",
          "type": "array",
          "items": { "$ref": "#/$defs/WorkloadSpecSection" }
        }
      },
      "required": ["sections"],
      "$defs": {
        "CharacterSet": { "type": "string", "enum": ["alphanumeric", "alphabetic", "numeric"] },
        "Distribution": {
          "oneOf": [
            {
              "type": "object",
              "properties": { "uniform": { "type": "object", "properties": { "max": { "type": "number", "format": "double" }, "min": { "type": "number", "format": "double" } }, "required": ["min", "max"] } },
              "additionalProperties": false,
              "required": ["uniform"]
            },
            {
              "type": "object",
              "properties": { "normal": { "type": "object", "properties": { "mean": { "type": "number", "format": "double" }, "std_dev": { "type": "number", "format": "double" } }, "required": ["mean", "std_dev"] } },
              "additionalProperties": false,
              "required": ["normal"]
            },
            {
              "type": "object",
              "properties": { "beta": { "type": "object", "properties": { "alpha": { "type": "number", "format": "double" }, "beta": { "type": "number", "format": "double" } }, "required": ["alpha", "beta"] } },
              "additionalProperties": false,
              "required": ["beta"]
            },
            {
              "type": "object",
              "properties": { "zipf": { "type": "object", "properties": { "n": { "type": "integer", "format": "uint", "minimum": 0 }, "s": { "type": "number", "format": "double" } }, "required": ["n", "s"] } },
              "additionalProperties": false,
              "required": ["zipf"]
            },
            {
              "type": "object",
              "properties": { "exponential": { "type": "object", "properties": { "lambda": { "type": "number", "format": "double" } }, "required": ["lambda"] } },
              "additionalProperties": false,
              "required": ["exponential"]
            },
            {
              "type": "object",
              "properties": { "log_normal": { "type": "object", "properties": { "mean": { "type": "number", "format": "double" }, "std_dev": { "type": "number", "format": "double" } }, "required": ["mean", "std_dev"] } },
              "additionalProperties": false,
              "required": ["log_normal"]
            },
            {
              "type": "object",
              "properties": { "poisson": { "type": "object", "properties": { "lambda": { "type": "number", "format": "double" } }, "required": ["lambda"] } },
              "additionalProperties": false,
              "required": ["poisson"]
            },
            {
              "type": "object",
              "properties": { "weibull": { "type": "object", "properties": { "scale": { "type": "number", "format": "double" }, "shape": { "type": "number", "format": "double" } }, "required": ["scale", "shape"] } },
              "additionalProperties": false,
              "required": ["weibull"]
            },
            {
              "type": "object",
              "properties": { "pareto": { "type": "object", "properties": { "scale": { "type": "number", "format": "double" }, "shape": { "type": "number", "format": "double" } }, "required": ["scale", "shape"] } },
              "additionalProperties": false,
              "required": ["pareto"]
            }
          ]
        },
        "EmptyPointDeletes": { "description": "Empty point deletes specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "key": { "description": "Key", "$ref": "#/$defs/StringExpr" }, "op_count": { "description": "Number of empty point deletes", "$ref": "#/$defs/NumberExpr" } }, "required": ["op_count", "key"] },
        "EmptyPointQueries": { "description": "Empty point queries specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "key": { "description": "Key", "$ref": "#/$defs/StringExpr" }, "op_count": { "description": "Number of point queries", "$ref": "#/$defs/NumberExpr" } }, "required": ["op_count", "key"] },
        "Inserts": { "description": "Inserts specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "key": { "description": "Key", "$ref": "#/$defs/StringExpr" }, "op_count": { "description": "Number of inserts", "$ref": "#/$defs/NumberExpr" }, "val": { "description": "Value", "$ref": "#/$defs/StringExpr" } }, "required": ["op_count", "key", "val"] },
        "Merges": { "description": "Merges (read-modify-write) specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "op_count": { "description": "Number of merges", "$ref": "#/$defs/NumberExpr" }, "selection": { "description": "Key selection strategy", "$ref": "#/$defs/Distribution" }, "val": { "description": "Value", "$ref": "#/$defs/StringExpr" } }, "required": ["op_count", "val"] },
        "NumberExpr": { "anyOf": [{ "type": "number", "format": "double" }, { "$ref": "#/$defs/Distribution" }] },
        "PointDeletes": { "description": "Non-empty point deletes specification.", "type": "object", "properties": { "op_count": { "description": "Number of non-empty point deletes", "$ref": "#/$defs/NumberExpr" }, "selection": { "description": "Key selection strategy", "$ref": "#/$defs/Distribution" } }, "required": ["op_count"] },
        "PointQueries": { "description": "Non-empty point queries specification.", "type": "object", "properties": { "op_count": { "description": "Number of point queries", "$ref": "#/$defs/NumberExpr" }, "selection": { "description": "Key selection strategy of the start key", "$ref": "#/$defs/Distribution" } }, "required": ["op_count"] },
        "RangeDeletes": { "description": "Range deletes specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "op_count": { "description": "Number of range deletes", "$ref": "#/$defs/NumberExpr" }, "range_format": { "description": "The format for the range", "$ref": "#/$defs/RangeFormat" }, "selection": { "description": "Key selection strategy of the start key", "$ref": "#/$defs/Distribution" }, "selectivity": { "description": "Selectivity of range deletes. Based off of the range of valid keys, not the full key space.", "$ref": "#/$defs/NumberExpr" } }, "required": ["op_count", "selectivity"] },
        "RangeFormat": { "oneOf": [{ "description": "The start key and the number of keys to scan", "type": "string", "const": "StartCount" }, { "description": "The start key and end key", "type": "string", "const": "StartEnd" }] },
        "RangeQueries": { "description": "Range queries specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "op_count": { "description": "Number of range queries", "$ref": "#/$defs/NumberExpr" }, "range_format": { "description": "The format for the range", "$ref": "#/$defs/RangeFormat" }, "selection": { "description": "Key selection strategy of the start key", "$ref": "#/$defs/Distribution" }, "selectivity": { "description": "Selectivity of range queries. Based off of the range of valid keys, not the full key-space.", "$ref": "#/$defs/NumberExpr" } }, "required": ["op_count", "selectivity"] },
        "Sorted": { "type": "object", "properties": { "k": { "description": "The number of displaced operations.", "$ref": "#/$defs/NumberExpr" }, "l": { "description": "The distance between swapped elements.", "$ref": "#/$defs/NumberExpr" } }, "required": ["k", "l"] },
        "StringExpr": { "anyOf": [{ "type": "string" }, { "$ref": "#/$defs/StringExprInner" }] },
        "StringExprInner": {
          "oneOf": [
            { "type": "object", "properties": { "uniform": { "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "len": { "description": "The length of the string to sample.", "$ref": "#/$defs/NumberExpr" } }, "required": ["len"] } }, "additionalProperties": false, "required": ["uniform"] },
            { "type": "object", "properties": { "weighted": { "type": "array", "items": { "$ref": "#/$defs/Weight" } } }, "additionalProperties": false, "required": ["weighted"] },
            { "type": "object", "properties": { "segmented": { "type": "object", "properties": { "segments": { "description": "The segments to use for the string.", "type": "array", "items": { "$ref": "#/$defs/StringExpr" } }, "separator": { "type": "string" } }, "required": ["separator", "segments"] } }, "additionalProperties": false, "required": ["segmented"] },
            { "type": "object", "properties": { "hot_range": { "type": "object", "properties": { "amount": { "type": "integer", "format": "uint", "minimum": 0 }, "len": { "type": "integer", "format": "uint", "minimum": 0 }, "probability": { "type": "number", "format": "double" } }, "required": ["len", "amount", "probability"] } }, "additionalProperties": false, "required": ["hot_range"] }
          ]
        },
        "Updates": { "description": "Updates specification.", "type": "object", "properties": { "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "op_count": { "description": "Number of updates", "$ref": "#/$defs/NumberExpr" }, "selection": { "description": "Key selection strategy", "$ref": "#/$defs/Distribution" }, "val": { "description": "Value", "$ref": "#/$defs/StringExpr" } }, "required": ["op_count", "val"] },
        "Weight": { "type": "object", "properties": { "value": { "description": "The value of the item.", "$ref": "#/$defs/StringExpr" }, "weight": { "description": "The weight of the item.", "type": "number", "format": "double" } }, "required": ["weight", "value"] },
        "WorkloadSpecGroup": {
          "type": "object",
          "properties": {
            "character_set": { "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] },
            "empty_point_deletes": { "anyOf": [{ "$ref": "#/$defs/EmptyPointDeletes" }, { "type": "null" }] },
            "empty_point_queries": { "anyOf": [{ "$ref": "#/$defs/EmptyPointQueries" }, { "type": "null" }] },
            "inserts": { "anyOf": [{ "$ref": "#/$defs/Inserts" }, { "type": "null" }] },
            "merges": { "anyOf": [{ "$ref": "#/$defs/Merges" }, { "type": "null" }] },
            "point_deletes": { "anyOf": [{ "$ref": "#/$defs/PointDeletes" }, { "type": "null" }] },
            "point_queries": { "anyOf": [{ "$ref": "#/$defs/PointQueries" }, { "type": "null" }] },
            "range_deletes": { "anyOf": [{ "$ref": "#/$defs/RangeDeletes" }, { "type": "null" }] },
            "range_queries": { "anyOf": [{ "$ref": "#/$defs/RangeQueries" }, { "type": "null" }] },
            "sorted": { "anyOf": [{ "$ref": "#/$defs/Sorted" }, { "type": "null" }] },
            "updates": { "anyOf": [{ "$ref": "#/$defs/Updates" }, { "type": "null" }] }
          }
        },
        "WorkloadSpecSection": { "type": "object", "properties": { "character_set": { "description": "The domain from which the keys will be created from.", "anyOf": [{ "$ref": "#/$defs/CharacterSet" }, { "type": "null" }] }, "groups": { "description": "A list of groups. Groups share valid keys between operations.\\n\\nE.g., non-empty point queries will use a key from an insert in this group.", "type": "array", "items": { "$ref": "#/$defs/WorkloadSpecGroup" } }, "skip_key_contains_check": { "description": "Whether to skip the check that a generated key is in the valid key set for inserts and empty point queries/deletes.", "type": "boolean", "default": false } }, "required": ["groups"] }
      }
    };

    schemaInput.value = JSON.stringify(defaultSchema, null, 2);
    validateSchema();

    function debounce(fn, ms) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    function validateSchema() {
      const value = schemaInput.value.trim();
      if (!value) {
        schema = null;
        setSchemaStatus('pending', 'Enter schema');
        return;
      }
      try {
        schema = JSON.parse(value);
        if (!schema.$schema && !schema.type) {
          setSchemaStatus('invalid', 'Invalid schema');
          return;
        }
        setSchemaStatus('valid', 'Valid schema');
      } catch (e) {
        schema = null;
        setSchemaStatus('invalid', 'Invalid JSON');
      }
    }

    function setSchemaStatus(status, text) {
      schemaStatus.className = 'status status-' + status;
      schemaStatusText.textContent = text;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      chatInput.value = '';
      addMessage(message, 'user');
      chatHistory.push({ role: 'user', content: message });

      const loading = addMessage('Thinking...', 'assistant', true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: schema ? schemaInput.value : null,
            message,
            history: chatHistory
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }

        const data = await response.json();
        loading.remove();

        if (data.error) {
          addMessage(data.error, 'error');
        } else {
          if (data.mode === 'question') {
            addMessage(data.response, 'assistant');
            chatHistory.push({ role: 'assistant', content: data.response });
            return;
          }

          if (data.mode === 'json') {
            chatHistory.push({ role: 'assistant', content: '[JSON generated]' });
          } else {
            addMessage(data.response, 'assistant');
            chatHistory.push({ role: 'assistant', content: data.response });
          }

          try {
            const json = JSON.parse(data.response);
            jsonOutput.value = JSON.stringify(json, null, 2);
            validationResult.className = 'validation-result';
          } catch (e) {
            jsonOutput.value = data.response;
          }
        }
      } catch (e) {
        loading.remove();
        addMessage(e.message || 'Failed to get response', 'error');
      }
    }

    function addMessage(content, type, isLoading = false) {
      if (chatMessages.querySelector('.empty-state')) {
        chatMessages.innerHTML = '';
      }
      const div = document.createElement('div');
      div.className = 'message message-' + type;
      if (isLoading) {
        div.innerHTML = '<div class="spinner"></div>';
      } else {
        div.textContent = content;
      }
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return div;
    }

    copyBtn.addEventListener('click', () => {
      const text = jsonOutput.value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 1500);
      });
    });

    validateBtn.addEventListener('click', async () => {
      const jsonText = jsonOutput.value.trim();
      if (!jsonText || !schema) {
        validationResult.textContent = 'No JSON or schema to validate';
        validationResult.className = 'validation-result show invalid';
        return;
      }
      try {
        const json = JSON.parse(jsonText);
        const { default: Ajv2020 } = await import('https://esm.sh/ajv@8.17.1/dist/2020?bundle');
        const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
        const validate = ajv.compile(schema);
        const valid = validate(json);
        if (valid) {
          validationResult.textContent = 'Valid! JSON conforms to schema.';
          validationResult.className = 'validation-result show valid';
        } else {
          const errors = (validate.errors || []).map((e) => {
            const path = e.instancePath || '/';
            return (path + ' ' + e.message).trim();
          }).join(', ');
          validationResult.textContent = 'Invalid: ' + errors;
          validationResult.className = 'validation-result show invalid';
        }
      } catch (e) {
        validationResult.textContent = 'Parse error: ' + e.message;
        validationResult.className = 'validation-result show invalid';
      }
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleChat(request, env) {
  try {
    const { schema, message, history = [] } = await request.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const safeHistory = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'));
    const last = safeHistory[safeHistory.length - 1];
    const fullConversation = (last && last.role === 'user' && last.content === message)
      ? safeHistory
      : [...safeHistory, { role: 'user', content: message }];
    const resolvedClarifications = extractClarificationAnswers(fullConversation);
    const conversation = fullConversation.slice(-20);
    const askedClarifications = fullConversation.filter(
      (m) => m.role === 'assistant' &&
        typeof m.content === 'string' &&
        m.content.startsWith('Clarification ')
    ).length;

    const ai = env.AI;
    const modelName = env.AI_NAME || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    const maxAttempts = Math.max(1, Number(env.AI_RETRY_ATTEMPTS || 2));

    if (!ai || typeof ai.run !== 'function') {
      return Response.json({ 
        error: 'Workers AI binding is not available. Ensure `[ai] binding = "AI"` is configured and redeploy.' 
      }, { status: 503 });
    }

    const aiInputBase = {
      max_tokens: 1600,
      temperature: 0.3
    };

    let parsedSchema = null;
    if (schema) {
      try {
        parsedSchema = JSON.parse(schema);
        aiInputBase.response_format = {
          type: 'json_schema',
          json_schema: parsedSchema
        };
      } catch {
        // Schema is already validated client-side; if parsing fails here, fall back to prompt-only guidance.
      }
    }

    if (parsedSchema) {
      const maxClarifications = Math.max(1, Number(env.AI_MAX_QUESTIONS || 20));
      const selectedOps = parseOperationsAnswer(
        resolvedClarifications.operations || 'inserts + point_queries'
      );
      const requiredClarifications = [
        {
          assumptionKey: 'operations',
          question: 'What operations should be included (inserts, updates, point_queries, range_queries, point_deletes, range_deletes, empty_point_queries, empty_point_deletes, merges)?',
          assumedValue: 'inserts + point_queries',
          reason: 'This is the most common baseline workload shape.',
          extra: 'Default op_count assumptions: inserts=1000000, point_queries=500000'
        },
        {
          assumptionKey: 'operation_timing',
          question: 'Should operations be sequential (preload then queries) or interleaved (mixed in same phase)?',
          assumedValue: 'sequential',
          reason: 'Sequential preload then query is a safe default and easier to reason about.'
        },
        {
          assumptionKey: 'phase_model',
          question: 'Is this a single-phase workload or a multi-phase shifting workload?',
          assumedValue: 'single phase',
          reason: 'Single-phase is the simplest default, but multi-phase supports abruptly/slowly shifting workloads.'
        },
        {
          assumptionKey: 'phase_count',
          question: 'How many phases/sections should the workload have?',
          assumedValue: '1',
          reason: 'One section is the default unless workload behavior should shift over time.'
        },
        {
          assumptionKey: 'keyspace_sharing',
          question: 'Should operations share the same valid keyspace or use different keyspaces?',
          assumedValue: 'same keyspace',
          reason: 'Most benchmark-style workloads query keys produced by inserts.'
        },
        {
          assumptionKey: 'key_pattern',
          question: 'What key pattern should be used (uniform, segmented, weighted, hot_range)?',
          assumedValue: 'uniform key with len=20',
          reason: 'Uniform keys are the simplest valid default and align with common examples.'
        },
        {
          assumptionKey: 'value_pattern',
          question: 'What value pattern should be used (uniform, weighted, segmented) and what lengths?',
          assumedValue: 'uniform value with len=256',
          reason: 'This matches the common baseline specs and keeps payload sizes moderate.'
        },
        {
          assumptionKey: 'character_set',
          question: 'Which character_set should keys use (alphanumeric, alphabetic, numeric)?',
          assumedValue: 'alphanumeric',
          reason: 'This is the documented default for string generation.'
        },
        {
          assumptionKey: 'special_requirements',
          question: 'Any special requirements (sorted inserts, range_format StartCount/StartEnd, skip_key_contains_check)?',
          assumedValue: 'none',
          reason: 'Avoids adding behavior not requested by the user.'
        }
      ];
      const opDistributionSteps = selectedOps.flatMap((op) => {
        const steps = [
          {
            assumptionKey: `op_count_${op}`,
            question: `How should ${op}.op_count be configured (constant or distribution with params)?`,
            assumedValue: defaultOpCountForOperation(op),
            reason: 'Specs commonly vary op_count by operation and phase.'
          }
        ];

        if (requiresSelection(op)) {
          steps.push({
            assumptionKey: `selection_${op}`,
            question: `What selection distribution should ${op} use?`,
            assumedValue: defaultSelectionForOperation(op),
            reason: 'Selection behavior is operation-specific and strongly affects access locality.',
            extra: `Valid distribution types and default params:
- uniform(min=0, max=1)
- normal(mean=0.5, std_dev=0.15)
- beta(alpha=0.1, beta=5)
- zipf(n=1000000, s=1.5)
- exponential(lambda=1.0)
- log_normal(mean=0.5, std_dev=0.2)
- poisson(lambda=10)
- weibull(scale=1.0, shape=2.0)
- pareto(scale=1.0, shape=2.0)
`
          });
        }

        if (requiresSelectivity(op)) {
          steps.push({
            assumptionKey: `selectivity_${op}`,
            question: `What selectivity should ${op} use (constant or distribution)?`,
            assumedValue: defaultSelectivityForOperation(op),
            reason: 'Range operation behavior depends heavily on selectivity.'
          });
        }

        return steps;
      });
      requiredClarifications.splice(5, 0, ...opDistributionSteps);

      for (const step of requiredClarifications) {
        const resolvedValue = resolvedClarifications[step.assumptionKey];
        if (typeof resolvedValue !== 'string' || !resolvedValue.trim()) {
          const questionNumber = askedClarifications + 1;
          let responseText = `Clarification ${questionNumber}
Question: ${step.question}

Assumption (if you skip): ${step.assumptionKey} = ${step.assumedValue}
Why: ${step.reason}`;
          if (step.extra) {
            responseText += `\n\n${step.extra}`;
          }
          responseText += '\n\nReply with your value to override, or say "use assumption".';
          return Response.json({ mode: 'question', response: responseText });
        }
      }

      const clarifyStepSchema = {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['ask', 'generate'] },
          question: { type: 'string' },
          assumption_key: { type: 'string' },
          assumed_value: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['action']
      };

      const clarifyResult = await ai.run(
        modelName,
        {
          max_tokens: 260,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `You are collecting requirements before generating schema-constrained JSON.

Return JSON only:
{"action":"ask","question":"...","assumption_key":"...","assumed_value":"...","reason":"..."}
or
{"action":"generate"}

Rules:
1. Ask exactly one concise question at a time.
2. For "ask", always include one concrete assumption the user can override.
3. Do NOT ask about workload family/template/category.
4. Question priority order:
   a) key/value format and lengths (string expression style, len, character_set, segmented/hot_range if needed)
   b) operation mix and counts/distributions (inserts, updates, point/range queries/deletes, merges; op_count and selection distribution)
   c) range-specific settings only when range ops are present or implied (selectivity, range_format)
5. Use conversation context: if user answered previous question, move to the next missing detail in that priority order.
6. If details are sufficient, return {"action":"generate"}.
7. Never ask more than ${maxClarifications} total clarification questions. Already asked: ${askedClarifications}.`
            },
            ...conversation
          ],
          response_format: {
            type: 'json_schema',
            json_schema: clarifyStepSchema
          }
        }
      );

      try {
        const clarifyStep = JSON.parse(extractResponseText(clarifyResult));
        if (clarifyStep.action === 'ask' && askedClarifications < maxClarifications) {
          const questionNumber = askedClarifications + 1;
          const responseText = `Clarification ${questionNumber}
Question: ${clarifyStep.question || 'Could you clarify this detail?'}

Assumption (if you skip): ${clarifyStep.assumption_key || 'value'} = ${clarifyStep.assumed_value || 'default'}
Why: ${clarifyStep.reason || 'Needed to produce valid JSON.'}

Reply with your value to override, or say "use assumption".`;
          return Response.json({ mode: 'question', response: responseText });
        }
      } catch {
        return Response.json({
          mode: 'question',
          response: `Clarification ${askedClarifications + 1}
Question: What key detail should I use next?

Assumption (if you skip): missing detail = reasonable default
Why: Needed to produce valid schema-conforming JSON.

Reply with your value to override, or say "use assumption".`
        });
      }
    }

    const generationSystemPrompt = parsedSchema
      ? `You are a JSON generator. Respond with valid JSON that conforms to the provided response schema.

Rules:
1. ALWAYS respond with valid JSON only - no explanations, no markdown, no text outside the JSON
2. The JSON must conform to the provided response schema
3. You MUST use the resolved clarifications exactly as provided in the "Resolved clarifications" message.
4. Treat user replies after clarifying questions as overrides to assumptions.
5. If the user says "use assumption" (or "use assumptions"), apply the assumption from the prior assistant clarification message.
6. If the user asks for something that cannot be represented by the schema, return empty JSON object {} or the closest valid representation
7. Never wrap the JSON in code blocks or markdown`
      : `You are a JSON generator. Given user requests, respond with valid JSON.

Rules:
1. ALWAYS respond with valid JSON only - no explanations, no markdown, no text outside the JSON
2. If asked to create a JSON document, create a reasonable one
3. Never wrap the JSON in code blocks or markdown`;

    const baseGenerationMessages = [
      { role: 'system', content: generationSystemPrompt },
      ...(parsedSchema
        ? [{
            role: 'system',
            content: `Resolved clarifications (apply these values when building JSON): ${JSON.stringify(resolvedClarifications)}`
          }]
        : []),
      ...conversation
    ];

    let attemptMessages = baseGenerationMessages;
    let didSchemaRepair = false;
    let lastError = 'Model returned invalid JSON (often due to truncation). Please try a shorter request and retry.';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await ai.run(
        modelName,
        {
          ...aiInputBase,
          messages: attemptMessages
        }
      );

      const responseText = extractResponseText(result);

      try {
        const parsedJson = JSON.parse(responseText);

        if (parsedSchema && !didSchemaRepair && attempt < maxAttempts) {
          // One repair pass to improve conformance on complex schemas.
          didSchemaRepair = true;
          attemptMessages = [
            ...baseGenerationMessages,
            {
              role: 'user',
              content: 'Regenerate the JSON and self-check it strictly against the provided response schema before returning. Return JSON only.'
            }
          ];
          continue;
        }

        return Response.json({ mode: 'json', response: JSON.stringify(parsedJson, null, 2) });
      } catch {
        lastError = 'Model returned invalid JSON. Regenerating once more.';
        if (attempt < maxAttempts) {
          attemptMessages = [
            ...baseGenerationMessages,
            {
              role: 'user',
              content: 'Your previous response was not valid JSON. Return valid JSON only, with no markdown or extra text.'
            }
          ];
          continue;
        }
      }
    }

    return Response.json(
      { error: lastError },
      { status: 502 }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractClarificationAnswers(conversation) {
  const resolved = {};
  for (let i = 0; i < conversation.length; i += 1) {
    const msg = conversation[i];
    if (!msg || msg.role !== 'assistant' || typeof msg.content !== 'string') {
      continue;
    }

    const keyMatch = msg.content.match(/Assumption \(if you skip\):\s*([a-zA-Z0-9_]+)\s*=\s*(.+)/);
    if (!keyMatch) {
      continue;
    }

    const key = keyMatch[1].trim();
    const assumedValue = keyMatch[2].split('\n')[0].trim();
    let chosenValue = assumedValue;

    const nextUser = conversation[i + 1];
    if (nextUser && nextUser.role === 'user' && typeof nextUser.content === 'string') {
      const answer = nextUser.content.trim();
      const useAssumption = /^use assumptions?$/i.test(answer);
      if (answer && !useAssumption) {
        chosenValue = answer;
      }
    }

    resolved[key] = chosenValue;
  }
  return resolved;
}

function parseOperationsAnswer(value) {
  const knownOps = [
    'inserts',
    'updates',
    'point_queries',
    'range_queries',
    'point_deletes',
    'range_deletes',
    'empty_point_queries',
    'empty_point_deletes',
    'merges'
  ];
  if (!value || typeof value !== 'string') {
    return ['inserts', 'point_queries'];
  }
  const normalized = value.toLowerCase();
  const picked = knownOps.filter((op) => normalized.includes(op));
  if (picked.length) {
    return picked;
  }
  if (/\bdeletes?\b/.test(normalized)) {
    return ['inserts', 'point_queries', 'point_deletes'];
  }
  return ['inserts', 'point_queries'];
}

function defaultOpCountForOperation(op) {
  if (op === 'inserts') {
    return 'constant(1000000)';
  }
  if (op === 'range_queries') {
    return 'constant(500000)';
  }
  if (op === 'range_deletes') {
    return 'constant(100000)';
  }
  return 'constant(500000)';
}

function defaultSelectionForOperation(op) {
  if (op === 'point_queries' || op === 'updates' || op === 'merges') {
    return 'beta(alpha=0.1, beta=5)';
  }
  return 'uniform(min=0, max=1)';
}

function defaultSelectivityForOperation(op) {
  if (op === 'range_queries') {
    return 'uniform(min=0.001, max=0.1)';
  }
  if (op === 'range_deletes') {
    return 'uniform(min=0.005, max=0.1)';
  }
  return 'uniform(min=0, max=1)';
}

function requiresSelection(op) {
  return [
    'point_queries',
    'point_deletes',
    'updates',
    'merges',
    'range_queries',
    'range_deletes'
  ].includes(op);
}

function requiresSelectivity(op) {
  return op === 'range_queries' || op === 'range_deletes';
}

function extractResponseText(result) {
  const rawResponse =
    result?.response ??
    result?.result?.response ??
    result?.choices?.[0]?.message?.content ??
    result?.choices?.[0]?.text ??
    result?.output_text ??
    result?.text;

  let responseText;
  if (typeof rawResponse === 'string') {
    responseText = rawResponse.trim();
  } else if (rawResponse && typeof rawResponse === 'object') {
    responseText = JSON.stringify(rawResponse);
  } else {
    throw new Error(`Workers AI returned an unexpected response shape: ${JSON.stringify(result)}`);
  }

  if (responseText.startsWith('```json')) {
    responseText = responseText.slice(7);
  } else if (responseText.startsWith('```')) {
    responseText = responseText.slice(3);
  }
  if (responseText.endsWith('```')) {
    responseText = responseText.slice(0, -3);
  }
  return responseText.trim();
}
