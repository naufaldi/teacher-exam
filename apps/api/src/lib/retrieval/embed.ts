const EMBED_DIMS = 384

export function embedText(text: string, dims = EMBED_DIMS): ReadonlyArray<number> {
  const vec = new Array<number>(dims).fill(0)
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1)
  for (const token of tokens) {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) % dims
    }
    vec[hash] = (vec[hash] ?? 0) + 1
  }
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1
  return vec.map((value) => value / norm)
}

export function cosineSimilarity(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export const EMBEDDING_DIMENSIONS = EMBED_DIMS
