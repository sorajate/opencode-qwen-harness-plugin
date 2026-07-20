import type { Plugin } from "@opencode-ai/plugin"

interface HarnessPluginOptions {
  providerID?: string
  endpoint?: string
  disabledTools?: string[]
  modelTools?: Record<string, string[]>
  blockMCP?: boolean
  blockedMCPPrefixes?: string[]
  suppressHarnessEvents?: boolean
  debug?: boolean
}

interface RuntimeEndpoint {
  origin: string
  responsesPath?: string
  disabledTools: Set<string>
  modelTools: Record<string, string[]>
  suppressHarnessEvents: boolean
  debug: boolean
}

interface FetchPatchState {
  originalFetch: typeof globalThis.fetch
  endpoints: Map<string, RuntimeEndpoint>
  installed: boolean
}

const DEFAULT_MODEL_TOOLS: Record<string, string[]> = {
  "qwen3.8-max-preview": ["web_search", "code_interpreter", "web_extractor", "i2i_search", "t2i_search"],
  "qwen3.7-max": ["web_search", "code_interpreter", "web_extractor"],
  "qwen3.7-plus": ["web_search", "code_interpreter", "web_extractor", "i2i_search", "t2i_search"],
}

const DEFAULT_MCP_PREFIXES = ["brave-search_", "exa_", "tavily_", "serp_", "google-search_"]

const TOOL_INSTRUCTIONS: Record<string, { description: string; use: string; avoid: string }> = {
  web_search: {
    description: "Search the internet for current information, news, and facts.",
    use: "Use built-in web_search for any web search need.",
    avoid: "Do not call MCP-based search tools unless built-in search fails.",
  },
  web_extractor: {
    description: "Open a URL and extract its text, code, or structured content.",
    use: "Use built-in web_extractor for ordinary URL content extraction.",
    avoid: "Do not use webfetch or a browser unless extraction fails or JavaScript rendering is required.",
  },
  i2i_search: {
    description: "Find visually similar images from an input image.",
    use: "Use built-in i2i_search for reverse image search and visual tracing.",
    avoid: "Do not replace this with a text-only search.",
  },
  t2i_search: {
    description: "Find internet images matching a text description.",
    use: "Use built-in t2i_search when the task requires image search by text.",
    avoid: "Do not replace this with a general text search when image results are required.",
  },
  code_interpreter: {
    description: "Run Python in an isolated server-side sandbox.",
    use: "Use built-in code_interpreter for isolated calculations and data analysis.",
    avoid: "Use local shell tools for repository, file system, git, or system operations.",
  },
}

const FETCH_STATE = Symbol.for("opencode.qwen-harness.fetch-state")

function log(debug: boolean, ...args: unknown[]) {
  if (debug) console.error("[qwen-harness]", ...args)
}

function fetchState(): FetchPatchState {
  const scope = globalThis as typeof globalThis & { [FETCH_STATE]?: FetchPatchState }
  if (!scope[FETCH_STATE]) {
    scope[FETCH_STATE] = {
      originalFetch: globalThis.fetch.bind(globalThis),
      endpoints: new Map(),
      installed: false,
    }
  }
  return scope[FETCH_STATE]
}

function enabledTools(runtime: RuntimeEndpoint, model: string): string[] {
  return (runtime.modelTools[model] ?? []).filter((tool) => !runtime.disabledTools.has(tool))
}

function buildSystemPrompt(runtime: RuntimeEndpoint, model: string): string | undefined {
  const tools = enabledTools(runtime, model)
  if (tools.length === 0) return

  const lines = [
    "# Built-in Harness Tools (Server-Side)",
    "",
    "Prefer the enabled Qwen Harness tools below over equivalent MCP or client-side tools.",
    "Harness tools execute on the provider server and return their results within the same response.",
    "",
    "## Priority Rules",
    "",
    "1. Use an enabled Harness tool first when it directly matches the task.",
    "2. Fall back to MCP or client tools only if Harness fails or cannot perform the task.",
    "3. Continue using OpenCode tools for files, repositories, git, shell commands, and local system work.",
    "4. Do not claim a Harness tool was used unless the provider actually executed it.",
    "",
    "## Enabled Tools",
    "",
  ]

  for (const tool of tools) {
    const instruction = TOOL_INSTRUCTIONS[tool]
    if (!instruction) continue
    lines.push(`### ${tool}`)
    lines.push(`- Function: ${instruction.description}`)
    lines.push(`- Use: ${instruction.use}`)
    lines.push(`- Fallback: ${instruction.avoid}`)
    lines.push("")
  }

  lines.push("Harness invocations consume Token Plan Credits. Avoid unnecessary or duplicate calls.")
  return lines.join("\n")
}

function parseEndpoint(value: string): { origin: string; responsesPath?: string } | undefined {
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`)
    const basePath = parsed.pathname.replace(/\/+$/, "")
    const responsesPath = basePath ? (basePath.endsWith("/responses") ? basePath : `${basePath}/responses`) : undefined
    return { origin: parsed.origin, responsesPath }
  } catch {
    return
  }
}

function endpointKey(endpoint: { origin: string; responsesPath?: string }): string {
  return `${endpoint.origin}${endpoint.responsesPath ?? "/*/responses"}`
}

function findRuntime(url: URL, model: string): RuntimeEndpoint | undefined {
  for (const runtime of fetchState().endpoints.values()) {
    if (url.origin !== runtime.origin) continue
    if (runtime.responsesPath ? url.pathname.replace(/\/+$/, "") !== runtime.responsesPath : !url.pathname.endsWith("/responses")) {
      continue
    }
    if (runtime.modelTools[model]) return runtime
  }
}

async function bodyText(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (typeof body === "string") return body
  if (body instanceof URLSearchParams) return body.toString()
  if (body instanceof Blob) return body.text()
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body)
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body)
  return
}

function harnessCallTypes(runtime: RuntimeEndpoint, model: string): Set<string> {
  return new Set(enabledTools(runtime, model).map((tool) => `${tool}_call`))
}

function sanitizeHarnessPayload(payload: any, callTypes: Set<string>): { payload?: any; changed: boolean } {
  const itemType = payload?.item?.type ?? payload?.output_item?.type
  if (callTypes.has(itemType)) return { changed: true }

  const eventType = typeof payload?.type === "string" ? payload.type : ""
  if ([...callTypes].some((type) => eventType.startsWith(`response.${type}.`))) {
    return { changed: true }
  }

  const output = payload?.response?.output
  if (!Array.isArray(output)) return { payload, changed: false }

  const filtered = output.filter((item: any) => !callTypes.has(item?.type))
  if (filtered.length === output.length) return { payload, changed: false }
  return {
    payload: { ...payload, response: { ...payload.response, output: filtered } },
    changed: true,
  }
}

function transformSseFrame(frame: string, callTypes: Set<string>): string | undefined {
  const lines = frame.split(/\r?\n/)
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")

  if (!data || data === "[DONE]") return frame

  try {
    const sanitized = sanitizeHarnessPayload(JSON.parse(data), callTypes)
    if (!sanitized.payload) return
    if (!sanitized.changed) return frame

    const withoutData = lines.filter((line) => !line.startsWith("data:"))
    withoutData.push(`data: ${JSON.stringify(sanitized.payload)}`)
    return withoutData.join("\n")
  } catch {
    return frame
  }
}

function filterSseStream(stream: ReadableStream<Uint8Array>, callTypes: Set<string>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })

        while (true) {
          const match = /\r?\n\r?\n/.exec(buffer)
          if (!match || match.index === undefined) break

          const frame = buffer.slice(0, match.index)
          buffer = buffer.slice(match.index + match[0].length)
          const transformed = transformSseFrame(frame, callTypes)
          if (transformed !== undefined) controller.enqueue(encoder.encode(`${transformed}${match[0]}`))
        }
      },
      flush(controller) {
        buffer += decoder.decode()
        if (!buffer) return
        const transformed = transformSseFrame(buffer, callTypes)
        if (transformed !== undefined) controller.enqueue(encoder.encode(transformed))
      },
    }),
  )
}

async function filterHarnessEvents(response: Response, runtime: RuntimeEndpoint, model: string): Promise<Response> {
  if (!runtime.suppressHarnessEvents || !response.body) return response

  const callTypes = harnessCallTypes(runtime, model)
  if (callTypes.size === 0) return response

  const headers = new Headers(response.headers)
  headers.delete("content-length")
  const contentType = headers.get("content-type") ?? ""

  if (contentType.includes("text/event-stream")) {
    return new Response(filterSseStream(response.body, callTypes), {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  if (contentType.includes("application/json")) {
    const payload = await response.json()
    if (Array.isArray(payload?.output)) {
      payload.output = payload.output.filter((item: any) => !callTypes.has(item?.type))
    }
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return response
}

function installFetchInterceptor() {
  const state = fetchState()
  if (state.installed) return
  state.installed = true

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: URL
    let method: string
    let rawBody: string | undefined

    try {
      if (input instanceof Request) {
        url = new URL(input.url)
        method = (init?.method ?? input.method).toUpperCase()
        rawBody = await bodyText(init?.body)
        if (rawBody === undefined && input.body) rawBody = await input.clone().text()
      } else {
        url = new URL(input.toString())
        method = (init?.method ?? "GET").toUpperCase()
        rawBody = await bodyText(init?.body)
      }
    } catch {
      return state.originalFetch(input, init)
    }

    if (method !== "POST" || !rawBody) return state.originalFetch(input, init)

    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      return state.originalFetch(input, init)
    }

    if (typeof body?.model !== "string") return state.originalFetch(input, init)
    const runtime = findRuntime(url, body.model)
    if (!runtime) return state.originalFetch(input, init)

    const tools = enabledTools(runtime, body.model)
    if (!Array.isArray(body.tools)) body.tools = []
    for (const tool of tools) {
      if (!body.tools.some((item: any) => item?.type === tool)) body.tools.push({ type: tool })
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.delete("content-length")
    const nextInit: RequestInit = { ...init, method, headers, body: JSON.stringify(body) }
    const nextInput = input instanceof Request ? new Request(input, nextInit) : input
    const response = await state.originalFetch(nextInput, input instanceof Request ? undefined : nextInit)
    return filterHarnessEvents(response, runtime, body.model)
  }
}

function resolveProviderID(input: any): string | undefined {
  const model = input?.model
  if (typeof model === "string") return model.split("/")[0]
  if (model && typeof model === "object") return model.providerID ?? model.provider
  return input?.providerID
}

function resolveModelID(input: any): string | undefined {
  const model = input?.model
  if (typeof model === "string") return model.split("/").slice(1).join("/")
  if (model && typeof model === "object") return model.modelID ?? model.id
  return input?.modelID
}

export default (async (_input: unknown, options?: HarnessPluginOptions) => {
  const providerID = options?.providerID ?? "alibaba-token-plan"
  const disabledTools = new Set(options?.disabledTools ?? ["code_interpreter"])
  const modelTools = { ...DEFAULT_MODEL_TOOLS, ...options?.modelTools }
  const blockMCP = options?.blockMCP ?? false
  const blockedMCPPrefixes = options?.blockedMCPPrefixes ?? DEFAULT_MCP_PREFIXES
  const suppressHarnessEvents = options?.suppressHarnessEvents ?? true
  const debug = options?.debug ?? false
  const sessionProviders = new Map<string, string>()
  let runtime: RuntimeEndpoint | undefined

  function register(value: string) {
    const endpoint = parseEndpoint(value)
    if (!endpoint) return

    runtime = {
      ...endpoint,
      disabledTools,
      modelTools,
      suppressHarnessEvents,
      debug,
    }
    fetchState().endpoints.set(endpointKey(endpoint), runtime)
    installFetchInterceptor()
    log(debug, "registered endpoint", endpointKey(endpoint))
  }

  if (options?.endpoint) register(options.endpoint)

  return {
    config: async (config: any) => {
      if (runtime) return
      const baseURL = config?.provider?.[providerID]?.options?.baseURL
      if (typeof baseURL === "string") register(baseURL)
    },

    "chat.params": async (input: any, _output: any) => {
      const currentProvider = input?.message?.model?.providerID ?? resolveProviderID(input)
      if (currentProvider) sessionProviders.set(input.sessionID, currentProvider)
    },

    "experimental.chat.system.transform": async (input: any, output: any) => {
      if (!runtime || resolveProviderID(input) !== providerID) return

      const model = resolveModelID(input)
      if (!model) return
      const prompt = buildSystemPrompt(runtime, model)
      if (!prompt || !Array.isArray(output?.system)) return
      if (!output.system.some((text: string) => text.includes("# Built-in Harness Tools (Server-Side)"))) {
        output.system.push(prompt)
      }
    },

    ...(blockMCP
      ? {
          "tool.execute.before": async (input: any, _output: any) => {
            if (sessionProviders.get(input.sessionID) !== providerID) return
            if (!blockedMCPPrefixes.some((prefix) => input.tool.startsWith(prefix))) return
            throw new Error(`MCP tool "${input.tool}" is disabled while Qwen Harness tools are active.`)
          },
        }
      : {}),

    event: async ({ event }: any) => {
      if (event?.type === "session.deleted") {
        const sessionID = event?.properties?.info?.id
        if (typeof sessionID === "string") sessionProviders.delete(sessionID)
      }
    },
  }
}) satisfies Plugin
