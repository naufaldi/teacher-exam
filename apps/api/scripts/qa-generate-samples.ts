import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Either, Schema } from 'effect'
import { FigureSpecSchema, type GeneratedQuestion } from '@teacher-exam/shared'
import { validateGeneratedQuestionLatex } from '../src/lib/latex-validator'

type Args = {
  fixture: boolean
  subject: string
  count: number
  outDir: string
}

type SampleResult = {
  number: number
  topic: string | null | undefined
  latexStatus: 'valid' | 'invalid'
  figureStatus: 'valid' | 'invalid' | 'none'
  reason: string | null
}

type GeneratedMcqSingleQuestion = Extract<GeneratedQuestion, { _tag: 'mcq_single' }>

const args = parseArgs(process.argv.slice(2))

if (!args.fixture) {
  throw new Error('qa:samples currently supports --fixture mode only')
}

const samples = makeFixtureSamples(args.subject, args.count)
const results = samples.map(validateSample)
const failures = results.filter((result) => result.latexStatus === 'invalid' || result.figureStatus === 'invalid')

await mkdir(args.outDir, { recursive: true })

const slug = `${args.subject}-fixture-${args.count}`
const jsonPath = join(args.outDir, `${slug}.json`)
const mdPath = join(args.outDir, `${slug}.md`)

await writeFile(jsonPath, JSON.stringify({
  subject: args.subject,
  count: args.count,
  generatedAt: new Date().toISOString(),
  failures: failures.length,
  results,
}, null, 2))

await writeFile(mdPath, [
  `# QA Fixture Report: ${args.subject}`,
  '',
  `- Count: ${args.count}`,
  `- Failures: ${failures.length}`,
  `- JSON: ${jsonPath}`,
  '',
  failures.length === 0 ? 'All fixture samples passed automated LaTeX and figure validation.' : 'Failures require review before sign-off.',
  '',
].join('\n'))

console.log(`qa:samples wrote ${jsonPath}`)
console.log(`qa:samples wrote ${mdPath}`)
console.log(`qa:samples failures=${failures.length}`)

if (failures.length > 0) {
  process.exitCode = 1
}

function parseArgs(argv: string[]): Args {
  const getValue = (name: string, fallback: string): string => {
    const index = argv.indexOf(name)
    return index === -1 ? fallback : argv[index + 1] ?? fallback
  }

  return {
    fixture: argv.includes('--fixture'),
    subject: getValue('--subject', 'matematika'),
    count: Number(getValue('--count', '50')),
    outDir: getValue('--out-dir', '../../docs/qa/reports'),
  }
}

function makeFixtureSamples(subject: string, count: number): GeneratedQuestion[] {
  if (subject !== 'matematika') {
    return Array.from({ length: count }, (_, index) => makeTextSample(index + 1))
  }

  return Array.from({ length: count }, (_, index) => {
    const number = index + 1
    if (number % 2 === 0) return makeDiagramSample(number)
    return makeMathSample(number)
  })
}

function makeTextSample(number: number): GeneratedMcqSingleQuestion {
  return {
    _tag: 'mcq_single',
    number,
    text: `Soal ${number}`,
    option_a: 'A',
    option_b: 'B',
    option_c: 'C',
    option_d: 'D',
    correct_answer: 'a',
    topic: 'Fixture',
    difficulty: 'mudah',
  }
}

function makeMathSample(number: number): GeneratedMcqSingleQuestion {
  return {
    ...makeTextSample(number),
    text: `Hitung $\\frac{${number}}{50}$ dari 100.`,
    option_a: `$${number * 2}$`,
    option_b: `$${number}$`,
    option_c: `$${number + 5}$`,
    option_d: `$${number + 10}$`,
    topic: 'Pecahan, Desimal, dan Persen',
  }
}

function makeDiagramSample(number: number): GeneratedMcqSingleQuestion {
  return {
    ...makeTextSample(number),
    text: 'Perhatikan lingkaran berikut. Berapa luasnya?',
    option_a: '$154$ cm^2',
    option_b: '$44$ cm^2',
    option_c: '$22$ cm^2',
    option_d: '$49$ cm^2',
    topic: 'Bangun Datar',
    figure: { type: 'circle', radius: 7, label: 'r = 7 cm' },
  }
}

function validateSample(sample: GeneratedQuestion): SampleResult {
  const latex = validateGeneratedQuestionLatex(sample)
  const figureStatus = validateFigure(sample.figure)
  const reasons = [
    latex._tag === 'invalid' ? latex.reason : null,
    figureStatus.reason,
  ].filter((reason): reason is string => reason !== null)

  return {
    number: sample.number,
    topic: sample.topic,
    latexStatus: latex._tag === 'valid' ? 'valid' : 'invalid',
    figureStatus: figureStatus.status,
    reason: reasons.length > 0 ? reasons.join('; ') : null,
  }
}

function validateFigure(raw: unknown): { status: 'valid' | 'invalid' | 'none'; reason: string | null } {
  if (raw === undefined || raw === null) return { status: 'none', reason: null }

  const decoded = Schema.decodeUnknownEither(FigureSpecSchema)(raw)
  if (Either.isRight(decoded)) return { status: 'valid', reason: null }
  return { status: 'invalid', reason: String(decoded.left) }
}
