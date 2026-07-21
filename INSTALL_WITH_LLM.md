# Install Qwen Harness Tools with an AI Agent

This file is an execution guide for AI coding agents. Follow it when a user asks you to install this plugin into an existing OpenCode configuration.

## Agent Directive

Perform the installation. Do not only explain the installation to the user.

Follow every numbered section in order. Do not skip inspection, safety checks, or validation. Use tools to read and edit files on the user's machine. Ask one short question when required information is missing. Stop when a safety condition cannot be satisfied.

Required order:

1. Inspect the environment.
2. Locate or clone the plugin.
3. Check the API key environment variable without revealing it.
4. Merge the provider configuration.
5. Merge the plugin registration.
6. Run non-billable validation.
7. Ask before any billable live test.
8. Report exactly what changed.

## Objective

Install `qwen-harness.ts`, configure an Alibaba Token Plan provider and Qwen Responses API model, preserve all unrelated user configuration, and verify that OpenCode can load the result.

## Default Values

Use these values unless the user provides alternatives:

| Setting | Value |
|---------|-------|
| Repository | `https://github.com/sorajate/opencode-qwen-harness-plugin.git` |
| Provider ID | `alibaba-token-plan` |
| Model ID | `qwen3.8-max-preview` |
| API key environment variable | `ALIBABA_TOKEN_PLAN_API_KEY` |
| Disabled Harness tools | `code_interpreter` |
| Block equivalent MCP tools | no |
| Suppress unsupported Harness events | yes |

The example endpoint is:

```text
https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

Confirm the endpoint with the user when their Alibaba Token Plan account uses another region.

## Safety Rules

1. Never replace the complete OpenCode config with an example from this file.
2. Preserve all unrelated providers, models, plugins, MCP servers, permissions, instructions, agents, and user settings.
3. Never print, log, commit, or insert a literal API key into a tracked file.
4. Use `{env:ALIBABA_TOKEN_PLAN_API_KEY}` in the OpenCode config.
5. If the environment variable is missing, ask the user to set it. Do not ask them to paste the key into chat.
6. Do not modify an existing Alibaba endpoint or provider ID without explaining the conflict and obtaining approval.
7. Do not enable `code_interpreter` or `blockMCP` unless the user requests it.
8. Do not clone the plugin into a temporary directory that may be deleted.
9. Do not run a billable model or Harness tool test without the user's approval.
10. Never delete or roll back changes that were not made as part of this installation.

## Stop and Ask the User

Stop before editing and ask one clear question if any of these conditions occur:

- More than one possible OpenCode config file is active.
- The existing provider uses a different endpoint and the correct endpoint is unknown.
- The target plugin path belongs to another project.
- The existing plugin entry has custom options that conflict with this guide.
- The config cannot be parsed safely.
- A required edit would remove or replace unrelated settings.

Do not guess through these conflicts.

## Installation Procedure

### 1. Inspect the Environment

Determine:

- The operating system
- Whether `opencode` is installed
- The active OpenCode config path
- Whether the repository is already cloned
- Whether `alibaba-token-plan` already exists
- Whether the plugin is already registered

Common config paths:

```text
Linux/macOS: ~/.config/opencode/opencode.json
Windows:     %USERPROFILE%\.config\opencode\opencode.json
```

If the user has an explicit custom config path, use that path instead.

Run a non-billable version check:

```bash
opencode --version
```

If OpenCode is unavailable, stop and report the missing prerequisite.

### 2. Place the Plugin in a Stable Location

If this guide is being read from an existing clone, use that repository and resolve `qwen-harness.ts` to an absolute path.

Otherwise clone it to a stable user configuration directory.

Linux/macOS:

```bash
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git ~/.config/opencode/plugins/qwen-harness
```

Windows PowerShell:

```powershell
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git "$HOME\.config\opencode\plugins\qwen-harness"
```

If the destination already exists, inspect it first. Update it only when it is this repository and the working tree can be updated safely. Never overwrite an unrelated directory.

### 3. Prepare the API Key Environment Variable

Check whether `ALIBABA_TOKEN_PLAN_API_KEY` exists without printing its value.

If it is missing, ask the user to set it in the environment used to launch OpenCode. Explain that shell-only variables disappear when that shell closes unless the user persists them through their operating system or shell profile.

Do not continue to a billable test until OpenCode can access the variable.

### 4. Merge the Provider Configuration

The following is a config fragment, not a complete replacement config:

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

Merge rules:

1. If `provider` does not exist, create it without changing other top-level keys.
2. If `alibaba-token-plan` does not exist, add the provider fragment.
3. If it exists, preserve its unrelated options and models.
4. Confirm before changing an existing `baseURL` or literal API key configuration.
5. Add or merge `qwen3.8-max-preview` under `models`.
6. Ensure this model has the model-level `provider.npm` value `@ai-sdk/openai` so it uses `/responses`.
7. Preserve existing model capability, limit, modality, and variant settings.

OpenCode config files may contain JSONC features. Use an editing method that preserves the file's existing format and comments.

### 5. Register the Plugin

Resolve the absolute path to `qwen-harness.ts`. Use forward slashes in a Windows JSON string, or escape every backslash.

Merge this tuple into the existing top-level `plugin` array:

```json
["/absolute/path/to/qwen-harness.ts", {
  "providerID": "alibaba-token-plan",
  "disabledTools": ["code_interpreter"],
  "blockMCP": false,
  "suppressHarnessEvents": true,
  "debug": false
}]
```

Merge rules:

1. Create the `plugin` array only if it does not exist.
2. Preserve every existing plugin entry.
3. If this plugin is already registered, update that entry instead of adding a duplicate.
4. Keep `code_interpreter` disabled unless requested.
5. Keep `blockMCP` disabled unless requested.
6. Keep `suppressHarnessEvents` enabled unless the user explicitly wants raw lifecycle events.

### 6. Perform Non-Billable Validation

Verify all of the following:

- The plugin file exists at the configured absolute path.
- The config remains syntactically valid in its original JSON or JSONC format.
- No unrelated config entries were removed.
- No literal API key was added.
- The provider ID, model ID, endpoint, and plugin options match.
- The plugin is registered only once.

Ask OpenCode to load and list the provider models:

```bash
opencode models alibaba-token-plan
```

If loading fails, enable plugin `debug`, restart OpenCode, inspect the error, and fix only the installation-related issue.

### 7. Offer an Optional Live Test

Explain that this test calls Alibaba and may consume Token Plan Credits. Run it only after the user approves:

```bash
opencode run --format json -m "alibaba-token-plan/qwen3.8-max-preview" "Use your built-in web_search tool to find the official OpenCode GitHub repository. Reply with only its owner/repository name."
```

Success criteria:

- OpenCode starts the selected Qwen model.
- A final text response is returned.
- No client-side tool named `invalid` appears.
- No unhandled stream or plugin error appears.

The absence of a visible Harness call is expected when `suppressHarnessEvents` is enabled.

### 8. Report the Result

Tell the user:

- The plugin path used
- The config path modified
- The provider and model added or updated
- Whether the API key environment variable was detected, without revealing its value
- Which validation commands ran
- Whether a billable live test ran
- Any remaining manual action, such as restarting OpenCode or persisting the environment variable

Use this final checklist before reporting success:

- [ ] `qwen-harness.ts` is in a stable directory.
- [ ] The plugin path in the config is absolute and exists.
- [ ] `alibaba-token-plan` exists exactly once.
- [ ] `qwen3.8-max-preview` uses model-level `@ai-sdk/openai`.
- [ ] The API key is referenced through `{env:ALIBABA_TOKEN_PLAN_API_KEY}`.
- [ ] No API key value was printed or written to a tracked file.
- [ ] Existing providers, plugins, MCP servers, and settings remain present.
- [ ] The plugin is registered exactly once.
- [ ] `opencode models alibaba-token-plan` succeeds.
- [ ] The user was asked before any billable test.

If any required item is incomplete, report the installation as incomplete and state the exact blocker. Do not claim success.

## Rollback

If the user asks to uninstall:

1. Remove only this plugin's tuple from the `plugin` array.
2. Remove `alibaba-token-plan` only if it was added solely for this plugin and the user approves.
3. Do not remove models or provider settings that predated the installation.
4. Delete the cloned plugin directory only after confirming it contains no unrelated work.
5. Do not expose or print the API key while removing the environment variable.

After rollback, validate that OpenCode still loads the remaining configuration.
