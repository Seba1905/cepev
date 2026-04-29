'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'viewer'>('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .eq('phone', phone)
      .eq('password', password)
      .eq('role', role)
      .single()

    if (error || !data) {
      setError('Credenciales incorrectas. Verifique e intente de nuevo.')
      setLoading(false)
      return
    }

    sessionStorage.setItem('user', JSON.stringify(data))
    router.push(`/dashboard/${role}`)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D1F45; }

        .root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          flex-direction: row;
          background: #0D1F45;
          position: relative;
          overflow: hidden;
        }

        /* — Decoraciones — */
        .deco-circle {
          position: absolute; width: 420px; height: 420px;
          border-radius: 50%; border: 70px solid rgba(245,166,35,0.07);
          top: -100px; left: -100px; pointer-events: none;
        }
        .deco-circle2 {
          position: absolute; width: 240px; height: 240px;
          border-radius: 50%; border: 50px solid rgba(43,91,168,0.12);
          bottom: -60px; left: 260px; pointer-events: none;
        }

        /* — Panel izquierdo — */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 3rem;
          position: relative;
          z-index: 2;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(245,166,35,0.15);
          border: 1px solid rgba(245,166,35,0.3);
          border-radius: 20px; padding: 5px 14px;
          margin-bottom: 1.6rem; width: fit-content;
        }
        .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #F5A623; }
        .badge span { font-size: 11px; color: #F5A623; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
        .brand-title {
          font-family: 'Sora', sans-serif;
          font-size: clamp(42px, 6vw, 64px);
          font-weight: 800; color: #fff; line-height: 1;
          margin-bottom: 0.4rem;
        }
        .brand-title span { color: #F5A623; }
        .brand-sub {
          font-size: 12px; color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 1.6rem;
        }
        .brand-desc {
          font-size: 15px; color: rgba(255,255,255,0.55);
          line-height: 1.75; max-width: 300px;
        }
        .stat-row { display: flex; gap: 2rem; margin-top: 3rem; flex-wrap: wrap; }
        .stat-num {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 700; color: #fff;
        }
        .stat-label {
          font-size: 11px; color: rgba(255,255,255,0.35);
          text-transform: uppercase; letter-spacing: 0.06em;
          margin-top: 2px;
        }

        /* — Panel derecho (formulario) — */
        .right-panel {
          width: 380px;
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 2.5rem;
          position: relative;
          flex-shrink: 0;
        }
        .right-panel::before {
          content: ''; position: absolute;
          top: 0; left: 0;
          width: 4px; height: 100%;
          background: #F5A623;
        }
        .form-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #0D1F45; margin-bottom: 0.3rem;
        }
        .form-sub { font-size: 13px; color: #8A9CC0; margin-bottom: 2rem; }

        .field-label {
          font-size: 11px; font-weight: 700; color: #4A6080;
          letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 6px; display: block;
        }
        .field-group { margin-bottom: 1.1rem; }
        .field-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #E4E8F0; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: #0D1F45; background: #F7F9FD;
          outline: none; transition: all 0.2s;
        }
        .field-input:focus {
          border-color: #1A3A6B; background: #fff;
          box-shadow: 0 0 0 3px rgba(26,58,107,0.08);
        }

        .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .role-btn {
          padding: 10px 8px; border: 1.5px solid #E4E8F0;
          border-radius: 9px; background: #F7F9FD; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          font-weight: 600; color: #8A9CC0; transition: all 0.18s;
        }
        .role-btn.active {
          border-color: #1A3A6B; background: #EBF0FC; color: #1A3A6B;
        }

        .divider-line { height: 1px; background: #F0F3FA; margin: 1.4rem 0; }

        .error-msg {
          background: #FEF2F2; border: 1.5px solid #FECACA;
          border-radius: 10px; padding: 10px 14px;
          color: #991B1B; font-size: 13px; margin-bottom: 1rem;
        }

        .submit-btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          background: #0D1F45; color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover { background: #1A3A6B; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* — Responsive — */
        @media (max-width: 768px) {
          .root { flex-direction: column; }

          .left-panel {
            padding: 2.5rem 1.5rem 2rem;
            align-items: center; text-align: center;
          }
          .badge { margin-left: auto; margin-right: auto; }
          .brand-desc { max-width: 100%; }
          .stat-row { justify-content: center; gap: 1.5rem; margin-top: 2rem; }

          .deco-circle { width: 260px; height: 260px; top: -60px; left: -60px; }
          .deco-circle2 { display: none; }

          .right-panel {
            width: 100%;
            padding: 2rem 1.5rem 2.5rem;
            border-radius: 28px 28px 0 0;
            margin-top: -24px;
          }
          .right-panel::before {
            width: 100%; height: 4px;
            top: 0; left: 0;
          }
        }
      `}</style>

      <div className="root">
        <div className="deco-circle" />
        <div className="deco-circle2" />

        {/* Panel izquierdo */}
        <div className="left-panel">
          <div className="badge">
            <div className="badge-dot" />
            <span>Sistema Activo</span>
          </div>
          <div className="brand-title">CEP<span>EV</span></div>
          <div className="brand-sub">Centro de Perfeccionamiento de Líderes y Colportores</div>
          <div className="brand-desc">
            Gestión integral de colportores, campos de misión y registro de siembra diaria.
          </div>
          <div className="stat-row">
            <div>
              <div className="stat-num">Campos</div>
              <div className="stat-label">Misiones</div>
            </div>
            <div>
              <div className="stat-num">Siembra</div>
              <div className="stat-label">Diaria</div>
            </div>
            <div>
              <div className="stat-num">Reportes</div>
              <div className="stat-label">En tiempo real</div>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="right-panel">
          <div className="form-title">Bienvenido</div>
          <div className="form-sub">Ingrese sus credenciales para continuar</div>

          <div className="field-group">
            <label className="field-label">Teléfono</label>
            <input
              className="field-input"
              type="text"
              placeholder="Número de teléfono"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Contraseña</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Acceso como</label>
            <div className="role-grid">
              <button
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
              >Administrador</button>
              <button
                className={`role-btn ${role === 'viewer' ? 'active' : ''}`}
                onClick={() => setRole('viewer')}
              >Visualizador</button>
            </div>
          </div>

          <div className="divider-line" />

          {error && <div className="error-msg">{error}</div>}

          <button className="submit-btn" onClick={handleLogin} disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'} {!loading && '→'}
          </button>
        </div>
      </div>
    </>
  )
}