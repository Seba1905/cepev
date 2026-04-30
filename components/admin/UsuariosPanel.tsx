'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type User = { id: string; name: string; phone: string; role: string }

type Viewer = {
  id: string
  name: string
  phone: string
  created_at: string
}

const EMPTY = { name: '', phone: '', password: '' }

export default function UsuariosPanel({ user }: { user: User }) {
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Viewer | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchViewers() }, [])

  async function fetchViewers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, phone, created_at')
      .eq('role', 'viewer')
      .order('created_at', { ascending: false })
    setViewers(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowPassword(false)
    setModal(true)
  }

  function openEdit(v: Viewer) {
    setEditing(v)
    setForm({ name: v.name, phone: v.phone, password: '' })
    setError('')
    setShowPassword(false)
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('El nombre y teléfono son obligatorios.')
      return
    }
    if (!editing && !form.password.trim()) {
      setError('La contraseña es obligatoria para nuevos usuarios.')
      return
    }
    setSaving(true)
    setError('')

    if (editing) {
      const updates: any = { name: form.name, phone: form.phone }
      if (form.password.trim()) updates.password = form.password
      const { error: err } = await supabase
        .from('users')
        .update(updates)
        .eq('id', editing.id)
      if (err) { setError('Error al actualizar. Verifica que el teléfono no esté en uso.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('users')
        .insert({ name: form.name, phone: form.phone, password: form.password, role: 'viewer' })
      if (err) { setError('Error al crear. Verifica que el teléfono no esté en uso.'); setSaving(false); return }
    }

    setSaving(false)
    setModal(false)
    fetchViewers()
  }

  async function handleDelete(id: string) {
    await supabase.from('users').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchViewers()
  }

  function formatFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const filtered = viewers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.includes(search)
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        .uv-wrap { display: flex; flex-direction: column; height: 100%; font-family: 'DM Sans', sans-serif; }
        .uv-topbar { background: #fff; border-bottom: 1.5px solid #E4E8F0; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; flex-wrap: wrap; gap: 0.8rem; }
        .uv-topbar-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .uv-topbar-sub { font-size: 12px; color: #8A9CC0; margin-top: 1px; }
        .uv-add-btn { display: flex; align-items: center; gap: 6px; background: #F5A623; color: #0D1F45; border: none; border-radius: 9px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .uv-add-btn:hover { opacity: 0.88; }

        .uv-content { flex: 1; padding: 1.2rem 1.5rem; overflow-y: auto; }

        .uv-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 1.2rem; max-width: 400px; }
        .uv-stat { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 0; padding: 1rem; }
        .uv-stat-label { font-size: 11px; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .uv-stat-num { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: #0D1F45; }
        .uv-stat-sub { font-size: 11px; color: #8A9CC0; margin-top: 3px; }

        .uv-search-wrap { position: relative; margin-bottom: 1rem; }
        .uv-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .uv-search { width: 100%; padding: 9px 12px 9px 34px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0D1F45; background: #fff; outline: none; transition: border 0.2s; box-sizing: border-box; }
        .uv-search:focus { border-color: #1A3A6B; }

        .uv-table { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; overflow: hidden; }
        .uv-thead { display: grid; grid-template-columns: 2fr 1fr 1fr 80px; padding: 10px 16px; background: #F7F9FD; border-bottom: 1.5px solid #E4E8F0; }
        .uv-th { font-size: 11px; font-weight: 700; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.05em; }
        .uv-row { display: grid; grid-template-columns: 2fr 1fr 1fr 80px; padding: 12px 16px; border-bottom: 1px solid #F0F3FA; align-items: center; transition: background 0.15s; }
        .uv-row:last-child { border-bottom: none; }
        .uv-row:hover { background: #FAFBFF; }
        .uv-nombre { font-weight: 600; font-size: 13px; color: #0D1F45; }
        .uv-phone { font-size: 13px; color: #8A9CC0; }
        .uv-fecha { font-size: 12px; color: #8A9CC0; }
        .b-viewer { display: inline-block; background: rgba(43,91,168,0.08); color: #1A3A6B; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }

        .act-btns { display: flex; gap: 6px; }
        .act-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #E4E8F0; background: #F7F9FD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .act-btn:hover { border-color: #8A9CC0; }
        .act-btn.danger:hover { border-color: #FCA5A5; background: #FEF2F2; }

        .empty { text-align: center; padding: 2.5rem; color: #8A9CC0; font-size: 13px; }

        .overlay { position: fixed; inset: 0; background: rgba(13,31,69,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .uv-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; overflow: hidden; }
        .uv-modal-head { padding: 1.2rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: center; justify-content: space-between; }
        .uv-modal-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .uv-modal-close { background: none; border: none; cursor: pointer; color: #8A9CC0; font-size: 22px; line-height: 1; }
        .uv-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .field-label { font-size: 11px; font-weight: 700; color: #4A6080; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .field-desc { font-size: 11px; color: #8A9CC0; margin-top: 4px; }
        .field-input { width: 100%; padding: 10px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0D1F45; background: #F7F9FD; outline: none; transition: border 0.2s; box-sizing: border-box; }
        .field-input:focus { border-color: #1A3A6B; background: #fff; }
        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-right: 40px; }
        .toggle-pass { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8A9CC0; display: flex; align-items: center; }
        .error-msg { background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 9px; padding: 9px 12px; color: #991B1B; font-size: 13px; }
        .uv-modal-foot { padding: 1rem 1.5rem; border-top: 1.5px solid #E4E8F0; display: flex; justify-content: flex-end; gap: 10px; }
        .btn-cancel { padding: 9px 18px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #4A6080; cursor: pointer; }
        .btn-save { padding: 9px 20px; border: none; border-radius: 9px; background: #0D1F45; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s; }
        .btn-save:hover { background: #1A3A6B; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .confirm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 360px; padding: 1.5rem; text-align: center; }
        .confirm-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; margin-bottom: 0.5rem; }
        .confirm-sub { font-size: 13px; color: #8A9CC0; margin-bottom: 1.5rem; line-height: 1.6; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
        .btn-danger { padding: 9px 20px; border: none; border-radius: 9px; background: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }

        @media (max-width: 768px) {
          .uv-thead { grid-template-columns: 2fr 1fr 70px; }
          .uv-row { grid-template-columns: 2fr 1fr 70px; }
          .uv-content { padding: 1rem; }
        }
      `}</style>

      <div className="uv-wrap">
        <div className="uv-topbar">
          <div>
            <div className="uv-topbar-title">Usuarios</div>
            <div className="uv-topbar-sub">{viewers.length} visualizadores registrados</div>
          </div>
          <button className="uv-add-btn" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="#0D1F45" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nuevo usuario
          </button>
        </div>

        <div className="uv-content">
          <div className="uv-stats">
            <div className="uv-stat">
              <div className="uv-stat-label">Total</div>
              <div className="uv-stat-num">{viewers.length}</div>
              <div className="uv-stat-sub">Visualizadores</div>
            </div>
            <div className="uv-stat">
              <div className="uv-stat-label">Último registro</div>
              <div className="uv-stat-num" style={{ fontSize: 14, marginTop: 4 }}>
                {viewers.length > 0 ? formatFecha(viewers[0].created_at) : '—'}
              </div>
              <div className="uv-stat-sub">Fecha de creación</div>
            </div>
          </div>

          <div className="uv-search-wrap">
            <span className="uv-search-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="#8A9CC0" strokeWidth="1.4"/>
                <path d="M10 10l2.5 2.5" stroke="#8A9CC0" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="uv-search"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty">Cargando...</div>
          ) : (
            <div className="uv-table">
              <div className="uv-thead">
                {['Nombre', 'Teléfono', 'Registrado', ''].map(h => (
                  <span key={h} className="uv-th">{h}</span>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div className="empty">
                  {search ? 'Sin resultados' : 'No hay visualizadores registrados'}
                </div>
              ) : filtered.map(v => (
                <div key={v.id} className="uv-row">
                  <div>
                    <div className="uv-nombre">{v.name}</div>
                    <span className="b-viewer">Visualizador</span>
                  </div>
                  <div className="uv-phone">{v.phone}</div>
                  <div className="uv-fecha">{formatFecha(v.created_at)}</div>
                  <div className="act-btns">
                    <button className="act-btn" onClick={() => openEdit(v)} title="Editar">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="#8A9CC0" strokeWidth="1.2"/>
                      </svg>
                    </button>
                    <button className="act-btn danger" onClick={() => setDeleteConfirm(v.id)} title="Eliminar">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 3h8M4 3V2h4v1M3 3l.5 7h5l.5-7" stroke="#8A9CC0" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="uv-modal" onClick={e => e.stopPropagation()}>
            <div className="uv-modal-head">
              <span className="uv-modal-title">{editing ? 'Editar usuario' : 'Nuevo usuario'}</span>
              <button className="uv-modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="uv-modal-body">
              <div>
                <label className="field-label">Nombre completo</label>
                <input
                  className="field-input"
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Teléfono</label>
                <input
                  className="field-input"
                  placeholder="Número de teléfono"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">
                  Contraseña {editing && <span style={{ color: '#8A9CC0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(dejar vacío para no cambiar)</span>}
                </label>
                <div className="password-wrap">
                  <input
                    className="field-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                  <button className="toggle-pass" onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="#8A9CC0" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="#8A9CC0" strokeWidth="1.3"/>
                        <path d="M2 2l12 12" stroke="#8A9CC0" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="#8A9CC0" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="#8A9CC0" strokeWidth="1.3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="field-desc">El usuario usará su teléfono y esta contraseña para ingresar</div>
              </div>
              {error && <div className="error-msg">{error}</div>}
            </div>
            <div className="uv-modal-foot">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {deleteConfirm && (
        <div className="overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">¿Eliminar usuario?</div>
            <div className="confirm-sub">
              Este usuario perderá acceso al sistema inmediatamente. Esta acción no se puede deshacer.
            </div>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}