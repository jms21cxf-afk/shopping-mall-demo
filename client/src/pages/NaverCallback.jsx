import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageContext'
import './Login.css'

function NaverCallback() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState(() => t('naverLoginProcessing'))

  useEffect(() => {
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    const challenge = searchParams.get('challenge')

    if (challenge) {
      navigate(`/login/verify?challenge=${encodeURIComponent(challenge)}`, { replace: true })
      return
    }

    navigate(`/login?error=${encodeURIComponent('로그인 정보가 없습니다.')}`, { replace: true })
  }, [navigate, searchParams])

  return (
    <main className="login-page">
      <div className="login-card">
        <p className="login-callback-message">{message}</p>
      </div>
    </main>
  )
}

export default NaverCallback
