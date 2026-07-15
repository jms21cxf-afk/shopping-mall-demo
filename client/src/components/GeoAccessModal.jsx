import { useCallback, useEffect, useState } from 'react'
import { getGeoLocation } from '@/api/client'
import {
  countryCodeToFlag,
  getLocalizedCountryName,
  getSuggestedLanguage,
} from '@/i18n/geoUtils'
import { useLanguage } from '@/i18n/LanguageContext'
import {
  GEO_MOCK_OPTIONS,
  getGeoMockCountry,
  setGeoMockCountry,
} from '@/utils/geoMock'
import './GeoAccessModal.css'

function GeoAccessModal({ isOpen, onClose }) {
  const { locale, setLanguage, t } = useLanguage()
  const [geo, setGeo] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mockCountry, setMockCountry] = useState(() => getGeoMockCountry())

  const loadGeo = useCallback(
    (countryCode) => {
      setIsLoading(true)
      setError('')
      setGeo(null)

      return getGeoLocation(countryCode || undefined)
        .then((data) => {
          setGeo(data)
        })
        .catch((fetchError) => {
          setError(fetchError.message || t('geoModalError'))
        })
        .finally(() => {
          setIsLoading(false)
        })
    },
    [t],
  )

  useEffect(() => {
    if (!isOpen) return

    setMockCountry(getGeoMockCountry())
    loadGeo(getGeoMockCountry())
  }, [isOpen, loadGeo])

  const handleMockChange = (event) => {
    const nextCountry = event.target.value
    setMockCountry(nextCountry)
    setGeoMockCountry(nextCountry)
    loadGeo(nextCountry)
  }

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

        {import.meta.env.DEV && (
          <div className="geo-modal-dev">
            <label htmlFor="geo-mock-country">테스트 위치 (개발용)</label>
            <select
              id="geo-mock-country"
              className="geo-modal-dev-select"
              value={mockCountry}
              onChange={handleMockChange}
            >
              {GEO_MOCK_OPTIONS.map((option) => (
                <option key={option.code || 'real'} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="geo-modal-dev-hint">URL: ?geo=US (예: 미국)</p>
          </div>
        )}

        {isLoading && <p className="geo-modal-message">{t('geoModalLoading')}</p>}

        {error && !isLoading && <p className="geo-modal-error">{error}</p>}

        {!isLoading && !error && geo && (
          <>
            <p className="geo-modal-message">
              {t('geoModalGreeting', { country: countryName, flag })}
            </p>
            <p className="geo-modal-submessage">{t('geoModalQuestion')}</p>
            {(geo.isLocalDev || geo.isMock) && (
              <p className="geo-modal-note">{t('geoModalLocalDevNote')}</p>
            )}
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
