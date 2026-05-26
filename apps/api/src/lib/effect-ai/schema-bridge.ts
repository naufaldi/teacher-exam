import type { Schema } from 'effect'

export const GENERATED_QUESTIONS_OBJECT_NAME = 'exam_questions'
export const CURRICULUM_VALIDATION_OBJECT_NAME = 'curriculum_validation'

export function objectNameForSchema<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  defaultName: string,
): string {
  const ast = schema.ast
  if (ast._tag === 'TypeLiteral') {
    const id = ast.annotations?.['identifier']
    if (typeof id === 'string' && id.length > 0) {
      return id
    }
  }
  return defaultName
}
