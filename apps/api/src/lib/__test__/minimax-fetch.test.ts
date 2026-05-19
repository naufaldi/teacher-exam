import { describe, expect, it, vi } from 'vitest'
import { createMinimaxFetch, resolveHostViaGoogleDns } from '../minimax-fetch'

describe('resolveHostViaGoogleDns', () => {
  it('returns A record IPs from Google DNS over HTTPS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Answer: [
              { type: 5, data: 'lb-ali.minimax.io.' },
              { type: 1, data: '47.89.128.168' },
              { type: 1, data: '47.252.72.253' },
            ],
          }),
        ),
      ),
    )

    await expect(resolveHostViaGoogleDns('api.minimax.io')).resolves.toEqual([
      '47.89.128.168',
      '47.252.72.253',
    ])
  })

  it('throws when no A records are returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ Answer: [] }))),
    )

    await expect(resolveHostViaGoogleDns('api.minimax.io')).rejects.toThrow(/no A records/)
  })
})

describe('createMinimaxFetch', () => {
  it('retries MiniMax requests via resolved IP when system DNS fails', async () => {
    const dnsError = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.minimax.io'), { code: 'ENOTFOUND' }),
    })

    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(dnsError)
      .mockResolvedValue(new Response('unexpected'))

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Answer: [{ type: 1, data: '47.89.128.168' }],
          }),
        ),
      ),
    )

    const minimaxFetch = vi
      .fn()
      .mockResolvedValue(new Response('ok-from-ip', { status: 200 }))

    const minimaxFetchFactory = createMinimaxFetch(baseFetch as typeof fetch, minimaxFetch)
    const response = await minimaxFetchFactory('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"model":"MiniMax-M2.7"}',
    })

    expect(baseFetch).toHaveBeenCalledTimes(1)
    expect(minimaxFetch).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('ok-from-ip')
  })

  it('does not intercept non-MiniMax hosts', async () => {
    const dnsError = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.anthropic.com'), { code: 'ENOTFOUND' }),
    })
    const baseFetch = vi.fn().mockRejectedValue(dnsError)

    const minimaxFetch = createMinimaxFetch(baseFetch as typeof fetch)

    await expect(minimaxFetch('https://api.anthropic.com/v1/messages')).rejects.toBe(dnsError)
    expect(baseFetch).toHaveBeenCalledTimes(1)
  })
})
