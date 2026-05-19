function isLocalhostOrigin(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * OAuth redirect_uri is `{baseURL}/api/auth/callback/google`. Google Cloud Console must list that exact URL.
 * In local dev, the web app is often :5173 but Google is usually registered for the API port (:3001).
 */
export function defaultBetterAuthBaseURL(input: {
  explicit: string | undefined
  appUrl: string
  apiPort: string
}): string {
  if (input.explicit !== undefined && input.explicit !== '') {
    return input.explicit
  }
  if (isLocalhostOrigin(input.appUrl)) {
    return `http://localhost:${input.apiPort}`
  }
  return input.appUrl
}
