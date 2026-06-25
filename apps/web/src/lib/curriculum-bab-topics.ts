import type { CurriculumBabTopicsResponse, ExamSubject, Grade } from "@teacher-exam/shared"
import { api, unwrapApiEither } from "./api.js"

export function babTopicLabelsFromResponse(topics: CurriculumBabTopicsResponse): Array<string> {
  return topics.map((topic) => topic.label)
}

export async function fetchBabTopicLabels(subject: ExamSubject, grade: Grade): Promise<Array<string>> {
  const result = await api.curriculum.babTopics(subject, grade)
  const topics = unwrapApiEither(result)
  return babTopicLabelsFromResponse(topics)
}
