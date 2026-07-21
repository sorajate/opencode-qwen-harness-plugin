# Qwen Harness Tools for OpenCode

[English](README.md) | [ไทย](README.th.md)

An unofficial OpenCode plugin that enables Alibaba Token Plan's server-side Qwen Harness tools when using the OpenAI Responses API.

It lets supported Qwen models search the web, extract web pages, and search for images on the provider server. It also prevents unsupported provider lifecycle events from appearing as `invalid` tools in OpenCode.

## Why This Plugin?

Alibaba exposes useful provider-executed tools through the Responses API, but OpenCode does not automatically add every Qwen Harness tool to a request. Some Qwen-specific lifecycle events may also be interpreted as unknown client-side tool calls.

This plugin bridges that gap:

1. It detects the configured Alibaba Responses API endpoint.
2. It adds supported Harness tools to matching requests.
3. It tells Qwen to prefer Harness tools over equivalent MCP tools.
4. It filters Harness lifecycle events that OpenCode would otherwise display as `invalid`.
5. It keeps the model's final text response intact.

Requests to other providers, models, endpoints, and API routes are not modified.

## Features

- Automatic endpoint detection from `provider.options.baseURL`
- Per-model Harness tool configuration
- Server-side `web_search` and `web_extractor`
- Image-to-image and text-to-image search on supported models
- `code_interpreter` opt-in
- Streaming SSE and non-streaming JSON response filtering
- Optional blocking of equivalent MCP search tools
- No build step or runtime package installation

## Supported Models

| Model | `web_search` | `web_extractor` | `i2i_search` | `t2i_search` | `code_interpreter` |
|-------|:------------:|:---------------:|:------------:|:------------:|:------------------:|
| `qwen3.8-max-preview` | yes | yes | yes | yes | disabled by default |
| `qwen3.7-max` | yes | yes | no | no | disabled by default |
| `qwen3.7-plus` | yes | yes | yes | yes | disabled by default |

Model and tool availability may change on the Alibaba service. Use `modelTools` to add or override a model without editing the plugin source.

## Requirements

- OpenCode with local TypeScript plugin support
- An Alibaba Token Plan account and API key
- A model configured to use `@ai-sdk/openai` so requests use the Responses API
- A valid Alibaba Token Plan `baseURL` for your region

Tested with OpenCode `1.18.3` and Bun `1.3.9`.

## Installation

### Install with an AI Agent

This is the easiest installation method. Use an AI coding agent that can read files, edit files, and run terminal commands on the machine where OpenCode is installed.

1. Open your AI coding agent in any stable working directory.
2. Paste the prompt below without adding your API key.
3. The agent will inspect the existing OpenCode config, clone or locate the plugin, merge only the required settings, and run non-billable validation.
4. Set the API key environment variable yourself when the agent asks.
5. Approve the optional live test only if you accept Alibaba Token Plan Credit usage.

Ready-to-use prompt:

```text
Install the Qwen Harness Tools plugin for OpenCode on this machine. Perform the installation instead of only explaining it. First read https://raw.githubusercontent.com/sorajate/opencode-qwen-harness-plugin/main/INSTALL_WITH_LLM.md and follow every section in order. Use your file and terminal tools to inspect my existing setup. Preserve every unrelated config entry. Never print or write a literal API key. Use the environment variable described in the guide. Run all non-billable validation steps. Stop and ask me if you find a conflict or need to run a billable live model test. At the end, report the files changed, commands run, validation results, and any remaining manual action.
```

The linked [LLM installation guide](INSTALL_WITH_LLM.md) is intentionally detailed and uses a fixed execution order, short rules, stop conditions, config merge instructions, a completion checklist, and rollback steps. Smaller models should follow the guide literally and must not skip steps or guess through conflicts.

Do not paste an Alibaba API key into the prompt. The agent should only check whether `ALIBABA_TOKEN_PLAN_API_KEY` exists and ask you to set it without revealing its value.

### Manual Installation

#### 1. Clone the Repository

Clone this repository to a stable location. OpenCode loads the TypeScript file directly, so no `npm install` or build command is required.

```bash
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git ~/.config/opencode/plugins/qwen-harness
```

On Windows, you can clone it to a location such as:

```powershell
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git "$HOME\.config\opencode\plugins\qwen-harness"
```

#### 2. Configure the Provider

Set your API key through an environment variable instead of committing it to the configuration file:

```bash
export ALIBABA_TOKEN_PLAN_API_KEY="your-api-key"
```

PowerShell:

```powershell
$env:ALIBABA_TOKEN_PLAN_API_KEY = "your-api-key"
```

Add the provider to `~/.config/opencode/opencode.json`. Replace the example endpoint when your region uses a different one.

```json
{
  "provider": {
    "alibaba-token-plan": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Alibaba Token Plan",
      "options": {
        "baseURL": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        "apiKey": "{env:ALIBABA_TOKEN_PLAN_API_KEY}"
      },
      "models": {
        "qwen3.8-max-preview": {
          "name": "Qwen 3.8 Max Preview",
          "provider": {
            "npm": "@ai-sdk/openai"
          }
        }
      }
    }
  }
}
```

The model-level `@ai-sdk/openai` override is important. It makes this model use `/responses` while allowing other models under the same provider to continue using the OpenAI-compatible provider.

#### 3. Register the Plugin

Add the plugin tuple to the `plugin` array in `opencode.json`. Use the absolute path to your cloned `qwen-harness.ts` file.

Unix example:

```json
{
  "plugin": [
    ["/home/you/.config/opencode/plugins/qwen-harness/qwen-harness.ts", {
      "providerID": "alibaba-token-plan",
      "disabledTools": ["code_interpreter"],
      "blockMCP": false,
      "suppressHarnessEvents": true,
      "debug": false
    }]
  ]
}
```

Windows paths should use forward slashes or escaped backslashes:

```json
{
  "plugin": [
    ["C:/Users/you/.config/opencode/plugins/qwen-harness/qwen-harness.ts", {
      "providerID": "alibaba-token-plan",
      "disabledTools": ["code_interpreter"]
    }]
  ]
}
```

Restart OpenCode after changing the plugin or provider configuration.

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `providerID` | `alibaba-token-plan` | Provider that receives Harness instructions and optional MCP blocking. |
| `endpoint` | auto-detected | Explicit base URL or Responses endpoint. Normally omit this option. |
| `disabledTools` | `["code_interpreter"]` | Harness tools that are not added to requests. |
| `modelTools` | built-in model map | Adds a model or replaces the tool list for an existing model. |
| `blockMCP` | `false` | Blocks configured MCP tool prefixes in sessions using this provider. |
| `blockedMCPPrefixes` | common search MCP prefixes | Prefixes blocked when `blockMCP` is enabled. |
| `suppressHarnessEvents` | `true` | Filters lifecycle events that OpenCode may display as `invalid`. |
| `debug` | `false` | Writes endpoint registration diagnostics to stderr. |

### Enable Code Interpreter

`code_interpreter` is disabled by default because OpenCode's local tools are normally better for repository, file, git, shell, and system operations.

To enable every tool in the model map:

```json
"disabledTools": []
```

### Add or Override Models

```json
"modelTools": {
  "qwen3.8-max-preview": ["web_search", "web_extractor"],
  "qwen3.7-max": ["web_search"]
}
```

The custom entries are merged with the built-in model map. An entry with the same model ID replaces that model's built-in tool list.

### Block Equivalent MCP Tools

Set `blockMCP` to `true` if you want to prevent the model from using common MCP search tools while Qwen Harness tools are active:

```json
{
  "blockMCP": true,
  "blockedMCPPrefixes": ["brave-search_", "exa_"]
}
```

This applies only to sessions whose selected user model uses `providerID`. Local repository and shell tools remain available.

## How Response Filtering Works

Harness tools execute on Alibaba's server before Qwen returns its final answer. OpenCode may treat an unfamiliar provider-executed output type as a missing client tool and repair it to a tool named `invalid`.

With `suppressHarnessEvents: true`, the plugin removes only the matching Harness lifecycle items from SSE or JSON responses. Normal text, reasoning, completion metadata, and unrelated tool events continue through the response stream.

The provider still executes the Harness tool, and Qwen still receives its result. The filtering affects what OpenCode parses and displays after the server-side execution.

## Troubleshooting

### Harness Tools Are Not Used

- Confirm the selected model exists in the built-in map or `modelTools`.
- Confirm the model uses `@ai-sdk/openai`, not only `@ai-sdk/openai-compatible`.
- Confirm `baseURL` points to the correct Token Plan endpoint.
- Confirm the required tool is not listed in `disabledTools`.
- Enable `debug` and restart OpenCode to verify endpoint registration.

### OpenCode Still Displays `invalid`

- Confirm `suppressHarnessEvents` is not set to `false`.
- Restart OpenCode after updating the plugin.
- Check whether the provider introduced a new tool output type and add its tool name through `modelTools` if appropriate.

### An MCP Search Tool Is Blocked

- Set `blockMCP` to `false`, or remove its prefix from `blockedMCPPrefixes`.

### A Page Requires JavaScript

`web_extractor` may fail on heavily client-rendered pages. Let the model fall back to a browser or another extraction tool for those pages.

## Privacy and Cost

- Search queries, URLs, prompts, and model inputs handled by Harness tools are sent to Alibaba's service.
- Harness tool calls consume Alibaba Token Plan Credits.
- Review Alibaba's current terms, privacy policy, regional endpoint requirements, and pricing before use.

## Limitations

- Filtering hides Harness call details that exist only in provider lifecycle events.
- Citations encoded only inside filtered lifecycle items may not appear in the OpenCode UI.
- Automatic endpoint discovery requires `provider.options.baseURL`; use `endpoint` when it is unavailable.
- Provider APIs and model tool support can change independently of this plugin.

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

This is an unofficial community plugin. It is not affiliated with or endorsed by Alibaba or the OpenCode project.
