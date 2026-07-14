import { useEffect, useState } from 'react'
import { getGeoLocation } from '@/api/client'
import {
  countryCodeToFlag,
  getLocalizedCountryName,
  getSuggestedLanguage,
} from '@/i18n/geoUtils'
import { useLanguage } from '@/i18n/LanguageContext'
import './GeoAccessModal.css'

function GeoAccessModal({ isOpen, onClose }) {
  const { locale, setLanguage, t } = useLanguage()
  const [geo, setGeo] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsLoading(true)
    setError('')
    setGeo(null)

    getGeoLocation()
      .then((data) => {
        if (!cancelled) setGeo(data)
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError.message || t('geoModalError'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, t])

  if (!isOpen) return null

  const countryName = geo?.countryCode
    ? getLocalizedCountryName(geo.countryCode, locale)
    : geo?.country || ''
  const flag = countryCodeToFlag(geo?.countryCode)
  const suggestedLanguage = getSuggestedLanguage(geo?.countryCode)

  const handleYes = () => {
    if (geo?.countryCode) {
      setLanguage(suggestedLanguage)
    }
    onClose()
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="geo-modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="geo-modal" role="dialog" aria-modal="true" aria-labelledby="geo-modal-title">
        <button type="button" className="geo-modal-close" onClick={onClose} aria-label={t('geoModalClose')}>
          ×
        </button>

        <p className="geo-modal-brand">Shopping Mall Demo</p>
        <h2 id="geo-modal-title" className="geo-modal-title">
          {t('geoModalWelcome')}
        </h2>

        {isLoading && <p className="geo-modal-message">{t('geoModalLoading')}</p>}

        {error && !isLoading && <p className="geo-modal-error">{error}</p>}

        {!isLoading && !error && geo && (
          <>
            <p className="geo-modal-message">
              {t('geoModalGreeting', { country: countryName, flag })}
            </p>
            <p className="geo-modal-submessage">{t('geoModalQuestion')}</p>
            {geo.isLocalDev && <p className="geo-modal-note">{t('geoModalLocalDevNote')}</p>}
            <p className="geo-modal-access">{t('geoAccessingFrom', { country: countryName, flag })}</p>
          </>
        )}

        <div className="geo-modal-actions">
          <button type="button" className="geo-modal-button geo-modal-button--primary" onClick={handleYes} disabled={isLoading || Boolean(error)}>
            {t('geoModalYes')}
          </button>
          <button type="button" className="geo-modal-button geo-modal-button--secondary" onClick={onClose}>
            {t('geoModalNo')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GeoAccessModal
