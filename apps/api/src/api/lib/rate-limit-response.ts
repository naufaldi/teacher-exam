export async function attachRateLimitHeaders(response: Response): Promise<Response> {
  if (response.status !== 429) {
    return response
  }

  try {
    const bodyText = await response.clone().text()
    const body = JSON.parse(bodyText) as { retryAfterSec?: number }
    if (typeof body.retryAfterSec !== "number") {
      return response
    }

    const headers = new Headers(response.headers)
    headers.set("Retry-After", String(body.retryAfterSec))
    return new Response(bodyText, { status: response.status, headers })
  } catch {
    return response
  }
}
