const STORAGE_KEY = 'geoMockCountry'

export const GEO_MOCK_OPTIONS = [
  { code: '', label: '실제 IP (기본)' },
  { code: 'KR', label: '🇰🇷 한국' },
  { code: 'US', label: '🇺🇸 미국' },
  { code: 'JP', label: '🇯🇵 일본' },
  { code: 'CN', label: '🇨🇳 중국' },
  { code: 'GB', label: '🇬🇧 영국' },
  { code: 'FR', label: '🇫🇷 프랑스' },
]

export function getGeoMockCountry() {
  if (!import.meta.env.DEV) return ''
  return sessionStorage.getItem(STORAGE_KEY) || ''
}

export function setGeoMockCountry(code) {
  if (!import.meta.env.DEV) return

  if (code) {
    sessionStorage.setItem(STORAGE_KEY, code.toUpperCase())
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

/** URL ?geo=US 로 테스트 위치 지정 (개발 환경만) */
export function applyGeoMockFromUrl() {
  if (!import.meta.env.DEV) return

  const params = new URLSearchParams(window.location.search)
  const geo = params.get('geo')?.trim()

  if (geo) {
    setGeoMockCountry(geo)
  }
}
