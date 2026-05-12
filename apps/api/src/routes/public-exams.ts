import { Hono } from 'hono'
import { fetchPublicExamWithQuestions } from '../lib/exams-query'

const router = new Hono()

router.get('/:slug', async (c) => {
  const { slug } = c.req.param()
  const exam = await fetchPublicExamWithQuestions(slug)

  if (!exam) {
    return c.json({ error: 'Public exam not found', code: 'NOT_FOUND' }, 404)
  }

  return c.json(exam)
})

export { router as publicExamsRouter }
