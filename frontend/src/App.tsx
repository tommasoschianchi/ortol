import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import { Loading, Logo } from './components/ui'
import Admin, { ChangePassword } from './pages/Admin'
import Catalog from './pages/Catalog'
import GardenPage from './pages/GardenPage'
import Home from './pages/Home'
import LayoutPage from './pages/LayoutPage'
import Login from './pages/Login'
import NewGarden from './pages/NewGarden'
import PlantDetail from './pages/PlantDetail'

export default function App() {
  const { user, ready, error, refresh } = useAuth()

  if (!ready) return <Loading text="Avvio Ortol…" />
  if (error && !user) return (
    <div className="wrap" style={{ paddingTop: 60 }}>
      <div className="error">Il server non risponde ({error}). Avvia il backend .NET e riprova.</div>
      <button className="btn" style={{ marginTop: 14 }} onClick={refresh}>Riprova</button>
    </div>
  )
  if (!user) return <Login />

  return (
    <>
      <TopBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nuovo" element={<NewGarden />} />
          <Route path="/orto/:id" element={<GardenPage />} />
          <Route path="/orto/:id/disposizione" element={<LayoutPage />} />
          <Route path="/orto/:id/piante" element={<Catalog />} />
          <Route path="/orto/:id/piante/:speciesId" element={<PlantDetail />} />
          <Route path="/piante" element={<Catalog />} />
          <Route path="/piante/:speciesId" element={<PlantDetail />} />
          <Route path="/admin" element={user.role === 'Admin' ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<div className="wrap loading">Pagina non trovata. <Link to="/">Torna ai tuoi orti</Link></div>} />
        </Routes>
      </main>
    </>
  )
}

function TopBar() {
  const { user, logout } = useAuth()
  const g = useMatch('/orto/:id/*')
  const gid = g?.params.id
  const [menu, setMenu] = useState(false)
  const [pw, setPw] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => setMenu(false), [loc.pathname])
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])

  return (
    <header className="topbar">
      <div className="wrap">
        <Link to={gid ? `/orto/${gid}` : '/'} className="brand"><Logo /> <span className="brand-name">Ortol</span></Link>
        <nav aria-label="Principale">
          {gid ? (
            <>
              <NavLink to={`/orto/${gid}`} end>Home</NavLink>
              <NavLink to={`/orto/${gid}/disposizione`}>Il mio orto</NavLink>
              <NavLink to={`/orto/${gid}/piante`}>Piante</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end>Orti</NavLink>
              <NavLink to="/piante">Piante</NavLink>
            </>
          )}
          {user?.role === 'Admin' && <NavLink to="/admin">Utenti</NavLink>}
        </nav>
        <div className="usermenu" ref={ref}>
          <button className="avatar" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)} title={user?.displayName}>
            {(user?.displayName || user?.username || '?').slice(0, 1).toUpperCase()}
          </button>
          {menu && (
            <div className="menu" role="menu">
              <div className="menu-head"><b>{user?.displayName}</b><span>{user?.username}{user?.role === 'Admin' ? ' · amministratore' : ''}</span></div>
              <button role="menuitem" onClick={() => nav('/')}>I miei orti</button>
              <button role="menuitem" onClick={() => nav('/nuovo')}>Nuovo orto</button>
              <button role="menuitem" onClick={() => { setMenu(false); setPw(true) }}>Cambia password</button>
              <button role="menuitem" onClick={async () => { await logout(); nav('/') }}>Esci</button>
            </div>
          )}
        </div>
      </div>
      {pw && <ChangePassword onClose={() => setPw(false)} />}
    </header>
  )
}
