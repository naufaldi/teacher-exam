import { Context, Layer } from "effect"
import { type AiService, createDefaultAiService } from "../../services/AiService"

export class AiClient extends Context.Tag("AiClient")<AiClient, AiService>() {}

export const AiLayer = Layer.sync(AiClient, () => createDefaultAiService())

export const TestAiLayer = (service: AiService) => Layer.succeed(AiClient, service)
