# Qwen Harness Tools - OpenCode Plugin

Injects Qwen Token Plan server-side Harness tools into OpenCode Responses API requests. The plugin also adds model-specific tool-priority instructions and filters provider-executed Harness lifecycle items that OpenCode would otherwise render as `invalid` tools.

## Behavior

For configured Alibaba/Qwen models, the plugin:

1. Discovers the Responses API endpoint from `provider.options.baseURL`.
2. Adds the model's enabled Harness tools to each matching `/responses` request.
3. Tells the model to prefer Harness tools over equivalent MCP tools.
4. Removes Harness call lifecycle items from the returned SSE or JSON response while retaining the model's final answer.
5. Optionally blocks equivalent MCP search tools for Alibaba sessions.

Only requests matching the configured endpoint, model, method, and Responses API path are modified. Other providers and HTTP requests pass through unchanged.

## Supported Models

| Model | `web_search` | `code_interpreter` | `web_extractor` | `i2i_search` | `t2i_search` |
|-------|:------------:|:------------------:|:---------------:|:------------:|:------------:|
| `qwen3.8-max-preview` | yes | disabled by default | yes | yes | yes |
| `qwen3.7-max` | yes | disabled by default | yes | no | no |
| `qwen3.7-plus` | yes | disabled by default | yes | yes | yes |

`code_interpreter` is disabled by default because OpenCode's local tools are more appropriate for repository, file, git, shell, and system operations.

## Installation

Register the local plugin in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    ["D:/Work/2026/workspace/qwen_tools_opencode_plugins/qwen-harness.ts", {
      "providerID": "alibaba-token-plan",
      "disabledTools": ["code_interpreter"],
      "blockMCP": false,
      "suppressHarnessEvents": true,
      "debug": false
    }]
  ]
}
```

The provider must use the OpenAI Responses API for models that enable Harness tools. A model-level provider override can be used when the other models use an OpenAI-compatible chat-completions provider:

```json
{
  "provider": {
    "alibaba-token-plan": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
      },
      "models": {
        "qwen3.8-max-preview": {
          "provider": {
            "npm": "@ai-sdk/openai"
          }
        }
      }
    }
  }
}
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `providerID` | `alibaba-token-plan` | Provider that receives Harness instructions and optional MCP blocking. |
| `endpoint` | auto-detected | Explicit provider base URL or Responses endpoint. Normally omit this. |
| `disabledTools` | `["code_interpreter"]` | Harness tool names not injected into requests. |
| `modelTools` | built-in model map | Adds models or replaces the tool list for an existing model. |
| `blockMCP` | `false` | Blocks configured MCP prefixes during sessions using this provider. |
| `blockedMCPPrefixes` | common search MCP prefixes | Tool-name prefixes blocked when `blockMCP` is enabled. |
| `suppressHarnessEvents` | `true` | Filters Harness lifecycle items that OpenCode would display as `invalid`. |
| `debug` | `false` | Writes endpoint registration diagnostics to stderr. |

### Enable Code Interpreter

Set an empty disabled list:

```json
"disabledTools": []
```

### Add or Override a Model

```json
"modelTools": {
  "qwen4.0-max": ["web_search", "web_extractor"],
  "qwen3.8-max-preview": ["web_search"]
}
```

Entries are merged with the built-in model map. An entry with the same model ID replaces that model's built-in tool list.

## Limitations

- Harness lifecycle events are hidden from OpenCode because its repair path treats unknown provider-executed output types as an `invalid` client tool. The model still receives server-side Harness results and its final text is retained.
- Suppression hides Harness call details and citations encoded only in those lifecycle events from the OpenCode UI.
- Endpoint discovery requires `provider.options.baseURL`; use the `endpoint` option when the provider does not expose one.
- Harness calls consume Alibaba Token Plan Credits.
