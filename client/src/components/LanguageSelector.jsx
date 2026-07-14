import { useEffect, useRef, useState } from 'react'
import { LANGUAGE_OPTIONS } from '@/i18n/translations'
import { useLanguage } from '@/i18n/LanguageContext'
import './LanguageSelector.css'

function LanguageSelector({ className = '' }) {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleLanguageChange = (code) => {
    setLanguage(code)
    setIsOpen(false)
  }

  return (
    <div className={`nav-language-menu ${className}`.trim()} ref={menuRef}>
      <button
        type="button"
        className="nav-language-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {t('language')}
        <span className="nav-language-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        <div className="nav-language-dropdown" role="listbox" aria-label={t('language')}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={language === option.code}
              className={
                language === option.code
                  ? 'nav-language-option is-active'
                  : 'nav-language-option'
              }
              onClick={() => handleLanguageChange(option.code)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector
