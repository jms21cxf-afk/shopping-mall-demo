export function countryCodeToFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐'

  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function getLocalizedCountryName(countryCode, locale) {
  if (!countryCode) return ''

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return displayNames.of(countryCode.toUpperCase()) || countryCode
  } catch {
    return countryCode
  }
}

export function getSuggestedLanguage(countryCode) {
  switch (countryCode?.toUpperCase()) {
    case 'KR':
      return 'ko'
    case 'CN':
    case 'TW':
    case 'HK':
    case 'MO':
      return 'zh'
    default:
      return 'en'
  }
}
