import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import { PublicExamWithQuestionsSchema } from '@teacher-exam/shared'
import { Schema } from 'effect'
import { ApiPublicExamNotFound } from '../errors/http'

const slugParam = HttpApiSchema.param('slug', Schema.String)

export const PublicExamsGroup = HttpApiGroup.make('publicExams').add(
  HttpApiEndpoint.get('getPublicExam')`/public/exams/${slugParam}`
    .addSuccess(PublicExamWithQuestionsSchema)
    .addError(ApiPublicExamNotFound, { status: 404 }),
)
