import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFetchHttpLayer,
  describeResolvedConfig,
  resolveMinimaxLayerConfig,
  resolveOpenAiLayerConfig,
} from '../layers'

describe('resolveMinimaxLayerConfig', () => {
  it('uses default MiniMax base URL when env override is empty', () => {
    const config = resolveMinimaxLayerConfig({
      MINIMAX_API_KEY: 'minimax-test',
      MINIMAX_ANTHROPIC_BASE_URL: '',
    })
    expect(config.apiUrl).toBe('https://api.minimax.io/anthropic')
  })
})

describe('resolveOpenAiLayerConfig', () => {
  it('uses OPENAI_BASE_URL when provided', () => {
    const config = resolveOpenAiLayerConfig({
      OPENAI_API_KEY: 'sk-openai-test',
      OPENAI_BASE_URL: 'https://proxy.example/v1',
    })
    expect(config.apiUrl).toBe('https://proxy.example/v1')
  })
})

describe('describeResolvedConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('flags MiniMax DNS fallback for api.minimax.io', () => {
    vi.stubEnv('MINIMAX_DNS_FALLBACK', '1')
    const info = describeResolvedConfig(
      resolveMinimaxLayerConfig({
        MINIMAX_API_KEY: 'minimax-test',
        MINIMAX_DNS_FALLBACK: '1',
      }),
    )
    expect(info.usesMinimaxFetch).toBe(true)
  })

  it('does not flag DNS fallback when disabled', () => {
    vi.stubEnv('MINIMAX_DNS_FALLBACK', '0')
    const info = describeResolvedConfig(
      resolveMinimaxLayerConfig({
        MINIMAX_API_KEY: 'minimax-test',
        MINIMAX_DNS_FALLBACK: '0',
      }),
    )
    expect(info.usesMinimaxFetch).toBe(false)
  })
})

describe('buildFetchHttpLayer', () => {
  it('builds a layer without throwing for default fetch', () => {
    expect(buildFetchHttpLayer()).toBeDefined()
  })
})
