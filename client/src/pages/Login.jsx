import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import { getGoogleLoginUrl, getKakaoLoginUrl, loginUser } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { isLoggedIn, saveAuth } from '@/utils/auth'
import './Login.css'

function IconEye({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 11a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 4.27 3.28 3 21 20.72 19.73 22l-3.08-3.08A11.8 11.8 0 0 1 12 19C7 19 2.73 15.89 1 12a12.3 12.3 0 0 1 3.17-3.84L2 4.27ZM12 7a4.8 4.8 0 0 1 4.74 4.26l1.45 1.45A6.82 6.82 0 0 0 12 5C7 5 2.73 8.11 1 12a12.3 12.3 0 0 0 2.32 3.18l1.57-1.57A4.84 4.84 0 0 1 12 7Z" />
    </svg>
  )
}

function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError(decodeURIComponent(oauthError))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (isLoggedIn()) {
    return <Navigate to="/" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const username = form.username.trim().toLowerCase()

    if (!username || !form.password) {
      setError(t('loginRequiredFields'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await loginUser({
        username,
        password: form.password,
      })

      saveAuth(result.token, result.user)
      navigate('/')
    } catch (loginError) {
      setError(loginError.message || t('loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKakaoLogin = () => {
    window.location.href = getKakaoLoginUrl()
  }

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl()
  }

  const handleSocialLogin = (provider) => {
    if (provider === 'kakao') {
      handleKakaoLogin()
      return
    }

    if (provider === 'google') {
      handleGoogleLogin()
      return
    }

    setError(t('loginOAuthRequired', { provider: t('loginNaver') }))
  }

  return (
    <>
      <PageLanguageBar />
      <main className="login-page">
        <div className="login-card">
          <header className="login-header">
            <h1>{t('loginTitle')}</h1>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">{t('loginUsername')}</span>
              <input
                type="text"
                name="username"
                placeholder={t('loginUsernamePlaceholder')}
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t('loginPassword')}</span>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={t('loginPasswordPlaceholder')}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={t('loginTogglePassword')}
                >
                  <IconEye visible={showPassword} />
                </button>
              </div>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? t('loginSubmitting') : t('loginSubmit')}
            </button>
          </form>

          <div className="social-login">
            <button
              type="button"
              className="social-button social-button--naver"
              onClick={() => handleSocialLogin('naver')}
            >
              <span className="social-icon social-icon--naver" aria-hidden="true">
                N
              </span>
              {t('loginNaver')}
            </button>
            <button
              type="button"
              className="social-button social-button--kakao"
              onClick={() => handleSocialLogin('kakao')}
            >
              <span className="social-icon social-icon--kakao" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 4C7.03 4 3 7.13 3 11c0 2.38 1.55 4.48 3.89 5.72L5.5 20l3.72-2.04c.79.12 1.6.19 2.44.19 4.97 0 9-3.13 9-7s-4.03-7-9-7Z" />
                </svg>
              </span>
              {t('loginKakao')}
            </button>
            <button
              type="button"
              className="social-button social-button--google"
              onClick={() => handleSocialLogin('google')}
            >
              <span className="social-icon social-icon--google" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                  />
                </svg>
              </span>
              {t('loginGoogle')}
            </button>
          </div>

          <div className="login-links">
            <button type="button" className="text-link">
              {t('loginForgotId')}
            </button>
            <button type="button" className="text-link">
              {t('loginForgotPassword')}
            </button>
          </div>

          <div className="login-footer">
            <p>{t('loginSignupPrompt')}</p>
            <Link to="/signup" className="signup-link">
              {t('signup')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default Login
