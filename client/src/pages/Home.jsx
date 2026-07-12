import { useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import './Home.css'

function Home() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    apiFetch('/health')
      .then((data) => {
        if (isMounted) {
          setHealth(data)
          setError('')
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Backend server is not reachable. Start the server with npm run dev in /server.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="home">
      <div className="hero">
        <p className="eyebrow">Shopping Mall Demo</p>
        <h1>React + Vite client is ready</h1>
        <p className="description">
          Frontend is connected to the Express API through the Vite dev proxy.
        </p>
      </div>

      <div className="status-card">
        <h2>API Health Check</h2>
        {health && (
          <div className="status success">
            <span>{health.status}</span>
            <p>{health.message}</p>
          </div>
        )}
        {error && (
          <div className="status error">
            <span>offline</span>
            <p>{error}</p>
          </div>
        )}
        {!health && !error && <p className="loading">Checking backend...</p>}
      </div>
    </section>
  )
}

export default Home
