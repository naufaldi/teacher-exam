import { Prompt } from '@effect/ai'

export interface BuildPromptInput {
  system: string
  user: string
  pdfBytes?: Buffer
}

export function buildPrompt(input: BuildPromptInput): Prompt.Prompt {
  const userParts: Array<Prompt.UserMessagePart> = []
  if (input.pdfBytes !== undefined) {
    userParts.push(
      Prompt.makePart('file', {
        mediaType: 'application/pdf',
        fileName: 'materi.pdf',
        data: input.pdfBytes,
      }),
    )
  }
  userParts.push(Prompt.makePart('text', { text: input.user }))

  return Prompt.make([
    Prompt.makeMessage('system', { content: input.system }),
    Prompt.makeMessage('user', { content: userParts }),
  ])
}

export function getPromptSystemContent(prompt: Prompt.Prompt): string | undefined {
  for (const message of prompt.content) {
    if (message.role === 'system' && typeof message.content === 'string') {
      return message.content
    }
  }
  return undefined
}

export function getPromptUserText(prompt: Prompt.Prompt): string {
  for (const message of prompt.content) {
    if (message.role !== 'user') {
      continue
    }
    if (typeof message.content === 'string') {
      return message.content
    }
    return message.content
      .filter((part): part is Prompt.TextPart => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
  }
  return ''
}

export function getPromptUserFileParts(prompt: Prompt.Prompt): ReadonlyArray<Prompt.FilePart> {
  for (const message of prompt.content) {
    if (message.role !== 'user' || typeof message.content === 'string') {
      continue
    }
    return message.content.filter((part): part is Prompt.FilePart => part.type === 'file')
  }
  return []
}
