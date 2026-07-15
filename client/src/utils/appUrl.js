export function getPublicAppUrl() {
  const configured = import.meta.env.VITE_PUBLIC_URL?.trim().replace(/\/$/, '')

  if (configured) {
    return configured
  }

  return window.location.origin
}

export function needsPhoneUrlSetup() {
  if (import.meta.env.VITE_PUBLIC_URL?.trim()) {
    return false
  }

  return /localhost|127\.0\.0\.1/i.test(window.location.hostname)
}
