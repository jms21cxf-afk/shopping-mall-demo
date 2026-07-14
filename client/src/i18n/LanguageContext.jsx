import { createContext, useContext, useMemo, useState } from 'react'
import { LANGUAGES, translate } from '@/i18n/translations'

const STORAGE_KEY = 'language'

const LanguageContext = createContext(null)

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && LANGUAGES[stored]) {
    return stored
  }

  return 'ko'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = (nextLanguage) => {
    if (!LANGUAGES[nextLanguage]) return

    localStorage.setItem(STORAGE_KEY, nextLanguage)
    setLanguageState(nextLanguage)
  }

  const value = useMemo(() => {
    const locale = LANGUAGES[language].locale

    return {
      language,
      locale,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      formatPrice: (price) => {
        const formatted = Number(price).toLocaleString(locale)
        if (language === 'ko') return `${formatted}원`
        return `₩${formatted}`
      },
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}
