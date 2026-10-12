import {
  DEFAULT_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
  DEFAULT_MINIMAX_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_MODEL,
  DEFAULT_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_DISCUSSION_MODEL,
  DEFAULT_OPENAI_MODEL
} from "./effect-ai/constants"

export type ProductionAiProvider = "openai" | "anthropic" | "minimax"

export interface ProductionAiSelection {
  readonly provider: ProductionAiProvider
  readonly model: string
  readonly discussionModel: string
  readonly baseUrl?: string
}

export interface AiConfigPresence {
  readonly provider: ProductionAiProvider
  readonly model: string
  readonly keyConfigured: boolean
}

const MISSING_OPENAI_KEY = "OPENAI_API_KEY is required when AI_PROVIDER=openai. Refusing to fall back to Anthropic."

export function readAiProvider(env: NodeJS.ProcessEnv = process.env): ProductionAiProvider {
  const raw = (env["AI_PROVIDER"] ?? "").trim().toLowerCase()
  if (raw === "" || raw === "openai") return "openai"
  if (raw === "anthropic" || raw === "minimax") return raw
  throw new Error(`AI_PROVIDER must be "anthropic", "minimax", or "openai", got "${raw}"`)
}

export function describeAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfigPresence {
  const provider = readAiProvider(env)
  if (provider === "openai") {
    return {
      provider,
      model: env["AI_MODEL"]?.trim() || DEFAULT_OPENAI_MODEL,
      keyConfigured: Boolean(env["OPENAI_API_KEY"]?.trim())
    }
  }
  if (provider === "anthropic") {
    return {
      provider,
      model: env["AI_MODEL"]?.trim() || DEFAULT_MODEL,
      keyConfigured: Boolean(env["ANTHROPIC_API_KEY"]?.trim())
    }
  }
  return {
    provider,
    model: env["AI_MODEL"]?.trim() || DEFAULT_MINIMAX_MODEL,
    keyConfigured: Boolean(env["MINIMAX_API_KEY"]?.trim())
  }
}

export function assertAiProviderReady(env: NodeJS.ProcessEnv = process.env): ProductionAiSelection {
  const provider = readAiProvider(env)
  if (provider === "openai") {
    if (!env["OPENAI_API_KEY"]?.trim()) throw new Error(MISSING_OPENAI_KEY)
    const baseUrl = env["OPENAI_BASE_URL"]?.trim() || DEFAULT_OPENAI_BASE_URL
    return {
      provider,
      model: env["AI_MODEL"]?.trim() || DEFAULT_OPENAI_MODEL,
      discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_OPENAI_DISCUSSION_MODEL,
      baseUrl
    }
  }
  if (provider === "anthropic") {
    if (!env["ANTHROPIC_API_KEY"]?.trim()) {
      throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic.")
    }
    return {
      provider,
      model: env["AI_MODEL"]?.trim() || DEFAULT_MODEL,
      discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_DISCUSSION_MODEL
    }
  }
  if (!env["MINIMAX_API_KEY"]?.trim()) {
    throw new Error("MINIMAX_API_KEY is required when AI_PROVIDER=minimax.")
  }
  return {
    provider,
    model: env["AI_MODEL"]?.trim() || DEFAULT_MINIMAX_MODEL,
    discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_MINIMAX_DISCUSSION_MODEL,
    baseUrl: env["MINIMAX_ANTHROPIC_BASE_URL"]?.trim() || DEFAULT_MINIMAX_ANTHROPIC_BASE_URL
  }
}
