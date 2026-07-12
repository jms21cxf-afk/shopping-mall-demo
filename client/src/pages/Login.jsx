import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { loginUser } from '@/api/client'
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
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setError('아이디와 비밀번호를 입력해 주세요.')
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
      setError(loginError.message || '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialLogin = (provider) => {
    setError(
      `${provider} 로그인은 OAuth 연동이 필요합니다. 현재 서버에는 아이디/비밀번호 로그인 API만 구현되어 있습니다.`,
    )
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <header className="login-header">
          <h1>로그인</h1>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">아이디</span>
            <input
              type="text"
              name="username"
              placeholder="아이디를 입력하세요"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">비밀번호</span>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="비밀번호 표시 전환"
              >
                <IconEye visible={showPassword} />
              </button>
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="social-login">
          <button
            type="button"
            className="social-button social-button--naver"
            onClick={() => handleSocialLogin('네이버')}
          >
            <span className="social-icon social-icon--naver" aria-hidden="true">
              N
            </span>
            네이버 로그인
          </button>
          <button
            type="button"
            className="social-button social-button--kakao"
            onClick={() => handleSocialLogin('카카오')}
          >
            <span className="social-icon social-icon--kakao" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4C7.03 4 3 7.13 3 11c0 2.38 1.55 4.48 3.89 5.72L5.5 20l3.72-2.04c.79.12 1.6.19 2.44.19 4.97 0 9-3.13 9-7s-4.03-7-9-7Z" />
              </svg>
            </span>
            카카오로 시작하기
          </button>
        </div>

        <div className="login-links">
          <button type="button" className="text-link">
            아이디를 잊으셨나요?
          </button>
          <button type="button" className="text-link">
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <div className="login-footer">
          <p>회원가입을 하실 경우 다양한 혜택이 있습니다.</p>
          <Link to="/signup" className="signup-link">
            회원가입
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Login
