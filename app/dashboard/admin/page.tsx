'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ColportoresPanel from '@/components/admin/ColportoresPanel'
import CamposPanel from '@/components/admin/CamposPanel'
import SiembraPanel from '@/components/admin/SiembraPanel'
import ReportesPanel from '@/components/admin/ReportesPanel'
import UsuariosPanel from '@/components/admin/UsuariosPanel'

type User = { id: string; name: string; phone: string; role: string }

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [active, setActive] = useState('colportores')

  useEffect(() => {
    const stored = sessionStorage.getItem('user')
    if (!stored) { router.push('/'); return }
    const parsed = JSON.parse(stored)
    if (parsed.role !== 'admin') { router.push('/'); return }
    setUser(parsed)
  }, [])

  function handleLogout() {
    sessionStorage.removeItem('user')
    router.push('/')
  }

  const navItems = [
    {
      key: 'colportores', label: 'Colportores', group: 'Gestión',
      icon: <svg viewBox="0 0 18 18" fill="none" width="18" height="18"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M1 16c0-3.314 2.686-6 6-6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="13" cy="13" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
    },
    {
      key: 'campos', label: 'Campos', group: 'Gestión',
      icon: <svg viewBox="0 0 18 18" fill="none" width="18" height="18"><rect x="2" y="4" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6 4V2M12 4V2M2 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    },
    {
      key: 'siembra', label: 'Siembra', group: 'Gestión',
      icon: <svg viewBox="0 0 18 18" fill="none" width="18" height="18"><path d="M9 2v14M4 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    },
    {
      key: 'reportes', label: 'Reportes', group: 'Sistema',
      icon: <svg viewBox="0 0 18 18" fill="none" width="18" height="18"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" /></svg>
    },
    {
      key: 'usuarios', label: 'Usuarios', group: 'Sistema',
      icon: <svg viewBox="0 0 18 18" fill="none" width="18" height="18"><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M3 16c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    },
  ]

  const gestion = navItems.filter(n => n.group === 'Gestión')
  const sistema = navItems.filter(n => n.group === 'Sistema')

  if (!user) return null

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F0F4FA; }
.dash { font-family: 'DM Sans', sans-serif; display: flex; height: 100vh; background: #F0F4FA; overflow: hidden; }

.sidebar { width: 220px; background: #0D1F45; display: flex; flex-direction: column; flex-shrink: 0; position: relative; overflow: hidden; transition: width 0.3s; }
.sidebar-deco { position: absolute; width: 180px; height: 180px; border-radius: 50%; border: 40px solid rgba(245,166,35,0.07); bottom: -60px; left: -60px; pointer-events: none; }
.sidebar-logo { padding: 1.4rem 1.2rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); }
.logo-row { display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 36px; height: 36px; border-radius: 9px; background: #F5A623; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.logo-name { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800; color: #fff; }
.logo-name span { color: #F5A623; }

.nav-section { padding: 1rem 0.8rem; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.nav-label { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; text-transform: uppercase; padding: 0 0.6rem; margin-bottom: 0.5rem; display: block; flex-shrink: 0; }
.nav-label-sistema { margin-top: 1.2rem; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 9px; cursor: pointer; transition: all 0.18s; margin-bottom: 2px; color: rgba(255,255,255,0.55); border: none; background: none; width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; flex-shrink: 0; }
.nav-item:hover { background: rgba(255,255,255,0.07); }
.nav-item.active { background: rgba(245,166,35,0.15); border-left: 3px solid #F5A623; border-radius: 0 9px 9px 0; padding-left: 9px; color: #F5A623; }
.nav-text { font-size: 13px; font-weight: 500; }

.sidebar-footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.07); }
.user-row { display: flex; align-items: center; gap: 9px; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1A3A6B; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #F5A623; flex-shrink: 0; }
.user-name { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
.user-role-badge { font-size: 10px; color: rgba(255,255,255,0.3); }
.logout-btn { margin-left: auto; background: none; border: none; cursor: pointer; opacity: 0.4; transition: opacity 0.2s; flex-shrink: 0; }
.logout-btn:hover { opacity: 1; }

.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

@media (max-width: 768px) {
  .dash { flex-direction: column; height: auto; min-height: 100vh; }
  .sidebar { width: 100%; height: auto; }
  .sidebar-deco { display: none; }
  .nav-section { flex-direction: row; padding: 0.5rem; overflow-x: auto; overflow-y: hidden; gap: 4px; align-items: center; flex-wrap: nowrap; }
  .nav-label { display: none; }
  .nav-label-sistema { display: none; margin-top: 0; }
  .nav-item { border-radius: 8px; padding: 7px 10px; white-space: nowrap; margin-bottom: 0; }
  .nav-item.active { border-left: none; border-bottom: 3px solid #F5A623; border-radius: 8px 8px 0 0; padding-left: 10px; }
  .sidebar-logo { padding: 1rem 1.2rem 0.8rem; }
  .main { overflow: visible; }
}
      `}</style>

      <div className="dash">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-deco" />
          <div className="sidebar-logo">
            <div className="logo-row">
              <div className="logo-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L10 18M4 10L16 10" stroke="#0D1F45" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="10" cy="10" r="4" stroke="#0D1F45" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="logo-name">CEPEV</div>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Gestión</div>
            {gestion.map(item => (
              <button
                key={item.key}
                className={`nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </button>
            ))}
            <div className="nav-label" style={{ marginTop: '1rem' }}>Sistema</div>
            {sistema.map(item => (
              <button
                key={item.key}
                className={`nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-row">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-role-badge">Administrador</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          {active === 'colportores' && <ColportoresPanel user={user} />}
          {active === 'campos' && <CamposPanel user={user} />}
          {active === 'siembra' && <SiembraPanel user={user} />}
          {active === 'reportes' && <ReportesPanel user={user} />}
          {active === 'usuarios' && <UsuariosPanel user={user} />}
        </div>
      </div>
    </>
  )
}