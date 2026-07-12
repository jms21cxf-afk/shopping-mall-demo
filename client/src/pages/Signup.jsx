import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkUsername, createUser, loginUser } from '@/api/client'
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
      { key: 'terms', label: '이용약관 동의', required: true, hasView: true },
      { key: 'privacy', label: '개인정보처리방침 동의', required: true, hasView: true },
      {
        key: 'marketing',
        label: '마케팅 정보 수신 동의',
        required: false,
        hasView: false,
      },
    ],
    [],
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
        message: '아이디를 입력해 주세요.',
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
          message: '사용 가능한 아이디입니다.',
        })
      } else {
        setUsernameStatus({
          checked: true,
          available: false,
          message: '이미 사용 중인 아이디입니다.',
        })
      }
    } catch (checkError) {
      setUsernameStatus({
        checked: false,
        available: false,
        message: checkError.message || '중복 확인에 실패했습니다.',
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
      setError('필수 항목을 모두 입력해 주세요.')
      return
    }

    if (!usernameStatus.checked || !usernameStatus.available) {
      setError('아이디 중복 확인을 해주세요.')
      return
    }

    if (!PASSWORD_PATTERN.test(form.password)) {
      setError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!agreements.terms || !agreements.privacy) {
      setError('필수 약관에 동의해 주세요.')
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
      setError(submitError.message || '회원가입에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page">
      <div className="signup-card">
        <p className="signup-brand">Shopping Mall</p>
        <header className="signup-header">
          <h1>회원가입</h1>
          <p>새로운 계정을 만들어 쇼핑을 시작하세요</p>
        </header>

        <form className="signup-form" onSubmit={handleSubmit}>
          <p className="required-notice">
            <span className="required-mark">*</span> 표시는 필수 입력 항목입니다.
          </p>

          <section className="form-section">
            <h2 className="form-section-title">기본 정보</h2>

            <div className="field">
              <FieldLabel required>아이디</FieldLabel>
              <div className="username-row">
                <input
                  type="text"
                  name="username"
                  placeholder="아이디를 입력하세요"
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
                  {isCheckingUsername ? '확인 중...' : '중복확인'}
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
            <FieldLabel required>이름</FieldLabel>
            <input
              type="text"
              name="name"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <FieldLabel required>이메일</FieldLabel>
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
            <FieldLabel>전화번호</FieldLabel>
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
            <h2 className="form-section-title">비밀번호</h2>

            <label className="field">
              <FieldLabel required>비밀번호</FieldLabel>
              <PasswordInput
              name="password"
              value={form.password}
              placeholder="비밀번호를 입력하세요"
              onChange={handleChange}
              visible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
              toggleLabel="비밀번호 표시 전환"
            />
            <small>8자 이상, 영문, 숫자, 특수문자 포함</small>
          </label>

          <label className="field">
            <FieldLabel required>비밀번호 확인</FieldLabel>
            <PasswordInput
              name="confirmPassword"
              value={form.confirmPassword}
              placeholder="비밀번호를 다시 입력하세요"
              onChange={handleChange}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
              toggleLabel="비밀번호 확인 표시 전환"
            />
          </label>
          </section>

          <section className="form-section agreements-section">
            <h2 className="form-section-title">약관 동의</h2>

            <div className="agreements">
            <label className="agreement-item agreement-all">
              <input
                type="checkbox"
                checked={agreements.all}
                onChange={() => handleAgreementChange('all')}
              />
              <span>전체 동의</span>
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
                      보기
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
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="signup-footer">
          이미 계정이 있으신가요? <Link to="/">메인으로 돌아가기</Link>
        </p>
      </div>
    </main>
  )
}

export default Signup
