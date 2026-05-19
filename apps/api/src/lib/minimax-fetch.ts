import https from 'node:https'

const MINIMAX_HOSTS = new Set(['api.minimax.io'])

function isDnsFailure(error: unknown): boolean {
  const codes = collectErrorCodes(error)
  return codes.some((code) => code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ESERVFAIL')
}

function collectErrorCodes(error: unknown): string[] {
  const codes: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 4 && current !== undefined && current !== null; depth += 1) {
    if (typeof current === 'object' && current !== null && 'code' in current) {
      const code = (current as { code?: unknown }).code
      if (typeof code === 'string') {
        codes.push(code)
      }
    }
    if (typeof current === 'object' && current !== null && 'cause' in current) {
      current = (current as { cause?: unknown }).cause
      continue
    }
    break
  }
  return codes
}

function isMinimaxUrl(input: string | URL | Request): boolean {
  const url = input instanceof Request ? input.url : String(input)
  try {
    return MINIMAX_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

function toRequestUrl(input: string | URL | Request): URL {
  return input instanceof Request ? new URL(input.url) : new URL(String(input))
}

function mergeRequestInit(input: string | URL | Request, init?: RequestInit): RequestInit {
  if (!(input instanceof Request)) {
    return init ?? {}
  }
  const headers = new Headers(input.headers)
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }
  const merged: RequestInit = {
    method: init?.method ?? input.method,
    headers,
    body: init?.body ?? input.body,
  }
  if (init?.signal !== undefined) {
    merged.signal = init.signal
  }
  return merged
}

export async function resolveHostViaGoogleDns(hostname: string): Promise<string[]> {
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
    { signal: AbortSignal.timeout(5000) },
  )
  if (!response.ok) {
    throw new Error(`DNS lookup failed for ${hostname}: HTTP ${response.status}`)
  }

  const data = (await response.json()) as {
    Answer?: Array<{ type: number; data: string }>
  }
  const ips = (data.Answer ?? [])
    .filter((record) => record.type === 1)
    .map((record) => record.data)

  if (ips.length === 0) {
    throw new Error(`DNS lookup returned no A records for ${hostname}`)
  }

  return ips
}

export function fetchViaResolvedIp(
  requestUrl: URL,
  ip: string,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method ?? 'GET'
  const headers = new Headers(init?.headers)
  headers.set('host', requestUrl.host)

  const body = init?.body

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method,
        headers: Object.fromEntries(headers.entries()),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        res.on('end', () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage ?? 'Bad Gateway',
              headers: res.headers as Record<string, string>,
            }),
          )
        })
      },
    )

    req.on('error', reject)
    req.setTimeout(30 * 60 * 1000, () => {
      req.destroy(new Error('Request timeout'))
    })

    if (body === null || body === undefined) {
      req.end()
      return
    }

    if (typeof body === 'string') {
      req.write(body)
      req.end()
      return
    }

    if (body instanceof Uint8Array) {
      req.write(body)
      req.end()
      return
    }

    reject(new Error('Unsupported request body type for MiniMax DNS fallback fetch'))
  })
}

export function createMinimaxFetch(
  baseFetch: typeof fetch = globalThis.fetch,
  ipFetch: typeof fetchViaResolvedIp = fetchViaResolvedIp,
): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const mergedInit = mergeRequestInit(input, init)

    try {
      return await baseFetch(input, mergedInit)
    } catch (error) {
      if (!isDnsFailure(error) || !isMinimaxUrl(input)) {
        throw error
      }

      const requestUrl = toRequestUrl(input)
      const ips = await resolveHostViaGoogleDns(requestUrl.hostname)
      let lastError: unknown = error

      for (const ip of ips) {
        try {
          return await ipFetch(requestUrl, ip, mergedInit)
        } catch (retryError) {
          lastError = retryError
        }
      }

      throw lastError
    }
  }
}

export function isMinimaxDnsFallbackEnabled(): boolean {
  const flag = process.env['MINIMAX_DNS_FALLBACK']?.trim().toLowerCase()
  return flag !== '0' && flag !== 'false' && flag !== 'off'
}
