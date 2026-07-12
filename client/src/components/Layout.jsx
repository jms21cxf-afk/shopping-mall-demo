import { Link, Outlet } from 'react-router-dom'
import './Layout.css'

function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          Shopping Mall Demo
        </Link>
        <nav className="nav">
          <Link to="/">Home</Link>
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>React + Vite client for shopping-mall-demo</p>
      </footer>
    </div>
  )
}

export default Layout
