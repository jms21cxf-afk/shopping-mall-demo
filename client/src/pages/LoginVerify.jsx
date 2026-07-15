import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import { completeLoginChallenge, getLoginChallenge } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { saveAuth } from '@/utils/auth'
import { getPublicAppUrl, needsPhoneUrlSetup } from '@/utils/appUrl'
import './Login.css'

const POLL_INTERVAL_MS = 2000

function LoginVerify() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const challengeId = searchParams.get('challenge') || ''
  const [challenge, setChallenge] = useState(null)
  const [error, setError] = useState('')
  const completingRef = useRef(false)

  const approveUrl = useMemo(() => {
    if (!challengeId) return ''
    return `${getPublicAppUrl()}/login/approve?challenge=${encodeURIComponent(challengeId)}`
  }, [challengeId])

  const qrCodeUrl = useMemo(() => {
    if (!approveUrl) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(approveUrl)}`
  }, [approveUrl])

  useEffect(() => {
    if (!challengeId) {
      setError(t('twoFactorMissingChallenge'))
      return undefined
    }

    let cancelled = false

    const pollChallenge = async () => {
      try {
        const data = await getLoginChallenge(challengeId)
        if (cancelled) return

        setChallenge(data)
        setError('')

        if (data.status === 'denied') {
          setError(t('twoFactorDenied'))
          return
        }

        if (data.status === 'expired') {
          setError(t('twoFactorExpired'))
          return
        }

        if (data.status === 'approved' && !completingRef.current) {
          completingRef.current = true

          try {
            const result = await completeLoginChallenge(challengeId)
            if (cancelled) return
            saveAuth(result.token, result.user)
            navigate('/', { replace: true })
          } catch (completeError) {
            completingRef.current = false
            if (!cancelled) {
              setError(completeError.message || t('twoFactorCompleteFailed'))
            }
          }
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError.message || t('twoFactorCompleteFailed'))
        }
      }
    }

    pollChallenge()
    const intervalId = window.setInterval(pollChallenge, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [challengeId, navigate, t])

  return (
    <>
      <PageLanguageBar />
      <main className="login-page">
        <div className="login-card login-card--wide">
          <header className="login-header">
            <h1>{t('twoFactorWaitingTitle')}</h1>
          </header>

          <p className="login-verify-message">{t('twoFactorWaitingMessage')}</p>

          {challenge && (
            <div className="login-verify-details">
              <p>{t('twoFactorDeviceLine', { device: challenge.deviceLabel })}</p>
              <p>{t('twoFactorLocationLine', { location: challenge.locationLabel })}</p>
            </div>
          )}

          {needsPhoneUrlSetup() && (
            <p className="login-verify-localhost-hint">{t('twoFactorLocalhostHint')}</p>
          )}

          {approveUrl && (
            <div className="login-verify-phone">
              <p className="login-verify-phone-title">{t('twoFactorPhoneHint')}</p>
              <img src={qrCodeUrl} alt="" className="login-verify-qr" />
              <a href={approveUrl} className="login-verify-link">
                {t('twoFactorOpenOnPhone')}
              </a>
            </div>
          )}

          {!error && challenge?.status === 'pending' && (
            <p className="login-verify-polling">{t('twoFactorPolling')}</p>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="login-footer">
            <Link to="/login" className="signup-link">
              {t('twoFactorBackToLogin')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default LoginVerify
