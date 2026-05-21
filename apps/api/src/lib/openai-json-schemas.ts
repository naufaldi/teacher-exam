/** OpenAI Chat Completions `response_format.json_schema` definitions (OpenAI provider only). */

const answerLetter = { type: 'string', enum: ['a', 'b', 'c', 'd'] } as const
const difficulty = { type: 'string', enum: ['mudah', 'sedang', 'sulit'] } as const
const cognitiveLevel = { type: 'string', enum: ['C1', 'C2', 'C3', 'C4'] } as const

const generatedBaseProperties = {
  number: { type: 'integer' },
  text: { type: 'string' },
  topic: { type: 'string' },
  difficulty,
  cognitive_level: cognitiveLevel,
} as const

const generatedMcqFields = {
  option_a: { type: 'string' },
  option_b: { type: 'string' },
  option_c: { type: 'string' },
  option_d: { type: 'string' },
} as const

export const GENERATED_MCQ_SINGLE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    _tag: { type: 'string', const: 'mcq_single' },
    ...generatedBaseProperties,
    ...generatedMcqFields,
    correct_answer: answerLetter,
  },
  required: [
    '_tag',
    'number',
    'text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
    'topic',
    'difficulty',
  ],
  additionalProperties: false,
} as const

export const GENERATED_MCQ_MULTI_JSON_SCHEMA = {
  type: 'object',
  properties: {
    _tag: { type: 'string', const: 'mcq_multi' },
    ...generatedBaseProperties,
    ...generatedMcqFields,
    correct_answers: {
      type: 'array',
      items: answerLetter,
      minItems: 2,
      maxItems: 3,
    },
  },
  required: [
    '_tag',
    'number',
    'text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answers',
    'topic',
    'difficulty',
  ],
  additionalProperties: false,
} as const

export const GENERATED_TRUE_FALSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    _tag: { type: 'string', const: 'true_false' },
    ...generatedBaseProperties,
    statements: {
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          answer: { type: 'string', enum: ['B', 'S'] },
        },
        required: ['text', 'answer'],
        additionalProperties: false,
      },
    },
  },
  required: ['_tag', 'number', 'text', 'statements', 'topic', 'difficulty'],
  additionalProperties: false,
} as const

export const GENERATED_QUESTIONS_ARRAY_JSON_SCHEMA = {
  type: 'array',
  items: {
    oneOf: [
      GENERATED_MCQ_SINGLE_JSON_SCHEMA,
      GENERATED_MCQ_MULTI_JSON_SCHEMA,
      GENERATED_TRUE_FALSE_JSON_SCHEMA,
    ],
  },
} as const

export const CURRICULUM_VALIDATION_ARRAY_JSON_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      number: { type: 'integer' },
      status: { type: 'string', enum: ['valid', 'needs_review', 'invalid'] },
      reason: { type: 'string' },
    },
    required: ['number', 'status', 'reason'],
    additionalProperties: false,
  },
} as const

export type OpenAiStructuredOutputKind = 'generated_questions' | 'curriculum_validation'

export function buildOpenAiResponseFormat(kind: OpenAiStructuredOutputKind) {
  if (kind === 'generated_questions') {
    return {
      type: 'json_schema' as const,
      json_schema: {
        name: 'generated_questions',
        strict: true,
        schema: GENERATED_QUESTIONS_ARRAY_JSON_SCHEMA,
      },
    }
  }
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'curriculum_validation',
      strict: true,
      schema: CURRICULUM_VALIDATION_ARRAY_JSON_SCHEMA,
    },
  }
}
