# Theme brief — Monetize (Free / Pro)

**Visibility:** generator-visible  
**Product:** School Exam Generator (Ujian SD) — this repository  
**Case:** Free / Pro subscription with feature gates

---

## Problem

Guru SD use AI generate heavily. Today the product has no paid tier. We need a monetize path that:

- Keeps a useful Free experience for teachers who are trying the product
- Makes Pro worth paying for (clear gates, not fake scarcity)
- Fits Indonesian school / guru context (price sensitivity, WhatsApp-era workflows, school year cycles)

## Required product shape

| Tier | Intent |
|------|--------|
| **Free** | Limited generates and/or locked features so the core “buat lembar ujian” loop still works |
| **Pro** | Paid tier that unlocks those gates |

Exact limits and which features are Free vs Pro are **for the PRD author to decide**, within these bounds:

- Must be implementable on the current stack (Effect Schema, better-auth, Drizzle, pnpm monorepo)
- Must not invent a second app or replace the existing generate → review → export loop
- Payment provider may be stubbed at boundaries in early phases; do not require full production billing hardening in the first Code MVP

## Constraints (hard)

- Effect Schema only (no Zod)
- Respect existing auth (better-auth / Google OAuth; local DEV_AUTH)
- Prefer additive schema + API gates over rewriting generate
- Indonesian UI copy where user-facing
- Research eval only — do not assume this ships to `main` from the eval

## Out of scope for this theme (unless PRD explicitly phases later)

- Multi-tenant school district billing
- Student-facing payments
- Marketplace of soal packs as the primary monetize story
- Changing curriculum corpus licensing as the paywall

## Success for the PRD stage

A reader can answer: who pays, what they get, what Free users hit, and how we know MVP is done.
