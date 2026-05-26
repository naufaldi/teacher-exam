import { Config, Context, Effect, Layer } from 'effect'

export type AiProviderName = 'anthropic' | 'minimax' | 'openai'

export interface AppConfigValue {
  readonly databaseUrl: string
  readonly sessionSecret: string
  readonly googleClientId: string
  readonly googleClientSecret: string
  readonly appUrl: string
  readonly aiProvider: AiProviderName
  readonly anthropicApiKey: string | undefined
  readonly openAiApiKey: string | undefined
  readonly openAiBaseUrl: string | undefined
  readonly minimaxApiKey: string | undefined
  readonly minimaxAnthropicBaseUrl: string | undefined
  readonly aiModel: string | undefined
  readonly aiDiscussionModel: string | undefined
  readonly otelExporterOtlpEndpoint: string | undefined
}

export class AppConfig extends Context.Tag('AppConfig')<AppConfig, AppConfigValue>() {}

const optionalString = (name: string) =>
  Config.string(name).pipe(Config.option, Config.map((opt) => (opt._tag === 'Some' ? opt.value : undefined)))

const aiProviderConfig = Config.string('AI_PROVIDER').pipe(
  Config.withDefault('anthropic'),
  Config.map((value) => value.toLowerCase() as AiProviderName),
)

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const databaseUrl = yield* Config.string('DATABASE_URL')
    const sessionSecret = yield* Config.string('SESSION_SECRET')
    const googleClientId = yield* Config.string('GOOGLE_CLIENT_ID')
    const googleClientSecret = yield* Config.string('GOOGLE_CLIENT_SECRET')
    const appUrl = yield* Config.string('APP_URL')
    const aiProvider = yield* aiProviderConfig

    return {
      databaseUrl,
      sessionSecret,
      googleClientId,
      googleClientSecret,
      appUrl,
      aiProvider,
      anthropicApiKey: yield* optionalString('ANTHROPIC_API_KEY'),
      openAiApiKey: yield* optionalString('OPENAI_API_KEY'),
      openAiBaseUrl: yield* optionalString('OPENAI_BASE_URL'),
      minimaxApiKey: yield* optionalString('MINIMAX_API_KEY'),
      minimaxAnthropicBaseUrl: yield* optionalString('MINIMAX_ANTHROPIC_BASE_URL'),
      aiModel: yield* optionalString('AI_MODEL'),
      aiDiscussionModel: yield* optionalString('AI_DISCUSSION_MODEL'),
      otelExporterOtlpEndpoint: yield* optionalString('OTEL_EXPORTER_OTLP_ENDPOINT'),
    } satisfies AppConfigValue
  }),
)

/** Synchronous snapshot for bootstrap paths that run before Layer composition (e.g. initAuth). */
export function readAppConfigFromEnv(): AppConfigValue {
  const requireEnv = (name: string): string => {
    const value = process.env[name]
    if (!value) throw new Error(`Missing required env var: ${name}`)
    return value
  }
  const optionalEnv = (name: string): string | undefined => process.env[name]

  return {
    databaseUrl: requireEnv('DATABASE_URL'),
    sessionSecret: requireEnv('SESSION_SECRET'),
    googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    appUrl: requireEnv('APP_URL'),
    aiProvider: (process.env['AI_PROVIDER'] ?? 'anthropic').toLowerCase() as AiProviderName,
    anthropicApiKey: optionalEnv('ANTHROPIC_API_KEY'),
    openAiApiKey: optionalEnv('OPENAI_API_KEY'),
    openAiBaseUrl: optionalEnv('OPENAI_BASE_URL'),
    minimaxApiKey: optionalEnv('MINIMAX_API_KEY'),
    minimaxAnthropicBaseUrl: optionalEnv('MINIMAX_ANTHROPIC_BASE_URL'),
    aiModel: optionalEnv('AI_MODEL'),
    aiDiscussionModel: optionalEnv('AI_DISCUSSION_MODEL'),
    otelExporterOtlpEndpoint: optionalEnv('OTEL_EXPORTER_OTLP_ENDPOINT'),
  }
}
