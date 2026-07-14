import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageContext'
import { getCurrentUser } from '@/api/client'
import { saveAuth } from '@/utils/auth'
import './Login.css'

function GoogleCallback() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState(() => t('googleLoginProcessing'))

  useEffect(() => {
    const completeLogin = async () => {
      const error = searchParams.get('error')

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
        return
      }

      const token = searchParams.get('token')

      if (!token) {
        navigate(`/login?error=${encodeURIComponent('로그인 정보가 없습니다.')}`, { replace: true })
        return
      }

      localStorage.setItem('token', token)

      try {
        const user = await getCurrentUser()
        saveAuth(token, user)
        navigate('/', { replace: true })
      } catch (fetchError) {
        localStorage.removeItem('token')
        setMessage(fetchError.message || '사용자 정보를 불러오지 못했습니다.')
        navigate(
          `/login?error=${encodeURIComponent(fetchError.message || '사용자 정보를 불러오지 못했습니다.')}`,
          { replace: true },
        )
      }
    }

    completeLogin()
  }, [navigate, searchParams])

  return (
    <main className="login-page">
      <div className="login-card">
        <p className="login-callback-message">{message}</p>
      </div>
    </main>
  )
}

export default GoogleCallback
