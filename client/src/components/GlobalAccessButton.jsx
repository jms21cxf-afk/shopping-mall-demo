import { useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import GeoAccessModal from '@/components/GeoAccessModal'
import './LanguageSelector.css'

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-globe-icon">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="3" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="6" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="8" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function GlobalAccessButton({ className = '' }) {
  const { t } = useLanguage()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`nav-globe-button ${className}`.trim()}
        aria-label={t('geoGlobeLabel')}
        onClick={() => setIsModalOpen(true)}
      >
        <GlobeIcon />
      </button>
      <GeoAccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

export default GlobalAccessButton
