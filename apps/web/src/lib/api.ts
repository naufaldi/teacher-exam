import { HealthResponseSchema } from "@teacher-exam/shared"
import {
  ApiClientError,
  type ApiClientFailure,
  ApiError,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  RateLimitedError,
  UnauthorizedClientError,
  UnauthorizedError
} from "./api-errors.js"
import { aiApi, type GenerateApiResult } from "./api/ai.js"
import { analyticsApi } from "./api/analytics.js"
import { bankApi } from "./api/bank.js"
import { classesApi } from "./api/classes.js"
import {
  apiFetch,
  apiFetchEither,
  downloadExport,
  fetchDecoded,
  setUnauthorizedHandler,
  throwClientError,
  unwrapApiEither
} from "./api/core.js"
import { curriculumApi } from "./api/curriculum.js"
import { examsApi } from "./api/exams.js"
import { meApi } from "./api/me.js"
import { pdfUploadsApi } from "./api/pdf-uploads.js"
import { publicExamsApi } from "./api/public-exams.js"
import { questionsApi } from "./api/questions.js"
import { resultsApi } from "./api/results.js"
import { sessionsApi } from "./api/sessions.js"
import { templatesApi } from "./api/templates.js"

export {
  ApiClientError,
  type ApiClientFailure,
  ApiError,
  apiFetch,
  apiFetchEither,
  DecodeClientError,
  downloadExport,
  type GenerateApiResult,
  NetworkClientError,
  RateLimitedClientError,
  RateLimitedError,
  setUnauthorizedHandler,
  throwClientError,
  UnauthorizedClientError,
  UnauthorizedError,
  unwrapApiEither
}

export const api = {
  health: {
    get: () => fetchDecoded("/health", HealthResponseSchema)
  },
  exams: examsApi,
  ai: aiApi,
  pdfUploads: pdfUploadsApi,
  curriculum: curriculumApi,
  questions: questionsApi,
  me: meApi,
  publicExams: publicExamsApi,
  bank: bankApi,
  templates: templatesApi,
  classes: classesApi,
  sessions: sessionsApi,
  results: resultsApi,
  analytics: analyticsApi
}
