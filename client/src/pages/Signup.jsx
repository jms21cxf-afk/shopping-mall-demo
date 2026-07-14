import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import { checkUsername, createUser, loginUser } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { saveAuth } from '@/utils/auth'
import './Signup.css'

const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

function FieldLabel({ children, required = false }) {
  return (
    <span className="field-label">
      {children}
      {required && <span className="required-mark">*</span>}
    </span>
  )
}

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

function PasswordInput({
  name,
  value,
  placeholder,
  onChange,
  visible,
  onToggle,
  toggleLabel,
}) {
  return (
    <div className="password-wrap">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        className="toggle-password"
        onClick={onToggle}
        aria-label={toggleLabel}
      >
        <IconEye visible={visible} />
      </button>
    </div>
  )
}

function Signup() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  })
  const [usernameStatus, setUsernameStatus] = useState({
    checked: false,
    available: false,
    message: '',
  })
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const agreementItems = useMemo(
    () => [
      { key: 'terms', label: t('signupAgreeTerms'), required: true, hasView: true },
      { key: 'privacy', label: t('signupAgreePrivacy'), required: true, hasView: true },
      {
        key: 'marketing',
        label: t('signupAgreeMarketing'),
        required: false,
        hasView: false,
      },
    ],
    [t],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))

    if (name === 'username') {
      setUsernameStatus({
        checked: false,
        available: false,
        message: '',
      })
    }
  }

  const handleCheckUsername = async () => {
    const username = form.username.trim()

    if (!username) {
      setUsernameStatus({
        checked: false,
        available: false,
        message: t('signupEnterUsername'),
      })
      return
    }

    setIsCheckingUsername(true)
    setUsernameStatus({ checked: false, available: false, message: '' })

    try {
      const result = await checkUsername(username)

      if (result.available) {
        setUsernameStatus({
          checked: true,
          available: true,
          message: t('signupUsernameAvailable'),
        })
      } else {
        setUsernameStatus({
          checked: true,
          available: false,
          message: t('signupUsernameTaken'),
        })
      }
    } catch (checkError) {
      setUsernameStatus({
        checked: false,
        available: false,
        message: checkError.message || t('signupCheckFailed'),
      })
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const handleAgreementChange = (key) => {
    if (key === 'all') {
      const nextValue = !agreements.all
      setAgreements({
        all: nextValue,
        terms: nextValue,
        privacy: nextValue,
        marketing: nextValue,
      })
      return
    }

    setAgreements((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      next.all = next.terms && next.privacy && next.marketing
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const username = form.username.trim()
    const name = form.name.trim()

    if (!username || !name || !form.email || !form.password) {
      setError(t('signupRequiredFields'))
      return
    }

    if (!usernameStatus.checked || !usernameStatus.available) {
      setError(t('signupCheckUsernameRequired'))
      return
    }

    if (!PASSWORD_PATTERN.test(form.password)) {
      setError(t('signupInvalidPassword'))
      return
    }

    if (form.password !== form.confirmPassword) {
      setError(t('signupPasswordMismatch'))
      return
    }

    if (!agreements.terms || !agreements.privacy) {
      setError(t('signupAgreementsRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      await createUser({
        username,
        email: form.email.trim(),
        name,
        password: form.password,
        phone: form.phone.trim() || undefined,
        userType: 'customer',
      })

      const loginResult = await loginUser({
        username: username.toLowerCase(),
        password: form.password,
      })

      saveAuth(loginResult.token, loginResult.user)
      navigate('/')
    } catch (submitError) {
      setError(submitError.message || t('signupFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageLanguageBar />
      <main className="signup-page">
        <div className="signup-card">
          <p className="signup-brand">Shopping Mall</p>
          <header className="signup-header">
            <h1>{t('signupTitle')}</h1>
            <p>{t('signupSubtitle')}</p>
          </header>

          <form className="signup-form" onSubmit={handleSubmit}>
            <p className="required-notice">
              <span className="required-mark">*</span> {t('signupRequiredNotice')}
            </p>

            <section className="form-section">
              <h2 className="form-section-title">{t('signupBasicInfo')}</h2>

              <div className="field">
                <FieldLabel required>{t('signupUsername')}</FieldLabel>
                <div className="username-row">
                  <input
                    type="text"
                    name="username"
                    placeholder={t('loginUsernamePlaceholder')}
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="check-button"
                    onClick={handleCheckUsername}
                    disabled={isCheckingUsername}
                  >
                    {isCheckingUsername ? t('signupCheckingUsername') : t('signupCheckUsername')}
                  </button>
                </div>
                {usernameStatus.message && (
                  <small
                    className={
                      usernameStatus.available
                        ? 'username-message success'
                        : 'username-message error'
                    }
                  >
                    {usernameStatus.message}
                  </small>
                )}
              </div>

              <label className="field">
                <FieldLabel required>{t('signupName')}</FieldLabel>
                <input
                  type="text"
                  name="name"
                  placeholder={t('signupName')}
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="field">
                <FieldLabel required>{t('signupEmail')}</FieldLabel>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="field">
                <FieldLabel>{t('signupPhone')}</FieldLabel>
                <input
                  type="tel"
                  name="phone"
                  placeholder="010-1234-5678"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>
            </section>

            <section className="form-section">
              <h2 className="form-section-title">{t('signupPasswordSection')}</h2>

              <label className="field">
                <FieldLabel required>{t('signupPassword')}</FieldLabel>
                <PasswordInput
                  name="password"
                  value={form.password}
                  placeholder={t('loginPasswordPlaceholder')}
                  onChange={handleChange}
                  visible={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  toggleLabel={t('signupTogglePassword')}
                />
                <small>{t('signupPasswordHint')}</small>
              </label>

              <label className="field">
                <FieldLabel required>{t('signupConfirmPassword')}</FieldLabel>
                <PasswordInput
                  name="confirmPassword"
                  value={form.confirmPassword}
                  placeholder={t('loginPasswordPlaceholder')}
                  onChange={handleChange}
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((prev) => !prev)}
                  toggleLabel={t('signupTogglePassword')}
                />
              </label>
            </section>

            <section className="form-section agreements-section">
              <h2 className="form-section-title">{t('signupAgreements')}</h2>

              <div className="agreements">
                <label className="agreement-item agreement-all">
                  <input
                    type="checkbox"
                    checked={agreements.all}
                    onChange={() => handleAgreementChange('all')}
                  />
                  <span>{t('signupAgreeAll')}</span>
                </label>

                <div className="agreement-list">
                  {agreementItems.map((item) => (
                    <div key={item.key} className="agreement-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={agreements[item.key]}
                          onChange={() => handleAgreementChange(item.key)}
                        />
                        <span className="agreement-label">
                          {item.label}
                          {item.required && (
                            <span className="required-mark">*</span>
                          )}
                        </span>
                      </label>
                      {item.hasView && (
                        <button type="button" className="view-link">
                          {t('signupView')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {error && <p className="form-error">{error}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? t('signupSubmitting') : t('signupSubmit')}
            </button>
          </form>

          <p className="signup-footer">
            {t('signupHasAccount')} <Link to="/">{t('signupBackHome')}</Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Signup
