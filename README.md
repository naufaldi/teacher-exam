# Ujian SD

> AI-generated, print-ready exam sheets for Indonesian elementary-school teachers — built on Claude **Opus 4.7**.

[![Live](https://img.shields.io/badge/live-ujian--sekolah.faldi.xyz-0a7c3a?logo=caddy&logoColor=white)](https://ujian-sekolah.faldi.xyz)
[![API](https://img.shields.io/badge/api-api--ujian--sekolah.faldi.xyz-555?logo=hono)](https://api-ujian-sekolah.faldi.xyz/api/health)
[![Built with Opus 4.7](https://img.shields.io/badge/built%20with-Claude%20Opus%204.7-d97706)](https://www.anthropic.com/)
[![Stack](https://img.shields.io/badge/stack-React%2019%20·%20Hono%20·%20Effect--TS-3178c6)](#stack)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Ujian SD** turns one sentence ("PPKn kelas 5, sumatif tengah semester, sila ke-3, 20 soal")
into an A4-ready exam sheet — mixed item types, answer key, and a teacher-facing
*pembahasan* (explanation) for every question. One click → PDF on the photocopier.

Indonesian SD teachers spend 4–8 hours a week hand-writing exams in Word.
Ujian SD compresses that into a 30-second generate + a 2-minute review.

---

## Why this exists

Generic LLM chatbots produce text that *sounds* like an exam but fails on the constraints
that matter to a teacher:

- the right Kurikulum Merdeka **Capaian Pembelajaran** + **Tujuan Pembelajaran** codes,
- vocabulary appropriate for a 10-year-old reader,
- pembahasan a teacher can actually read aloud in class,
- consistent item types and weights across all 20 soal in a single sheet.

This project bakes those constraints into the prompt and the schema so what comes
out is what a guru would print, not what an LLM would freestyle.

## Features

- **Curriculum-grounded generation** — pulls from parsed Kurikulum Merdeka PDFs (per CP/TP), not free-form.
- **Mixed item types** — `mcq`, `mcq_multi`, `true_false`, `short_answer`, `essay` in one sheet, validated by Effect Schema.
- **Pembahasan for every soal** — written for a 10-year-old listener, not for an answer key.
- **Vocabulary blacklist** — academic Indonesian words that shouldn't appear in 5th–6th grade material are rejected up front.
- **A4 print preview** — same JSON drives the on-screen sheet and the PDF; what you preview is what hits the photocopier.
- **History + duplicate-as-draft** — fork last term's sheet, swap the topic, re-generate.
- **Google sign-in** — better-auth, single click, no passwords.

## Stack

| Layer        | Tech                                                                                     |
|--------------|------------------------------------------------------------------------------------------|
| Frontend     | React 19, Vite 8, TanStack Router (file-based), Tailwind v4, Radix primitives            |
| Backend      | Hono v4 on Node 22, Effect-TS service layers, Drizzle ORM (Postgres), better-auth        |
| AI           | Claude **Opus 4.7** via the official Anthropic SDK, prompt caching, Effect Schema output |
| Shared types | `@teacher-exam/shared` Effect Schemas — single source of truth between API and web       |
| Tooling      | pnpm 10, Turborepo, Vitest, TypeScript 6 (strict + `exactOptionalPropertyTypes`)         |
| Infra        | Single VPS, Docker Compose, Caddy reverse-proxy with auto Let's Encrypt                  |

## Monorepo layout

```
apps/
  api/              Hono REST API + Effect-TS layers + better-auth
  web/              React 19 SPA (TanStack Router)
packages/
  shared/           Effect Schema validation contracts (the contract between api and web)
  db/               Drizzle ORM schemas + migrations
  ui/               Radix + CVA + tailwind-merge component library
docs/
  PRD-v2-final.md   Product requirements & scope
  ops/              Deployment, infra, and incident notes
```

## Local dev

Requires **Node ≥ 22** and **pnpm 10.15+**.

```bash
pnpm install
cp .env.example .env          # then fill in DATABASE_URL, GOOGLE_*, ANTHROPIC_API_KEY, ...
pnpm db:migrate
pnpm dev                      # web :3000  ·  api :3001
```

| Task              | Command            |
|-------------------|--------------------|
| Dev all           | `pnpm dev`         |
| Build all         | `pnpm build`       |
| Type-check        | `pnpm type-check`  |
| Test (Vitest)     | `pnpm test`        |
| New migration     | `pnpm db:generate` |
| Run migration     | `pnpm db:migrate`  |

See [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md)
for per-package conventions, and [`docs/ops/PRODUCTION.md`](docs/ops/PRODUCTION.md) for
the deploy reference (Caddy, Docker labels, Cloudflare DNS, env vars).

## Architecture notes

- **Effect-TS everywhere a boundary exists.** API service layers, error handling
  (`Data.TaggedError`), and validation (`Schema`) are mandatory across `apps/api`,
  `apps/web`, and `packages/shared`. No Zod, no `try/catch` inside Effect code.
- **Schema-first.** Every entity is defined as an Effect Schema in `packages/shared`,
  the type is derived (`type X = typeof XSchema.Type`), and both ends of the wire
  validate with `Schema.decodeUnknownEither`.
- **Subdomain-split deploy.** Web on `ujian-sekolah.faldi.xyz`, API on
  `api-ujian-sekolah.faldi.xyz`, single Caddy reverse-proxy reading Docker labels.
  Better-auth sits on the API host with cross-subdomain session cookies.

## Built with Claude Code

This project was pair-built end-to-end with **Claude Code + Opus 4.7**, using a
mix of specialised skills (`agent-browser`, `effect-ts-expert`, `frontend-design`,
`test-driven-development`) and the `Plan` workflow for non-trivial changes. Every
frontend task ends with an `agent-browser` loop — drive the running app, capture
console errors, fix, re-drive — so "did this actually work in the browser?" is
verified, not assumed.

Submission for the **Cerebral Valley · Built with Opus 4.7** hackathon.

## License

[MIT](LICENSE) © 2026 Naufaldi Rafif
