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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
  const activeItem = navItems.find(n => n.key === active)

  if (!user) return null

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F0F4FA; }
.dash { font-family: 'DM Sans', sans-serif; display: flex; height: 100vh; background: #F0F4FA; overflow: hidden; }

/* ── SIDEBAR (desktop) ── */
.sidebar { width: 220px; background: #0D1F45; display: flex; flex-direction: column; flex-shrink: 0; position: relative; overflow: hidden; }
.sidebar-deco { position: absolute; width: 180px; height: 180px; border-radius: 50%; border: 40px solid rgba(245,166,35,0.07); bottom: -60px; left: -60px; pointer-events: none; }

.sidebar-logo { padding: 1.4rem 1.2rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); }
.logo-row { display: flex; align-items: center; gap: 10px; }
.logo-name { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; color: #fff; }

.nav-section { padding: 1rem 0.8rem; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.nav-label { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; text-transform: uppercase; padding: 0 0.6rem; margin-bottom: 0.5rem; display: block; flex-shrink: 0; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 9px; cursor: pointer; transition: all 0.18s; margin-bottom: 2px; color: rgba(255,255,255,0.55); border: none; background: none; width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; flex-shrink: 0; }
.nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
.nav-item.active { background: rgba(245,166,35,0.15); border-left: 3px solid #F5A623; border-radius: 0 9px 9px 0; padding-left: 9px; color: #F5A623; }
.nav-text { font-size: 13px; font-weight: 500; }

.sidebar-footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.07); }
.user-row { display: flex; align-items: center; gap: 9px; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1A3A6B; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #F5A623; flex-shrink: 0; }
.user-name { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
.user-role-badge { font-size: 10px; color: rgba(255,255,255,0.3); }
.logout-btn { margin-left: auto; background: none; border: none; cursor: pointer; opacity: 0.4; transition: opacity 0.2s; flex-shrink: 0; }
.logout-btn:hover { opacity: 1; }

/* ── MAIN ── */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* ── MOBILE TOP BAR ── */
.mobile-topbar {
  display: none;
  background: #0D1F45;
  padding: 0.75rem 1rem;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2px 12px rgba(13,31,69,0.25);
}
.mobile-topbar-left { display: flex; align-items: center; gap: 10px; }
.mobile-topbar-title { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700; color: #fff; }
.mobile-topbar-section { font-size: 11px; color: #F5A623; font-weight: 500; margin-top: 1px; }
.mobile-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1A3A6B; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #F5A623; cursor: pointer; border: 2px solid rgba(245,166,35,0.4); }

/* ── USER DRAWER (mobile) ── */
.mobile-drawer-overlay {
  display: none;
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100;
  opacity: 0; transition: opacity 0.25s;
}
.mobile-drawer-overlay.open { opacity: 1; }
.mobile-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 260px;
  background: #0D1F45; z-index: 101;
  transform: translateX(100%); transition: transform 0.28s cubic-bezier(0.32,0,0,1);
  display: flex; flex-direction: column; padding: 1.5rem 1.2rem;
  box-shadow: -4px 0 24px rgba(0,0,0,0.3);
}
.mobile-drawer.open { transform: translateX(0); }
.drawer-close { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); align-self: flex-end; margin-bottom: 1.5rem; padding: 4px; }
.drawer-close:hover { color: #fff; }
.drawer-user-block { display: flex; align-items: center; gap: 12px; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; }
.drawer-avatar { width: 44px; height: 44px; border-radius: 50%; background: #1A3A6B; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #F5A623; border: 2px solid rgba(245,166,35,0.3); }
.drawer-name { font-size: 14px; font-weight: 600; color: #fff; }
.drawer-role { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px; }
.drawer-logout {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 9px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  width: 100%; transition: all 0.18s;
}
.drawer-logout:hover { background: rgba(220,60,60,0.15); border-color: rgba(220,60,60,0.3); color: #ff7070; }

/* ── BOTTOM NAV (mobile) ── */
.bottom-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #0D1F45;
  z-index: 50;
  padding: 0 0.5rem;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -2px 16px rgba(13,31,69,0.35);
  border-top: 1px solid rgba(255,255,255,0.07);
}
.bottom-nav-inner {
  display: flex; align-items: stretch; justify-content: space-around;
  height: 60px;
}
.bottom-nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; flex: 1; cursor: pointer; border: none; background: none;
  color: rgba(255,255,255,0.4); transition: all 0.18s;
  font-family: 'DM Sans', sans-serif; padding: 0 4px;
  position: relative;
}
.bottom-nav-item.active { color: #F5A623; }
.bottom-nav-item.active::before {
  content: '';
  position: absolute; top: 0; left: 20%; right: 20%; height: 2px;
  background: #F5A623; border-radius: 0 0 3px 3px;
}
.bottom-nav-label { font-size: 10px; font-weight: 500; line-height: 1; }
.bottom-nav-icon { flex-shrink: 0; }

/* Mobile content padding */
.mobile-content-wrapper { flex: 1; overflow: auto; }

/* ── BREAKPOINT ── */
@media (max-width: 768px) {
  .dash { flex-direction: column; height: 100dvh; overflow: hidden; }
  .sidebar { display: none; }
  .mobile-topbar { display: flex; }
  .bottom-nav { display: flex; flex-direction: column; }
  .mobile-drawer-overlay { display: block; pointer-events: none; }
  .mobile-drawer-overlay.open { pointer-events: auto; }
  .main { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding-bottom: 60px; }
  .mobile-content-wrapper { flex: 1; overflow-y: auto; }
}
      `}</style>

      <div className="dash">

        {/* ── SIDEBAR (desktop) ── */}
        <div className="sidebar">
          <div className="sidebar-deco" />
          <div className="sidebar-logo">
            <div className="logo-row">
              <div style={{ flexShrink: 0 }}>
                <img src="/logos/logo.png" alt="Logo" style={{ width: '55px', height: 'auto', display: 'block' }} />
              </div>
              <div className="logo-name">CEPEV</div>
            </div>
          </div>

          <div className="nav-section">
            <span className="nav-label">Gestión</span>
            {gestion.map(item => (
              <button key={item.key} className={`nav-item ${active === item.key ? 'active' : ''}`} onClick={() => setActive(item.key)}>
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </button>
            ))}
            <span className="nav-label" style={{ marginTop: '1rem' }}>Sistema</span>
            {sistema.map(item => (
              <button key={item.key} className={`nav-item ${active === item.key ? 'active' : ''}`} onClick={() => setActive(item.key)}>
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-row">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
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

        {/* ── MOBILE TOP BAR ── */}
        <div className="mobile-topbar">
          <div className="mobile-topbar-left">
            <img src="/logos/logo.png" alt="Logo" style={{ width: '32px', height: 'auto' }} />
            <div>
              <div className="mobile-topbar-title">CEPEV</div>
              <div className="mobile-topbar-section">{activeItem?.label}</div>
            </div>
          </div>
          <div className="mobile-avatar" onClick={() => setMobileMenuOpen(true)}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── USER DRAWER (mobile) ── */}
        <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <button className="drawer-close" onClick={() => setMobileMenuOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="drawer-user-block">
            <div className="drawer-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="drawer-name">{user.name}</div>
              <div className="drawer-role">Administrador</div>
            </div>
          </div>
          <button className="drawer-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          <div className="mobile-content-wrapper">
            {active === 'colportores' && <ColportoresPanel user={user} />}
            {active === 'campos' && <CamposPanel user={user} />}
            {active === 'siembra' && <SiembraPanel user={user} />}
            {active === 'reportes' && <ReportesPanel user={user} />}
            {active === 'usuarios' && <UsuariosPanel user={user} />}
          </div>
        </div>

        {/* ── BOTTOM NAV (mobile) ── */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {navItems.map(item => (
              <button
                key={item.key}
                className={`bottom-nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </>
  )
}