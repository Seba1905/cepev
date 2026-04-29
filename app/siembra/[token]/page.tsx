'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Colportor = {
  id: string
  nombre: string
  numero_documento: string
}

type Enlace = {
  id: string
  token: string
  fecha: string
  expira_at: string
}

type Estado = 'validando' | 'expirado' | 'documento' | 'formulario' | 'enviado'

export default function SiembraPublica() {
  const params = useParams()
  const token = params.token as string

  const [estado, setEstado] = useState<Estado>('validando')
  const [enlace, setEnlace] = useState<Enlace | null>(null)
  const [documento, setDocumento] = useState('')
  const [colportor, setColportor] = useState<Colportor | null>(null)
  const [errorDoc, setErrorDoc] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [kits, setKits] = useState('')
  const [ivpt, setIvpt] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [yaRegistro, setYaRegistro] = useState(false)
  const [registroExistente, setRegistroExistente] = useState<any>(null)

  useEffect(() => { validarToken() }, [])

  async function validarToken() {
    const { data } = await supabase
      .from('enlaces_siembra')
      .select('*')
      .eq('token', token)
      .single()

    if (!data) { setEstado('expirado'); return }

    const ahora = new Date()
    const expira = new Date(data.expira_at)
    if (ahora > expira) { setEstado('expirado'); return }

    setEnlace(data)
    setEstado('documento')
  }

  async function handleBuscarDocumento() {
    if (!documento.trim()) return
    setBuscando(true)
    setErrorDoc('')

    const { data } = await supabase
      .from('colportores')
      .select('id, nombre, numero_documento')
      .eq('numero_documento', documento.trim())
      .single()

    if (!data) {
      setErrorDoc('No encontramos un colportor con ese número de documento. Por favor comunícate con el área encargada del CEPEV.')
      setBuscando(false)
      return
    }

    // Verificar si ya tiene registro ese día
    const { data: regExistente } = await supabase
      .from('siembra')
      .select('id, kits_vendidos, seguidores_ivpt')
      .eq('colportor_id', data.id)
      .eq('fecha', enlace!.fecha)
      .maybeSingle()

    setColportor(data)
    if (regExistente) {
      setYaRegistro(true)
      setRegistroExistente(regExistente)
      setKits(String(regExistente.kits_vendidos))
      setIvpt(String(regExistente.seguidores_ivpt))
    }
    setBuscando(false)
    setEstado('formulario')
  }

  async function handleGuardar() {
    if (!colportor || !enlace) return
    setGuardando(true)

    const { data: campoActivo } = await supabase
      .from('campo_colportores')
      .select('campo_id')
      .eq('colportor_id', colportor.id)
      .eq('estado', 'activo')
      .maybeSingle()

    if (yaRegistro && registroExistente) {
      await supabase.from('siembra').update({
        kits_vendidos: parseInt(kits) || 0,
        seguidores_ivpt: parseInt(ivpt) || 0
      }).eq('id', registroExistente.id)
    } else {
      await supabase.from('siembra').insert({
        colportor_id: colportor.id,
        campo_id: campoActivo?.campo_id || null,
        fecha: enlace.fecha,
        kits_vendidos: parseInt(kits) || 0,
        seguidores_ivpt: parseInt(ivpt) || 0
      })
    }

    setGuardando(false)
    setEstado('enviado')
  }

  function formatFecha(f: string) {
    return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D1F45; min-height: 100vh; }
        .sp-root { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #0D1F45; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; position: relative; overflow: hidden; }
        .sp-deco1 { position: fixed; width: 400px; height: 400px; border-radius: 50%; border: 70px solid rgba(245,166,35,0.05); top: -120px; left: -120px; pointer-events: none; }
        .sp-deco2 { position: fixed; width: 300px; height: 300px; border-radius: 50%; border: 50px solid rgba(43,91,168,0.08); bottom: -80px; right: -80px; pointer-events: none; }

        .sp-card { background: #fff; border-radius: 20px; width: 100%; max-width: 420px; overflow: hidden; position: relative; z-index: 1; }
        .sp-gold-bar { height: 4px; background: #F5A623; }
        .sp-head { padding: 1.8rem 1.8rem 1.2rem; }
        .sp-logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 1.4rem; }
        .sp-logo-icon { width: 38px; height: 38px; border-radius: 10px; background: #0D1F45; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sp-logo-name { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800; color: #0D1F45; }
        .sp-logo-name span { color: #F5A623; }
        .sp-title { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: #0D1F45; margin-bottom: 4px; }
        .sp-sub { font-size: 13px; color: #8A9CC0; line-height: 1.5; }
        .sp-fecha-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25); border-radius: 20px; padding: 4px 12px; margin-top: 10px; }
        .sp-fecha-badge span { font-size: 12px; color: #B8760A; font-weight: 600; text-transform: capitalize; }

        .sp-body { padding: 1.2rem 1.8rem 1.8rem; }
        .sp-field-label { font-size: 11px; font-weight: 700; color: #4A6080; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .sp-field-desc { font-size: 11px; color: #8A9CC0; margin-top: 4px; line-height: 1.5; }
        .sp-input { width: 100%; padding: 11px 14px; border: 1.5px solid #E4E8F0; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #0D1F45; background: #F7F9FD; outline: none; transition: border 0.2s; }
        .sp-input:focus { border-color: #1A3A6B; background: #fff; }
        .sp-input.error { border-color: #FCA5A5; background: #FEF2F2; }
        .sp-error { background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 10px; padding: 10px 14px; color: #991B1B; font-size: 13px; margin-top: 10px; line-height: 1.5; }

        .sp-btn { width: 100%; padding: 13px; border: none; border-radius: 10px; background: #0D1F45; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .sp-btn:hover { background: #1A3A6B; transform: translateY(-1px); }
        .sp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .sp-btn.gold { background: #F5A623; color: #0D1F45; }
        .sp-btn.gold:hover { background: #E09610; }

        .sp-bienvenido { background: rgba(16,185,129,0.06); border: 1.5px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 1.2rem; }
        .sp-bienvenido-nombre { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #065F46; }
        .sp-bienvenido-sub { font-size: 12px; color: #065F46; opacity: 0.7; margin-top: 2px; }

        .sp-ya-registro { background: rgba(245,166,35,0.08); border: 1.5px solid rgba(245,166,35,0.25); border-radius: 10px; padding: 8px 12px; margin-bottom: 1rem; font-size: 12px; color: #B8760A; font-weight: 600; }

        .sp-num-wrap { display: flex; align-items: center; border: 1.5px solid #E4E8F0; border-radius: 10px; overflow: hidden; background: #F7F9FD; }
        .sp-num-btn { width: 48px; height: 52px; border: none; background: #F0F3FA; cursor: pointer; font-size: 22px; color: #4A6080; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
        .sp-num-btn:hover { background: #E4E8F0; }
        .sp-num-input { flex: 1; border: none; background: transparent; font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700; color: #0D1F45; text-align: center; outline: none; padding: 10px 0; min-width: 0; }
        .sp-num-input::placeholder { color: #C0C8D8; font-weight: 400; font-size: 22px; }

        .sp-field-group { margin-bottom: 1.2rem; }
        .sp-divider { height: 1px; background: #F0F3FA; margin: 1rem 0; }

        /* Expirado / Enviado */
        .sp-center { text-align: center; padding: 0.5rem 0; }
        .sp-icon-big { font-size: 48px; margin-bottom: 1rem; }
        .sp-msg-title { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: #0D1F45; margin-bottom: 0.5rem; }
        .sp-msg-sub { font-size: 13px; color: #8A9CC0; line-height: 1.6; }
      `}</style>

      <div className="sp-root">
        <div className="sp-deco1" />
        <div className="sp-deco2" />

        <div className="sp-card">
          <div className="sp-gold-bar" />

          <div className="sp-head">
            <div className="sp-logo-row">
              <div className="sp-logo-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L11 20M4 11L18 11" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="11" cy="11" r="5" stroke="#F5A623" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="sp-logo-name">CEP<span>EV</span></div>
            </div>

            {estado === 'validando' && (
              <>
                <div className="sp-title">Verificando enlace...</div>
                <div className="sp-sub">Por favor espera un momento.</div>
              </>
            )}
            {estado === 'expirado' && (
              <div className="sp-center">
                <div className="sp-icon-big">⏰</div>
                <div className="sp-msg-title">Enlace expirado</div>
                <div className="sp-msg-sub">Este enlace ya no está disponible. Comunícate con el área encargada del CEPEV para obtener uno nuevo.</div>
              </div>
            )}
            {(estado === 'documento' || estado === 'formulario') && (
              <>
                <div className="sp-title">Registro de siembra</div>
                <div className="sp-sub">Ingresa tu número de documento para continuar.</div>
                {enlace && (
                  <div className="sp-fecha-badge">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#B8760A" strokeWidth="1.2"/>
                      <path d="M4 1v2M8 1v2M1 5h10" stroke="#B8760A" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span>{formatFecha(enlace.fecha)}</span>
                  </div>
                )}
              </>
            )}
            {estado === 'enviado' && (
              <div className="sp-center">
                <div className="sp-icon-big">🌱</div>
                <div className="sp-msg-title">¡Registro exitoso!</div>
                <div className="sp-msg-sub">
                  Tu siembra del día {enlace && formatFecha(enlace.fecha)} ha sido registrada correctamente. ¡Sigue sembrando!
                </div>
              </div>
            )}
          </div>

          {/* Cuerpo según estado */}
          {estado === 'documento' && (
            <div className="sp-body">
              <div className="sp-field-group">
                <label className="sp-field-label">Número de documento</label>
                <input
                  className={`sp-input ${errorDoc ? 'error' : ''}`}
                  type="text"
                  placeholder="Ingresa tu número de documento"
                  value={documento}
                  onChange={e => { setDocumento(e.target.value); setErrorDoc('') }}
                  onKeyDown={e => e.key === 'Enter' && handleBuscarDocumento()}
                />
                {errorDoc && <div className="sp-error">{errorDoc}</div>}
              </div>
              <button className="sp-btn" onClick={handleBuscarDocumento} disabled={buscando || !documento.trim()}>
                {buscando ? 'Verificando...' : 'Continuar →'}
              </button>
            </div>
          )}

          {estado === 'formulario' && colportor && (
            <div className="sp-body">
              <div className="sp-bienvenido">
                <div className="sp-bienvenido-nombre">👋 Hola, {colportor.nombre.split(' ')[0]}</div>
                <div className="sp-bienvenido-sub">{colportor.nombre}</div>
              </div>

              {yaRegistro && (
                <div className="sp-ya-registro">
                  ✏️ Ya tienes un registro para este día. Puedes actualizar los valores.
                </div>
              )}

              <div className="sp-field-group">
                <label className="sp-field-label">Kits sembrados</label>
                <div className="sp-num-wrap">
                  <button className="sp-num-btn" onClick={() => setKits(s => String(Math.max(0, parseInt(s) || 0) - 1))}>−</button>
                  <input
                    className="sp-num-input"
                    type="text"
                    placeholder="0"
                    value={kits}
                    onChange={e => setKits(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button className="sp-num-btn" onClick={() => setKits(s => String((parseInt(s) || 0) + 1))}>+</button>
                </div>
                <div className="sp-field-desc">Número de kits de libros sembrados hoy</div>
              </div>

              <div className="sp-divider" />

              <div className="sp-field-group">
                <label className="sp-field-label">Seguidores IVPT</label>
                <div className="sp-num-wrap">
                  <button className="sp-num-btn" onClick={() => setIvpt(s => String(Math.max(0, parseInt(s) || 0) - 1))}>−</button>
                  <input
                    className="sp-num-input"
                    type="text"
                    placeholder="0"
                    value={ivpt}
                    onChange={e => setIvpt(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button className="sp-num-btn" onClick={() => setIvpt(s => String((parseInt(s) || 0) + 1))}>+</button>
                </div>
                <div className="sp-field-desc">Personas que siguieron la página de Instagram del IVPT</div>
              </div>

              <button className="sp-btn gold" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : yaRegistro ? 'Actualizar registro' : 'Enviar registro'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}