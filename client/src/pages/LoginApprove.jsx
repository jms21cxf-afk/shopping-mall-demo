import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import {
  approveLoginChallenge,
  denyLoginChallenge,
  getLoginChallenge,
} from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import './Login.css'

function LoginApprove() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const challengeId = searchParams.get('challenge') || ''
  const [challenge, setChallenge] = useState(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!challengeId) {
      setError(t('twoFactorMissingChallenge'))
      return
    }

    getLoginChallenge(challengeId)
      .then((data) => {
        setChallenge(data)

        if (data.status === 'expired') {
          setError(t('twoFactorExpired'))
        } else if (data.status === 'denied') {
          setResult(t('twoFactorDenied'))
        } else if (data.status === 'approved') {
          setResult(t('twoFactorApproved'))
        }
      })
      .catch((fetchError) => {
        setError(fetchError.message || t('twoFactorApproveFailed'))
      })
  }, [challengeId, t])

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      await approveLoginChallenge(challengeId)
      setResult(t('twoFactorApproved'))
    } catch (approveError) {
      setError(approveError.message || t('twoFactorApproveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeny = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      await denyLoginChallenge(challengeId)
      setResult(t('twoFactorDenied'))
    } catch (denyError) {
      setError(denyError.message || t('twoFactorApproveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFinished = Boolean(result) || challenge?.status === 'approved' || challenge?.status === 'denied'

  return (
    <>
      <PageLanguageBar />
      <main className="login-page">
        <div className="login-card login-card--wide">
          <header className="login-header">
            <h1>{t('twoFactorApproveTitle')}</h1>
          </header>

          {challenge && !isFinished && (
            <>
              <p className="login-verify-message">{t('twoFactorApproveQuestion')}</p>
              <div className="login-verify-details">
                <p>{t('twoFactorDeviceLine', { device: challenge.deviceLabel })}</p>
                <p>{t('twoFactorLocationLine', { location: challenge.locationLabel })}</p>
              </div>

              <div className="login-verify-actions">
                <button
                  type="button"
                  className="login-button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  {t('twoFactorApproveYes')}
                </button>
                <button
                  type="button"
                  className="login-button login-button--secondary"
                  onClick={handleDeny}
                  disabled={isSubmitting}
                >
                  {t('twoFactorApproveNo')}
                </button>
              </div>
            </>
          )}

          {result && <p className="login-verify-result">{result}</p>}
          {error && <p className="form-error">{error}</p>}

          <div className="login-footer">
            <Link to="/" className="signup-link">
              {t('signupBackHome')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default LoginApprove
