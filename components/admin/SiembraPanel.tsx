"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type User = { id: string; name: string; phone: string; role: string };

type Colportor = {
  id: string;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  categoria: string;
  ubicacion_actual: string | null;
};

type SiembraRegistro = {
  id: string;
  colportor_id: string;
  fecha: string;
  kits_vendidos: number;
  seguidores_ivpt: number;
};

export default function SiembraPanel({ user }: { user: User }) {
  const [colportores, setColportores] = useState<Colportor[]>([]);
  const [siembra, setSiembra] = useState<SiembraRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Colportor | null>(null);
  const [form, setForm] = useState<{
    kits_vendidos: string;
    seguidores_ivpt: string;
  }>({
    kits_vendidos: "",
    seguidores_ivpt: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [modalEnlace, setModalEnlace] = useState(false);
  const [enlaceFecha, setEnlaceFecha] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [enlaceExpiracion, setEnlaceExpiracion] = useState("6");
  const [enlaceGenerado, setEnlaceGenerado] = useState("");
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    fetchSiembra();
  }, [fecha]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: cols }, { data: siem }] = await Promise.all([
      supabase
        .from("colportores")
        .select(
          "id, nombre, tipo_documento, numero_documento, categoria, ubicacion_actual",
        )
        .order("nombre"),
      supabase
        .from("siembra")
        .select("id, colportor_id, fecha, kits_vendidos, seguidores_ivpt")
        .eq("fecha", fecha),
    ]);
    setColportores((cols || []).map((c) => ({
      ...c,
      ubicacion_actual: c.ubicacion_actual ?? (c.categoria === "PAC" ? "PAC" : "CEPEV"),
    })));
    setSiembra(siem || []);
    setLoading(false);
  }

  async function fetchSiembra() {
    const { data } = await supabase
      .from("siembra")
      .select("id, colportor_id, fecha, kits_vendidos, seguidores_ivpt")
      .eq("fecha", fecha);
    setSiembra(data || []);
  }

  function getRegistro(colportorId: string) {
    return siembra.find((s) => s.colportor_id === colportorId) || null;
  }

  function openModal(c: Colportor) {
    const reg = getRegistro(c.id);
    setEditando(c);
    setForm({
      kits_vendidos: reg?.kits_vendidos ? String(reg.kits_vendidos) : "",
      seguidores_ivpt: reg?.seguidores_ivpt ? String(reg.seguidores_ivpt) : "",
    });
    setModal(true);
  }

  async function handleSave() {
    if (!editando) return;
    setSaving(true);
    const reg = getRegistro(editando.id);

    const { data: campoActivo } = await supabase
      .from("campo_colportores")
      .select("campo_id")
      .eq("colportor_id", editando.id)
      .eq("estado", "activo")
      .maybeSingle();

    if (reg) {
      await supabase
        .from("siembra")
        .update({
          kits_vendidos: parseInt(form.kits_vendidos) || 0,
          seguidores_ivpt: parseInt(form.seguidores_ivpt) || 0,
        })
        .eq("id", reg.id);
    } else {
      await supabase.from("siembra").insert({
        colportor_id: editando.id,
        campo_id: campoActivo?.campo_id || null,
        fecha,
        kits_vendidos: parseInt(form.kits_vendidos) || 0,
        seguidores_ivpt: parseInt(form.seguidores_ivpt) || 0,
      });
    }
    setSaving(false);
    setModal(false);
    fetchSiembra();
  }

  async function handleDelete(id: string) {
    await supabase.from("siembra").delete().eq("id", id);
    setDeleteConfirm(null);
    fetchSiembra();
  }

  async function handleGenerarEnlace() {
    setGenerandoEnlace(true);
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expira = new Date();
    expira.setHours(expira.getHours() + parseInt(enlaceExpiracion));

    await supabase.from("enlaces_siembra").insert({
      token,
      fecha: enlaceFecha,
      expira_at: expira.toISOString(),
      creado_por: user.id,
    });

    const url = `${window.location.origin}/siembra/${token}`;
    setEnlaceGenerado(url);
    setGenerandoEnlace(false);
  }

  async function copiarEnlace() {
    await navigator.clipboard.writeText(enlaceGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const filtered = colportores.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const totalKits = siembra.reduce((a, s) => a + s.kits_vendidos, 0);
  const totalIVPT = siembra.reduce((a, s) => a + s.seguidores_ivpt, 0);
  const totalRegistros = siembra.length;

  function formatFecha(f: string) {
    return new Date(f + "T00:00:00").toLocaleDateString("es-CO", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        .sw-wrap { display: flex; flex-direction: column; height: 100%; font-family: 'DM Sans', sans-serif; }
        .sw-topbar { background: #fff; border-bottom: 1.5px solid #E4E8F0; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; flex-wrap: wrap; gap: 0.8rem; }
        .sw-topbar-left { display: flex; flex-direction: column; }
        .sw-topbar-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .sw-topbar-sub { font-size: 12px; color: #8A9CC0; margin-top: 1px; text-transform: capitalize; }
        .sw-fecha-wrap { display: flex; align-items: center; gap: 10px; }
        .sw-fecha-label { font-size: 12px; color: #4A6080; font-weight: 600; }
        .sw-fecha-input { padding: 7px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0D1F45; background: #F7F9FD; outline: none; transition: border 0.2s; }
        .sw-fecha-input:focus { border-color: #1A3A6B; background: #fff; }

        .sw-content { flex: 1; padding: 1.2rem 1.5rem; overflow-y: auto; }

        .sw-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.2rem; }
        .sw-stat { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 0; padding: 1rem; }
        .sw-stat.gold { border-color: rgba(245,166,35,0.3); background: rgba(245,166,35,0.06); }
        .sw-stat.blue { border-color: rgba(43,91,168,0.2); background: rgba(43,91,168,0.04); }
        .sw-stat-label { font-size: 11px; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .sw-stat.gold .sw-stat-label { color: #B8760A; }
        .sw-stat.blue .sw-stat-label { color: #1A3A6B; }
        .sw-stat-num { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: #0D1F45; }
        .sw-stat.gold .sw-stat-num { color: #B8760A; }
        .sw-stat.blue .sw-stat-num { color: #1A3A6B; }
        .sw-stat-sub { font-size: 11px; color: #8A9CC0; margin-top: 3px; }

        .sw-search-wrap { position: relative; margin-bottom: 1rem; }
        .sw-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .sw-search { width: 100%; padding: 9px 12px 9px 34px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0D1F45; background: #fff; outline: none; transition: border 0.2s; box-sizing: border-box; }
        .sw-search:focus { border-color: #1A3A6B; }

        .sw-table { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; overflow: hidden; }
        .sw-thead { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 90px; padding: 10px 16px; background: #F7F9FD; border-bottom: 1.5px solid #E4E8F0; }
        .sw-th { font-size: 11px; font-weight: 700; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.05em; }
        .sw-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 90px; padding: 11px 16px; border-bottom: 1px solid #F0F3FA; align-items: center; transition: background 0.15s; }
        .sw-row:last-child { border-bottom: none; }
        .sw-row:hover { background: #FAFBFF; }
        .sw-td { font-size: 13px; color: #0D1F45; }
        .sw-td-m { font-size: 12px; color: #8A9CC0; }
        .sw-nombre { font-weight: 600; font-size: 13px; color: #0D1F45; }
        .sw-doc { font-size: 11px; color: #8A9CC0; margin-top: 1px; }

        .b-ubicacion { display: inline-block; background: rgba(16,185,129,0.1); color: #065F46; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
        .b-sin-campo { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
        .b-kits { display: inline-block; background: rgba(245,166,35,0.12); color: #B8760A; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .b-ivpt { display: inline-block; background: rgba(43,91,168,0.1); color: #1A3A6B; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .b-sin-reg { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; }

        .sw-act-btns { display: flex; gap: 6px; }
        .sw-act-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #E4E8F0; background: #F7F9FD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .sw-act-btn:hover { border-color: #8A9CC0; }
        .sw-act-btn.danger:hover { border-color: #FCA5A5; background: #FEF2F2; }
        .sw-act-btn.primary { background: #0D1F45; border-color: #0D1F45; }
        .sw-act-btn.primary:hover { background: #1A3A6B; border-color: #1A3A6B; }

        .empty { text-align: center; padding: 2.5rem; color: #8A9CC0; font-size: 13px; }

        .overlay { position: fixed; inset: 0; background: rgba(13,31,69,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .sw-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; overflow: hidden; }
        .sw-modal-head { padding: 1.2rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .sw-modal-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .sw-modal-sub { font-size: 12px; color: #8A9CC0; margin-top: 3px; text-transform: capitalize; }
        .sw-modal-close { background: none; border: none; cursor: pointer; color: #8A9CC0; font-size: 22px; line-height: 1; flex-shrink: 0; }
        .sw-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }
        .sw-field-label { font-size: 11px; font-weight: 700; color: #4A6080; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .sw-field-desc { font-size: 11px; color: #8A9CC0; margin-top: 4px; }
        .sw-num-input-wrap { display: flex; align-items: center; border: 1.5px solid #E4E8F0; border-radius: 9px; overflow: hidden; background: #F7F9FD; }
        .sw-num-btn { width: 42px; height: 44px; border: none; background: #F0F3FA; cursor: pointer; font-size: 20px; color: #4A6080; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
        .sw-num-btn:hover { background: #E4E8F0; }
        .sw-num-input { flex: 1; border: none; background: transparent; font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: #0D1F45; text-align: center; outline: none; padding: 8px 0; min-width: 0; }
        .sw-num-input::placeholder { color: #C0C8D8; font-weight: 400; font-size: 20px; }
        .sw-modal-foot { padding: 1rem 1.5rem; border-top: 1.5px solid #E4E8F0; display: flex; justify-content: flex-end; gap: 10px; }
        .sw-btn-cancel { padding: 9px 18px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #4A6080; cursor: pointer; }
        .sw-btn-save { padding: 9px 20px; border: none; border-radius: 9px; background: #0D1F45; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s; }
        .sw-btn-save:hover { background: #1A3A6B; }
        .sw-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .sw-btn-enlace { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; color: #4A6080; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
        .sw-btn-enlace:hover { border-color: #1A3A6B; color: #1A3A6B; background: #EBF0FC; }
        .enlace-box { background: #F7F9FD; border: 1.5px solid #E4E8F0; border-radius: 9px; padding: 10px 12px; font-size: 12px; color: #4A6080; word-break: break-all; line-height: 1.5; }
        .enlace-ok { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.3); color: #065F46; }
        .btn-copiar { width: 100%; padding: 9px; border: none; border-radius: 9px; background: #065F46; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
        .btn-copiar:hover { background: #047857; }
        .btn-copiar.copiado { background: #F5A623; color: #0D1F45; }
        .expiracion-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .exp-btn { padding: 8px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #8A9CC0; cursor: pointer; text-align: center; transition: all 0.18s; }
        .exp-btn.on { border-color: #1A3A6B; background: #EBF0FC; color: #1A3A6B; }

        .confirm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 360px; padding: 1.5rem; text-align: center; }
        .confirm-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; margin-bottom: 0.5rem; }
        .confirm-sub { font-size: 13px; color: #8A9CC0; margin-bottom: 1.5rem; line-height: 1.6; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
        .btn-cancel { padding: 9px 18px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #4A6080; cursor: pointer; }
        .btn-danger { padding: 9px 20px; border: none; border-radius: 9px; background: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }

        /* Zebra stripes */
        .sw-row:nth-child(even) { background: #F7F9FD; }
        .sw-row:nth-child(even):hover { background: #F0F4FC; }

        @media (max-width: 768px) {
          .sw-stats { grid-template-columns: repeat(2, 1fr); }
          .sw-content { padding: 0.75rem; }
          .sw-topbar { flex-direction: column; align-items: flex-start; }
          .sw-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .sw-table { min-width: 520px; }
        }
      `}</style>

      <div className="sw-wrap">
        <div className="sw-topbar">
          <div className="sw-topbar-left">
            <div className="sw-topbar-title">Siembra</div>
            <div className="sw-topbar-sub">{formatFecha(fecha)}</div>
          </div>
          <div className="sw-fecha-wrap">
            <span className="sw-fecha-label">Fecha:</span>
            <input
              className="sw-fecha-input"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          {user?.role === "admin" && (
            <button
              className="sw-btn-enlace"
              onClick={() => {
                setModalEnlace(true);
                setEnlaceGenerado("");
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5.5 8.5l3-3M7 3l1.5-1.5a2.121 2.121 0 013 3L10 6M4 8l-1.5 1.5a2.121 2.121 0 003 3L7 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Generar enlace
            </button>
          )}
        </div>

        <div className="sw-content">
          <div className="sw-stats">
            <div className="sw-stat">
              <div className="sw-stat-label">Registros del día</div>
              <div className="sw-stat-num">{totalRegistros}</div>
              <div className="sw-stat-sub">
                de {colportores.length} colportores
              </div>
            </div>
            <div className="sw-stat gold">
              <div className="sw-stat-label">Kits sembrados</div>
              <div className="sw-stat-num">{totalKits}</div>
              <div className="sw-stat-sub">Total del día</div>
            </div>
            <div className="sw-stat blue">
              <div className="sw-stat-label">Seguidores IVPT</div>
              <div className="sw-stat-num">{totalIVPT}</div>
              <div className="sw-stat-sub">Total del día</div>
            </div>
          </div>

          <div className="sw-search-wrap">
            <span className="sw-search-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  stroke="#8A9CC0"
                  strokeWidth="1.4"
                />
                <path
                  d="M10 10l2.5 2.5"
                  stroke="#8A9CC0"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              className="sw-search"
              placeholder="Buscar colportor por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty">Cargando...</div>
          ) : (
            <div className="sw-table-scroll"><div className="sw-table">
              <div className="sw-thead">
                {["Colportor", "Ubicación", "Kits", "Seg. IVPT", ""].map(
                  (h) => (
                    <span key={h} className="sw-th">
                      {h}
                    </span>
                  ),
                )}
              </div>
              {filtered.length === 0 ? (
                <div className="empty">Sin resultados</div>
              ) : (
                filtered.map((c) => {
                  const reg = getRegistro(c.id);
                  return (
                    <div key={c.id} className="sw-row">
                      <div>
                        <div className="sw-nombre">{c.nombre}</div>
                        <div className="sw-doc">
                          {c.tipo_documento} · {c.numero_documento}
                        </div>
                      </div>
                      <div>
                        <span className="b-ubicacion">
                          {c.ubicacion_actual}
                        </span>
                      </div>
                      <div>
                        {reg ? (
                          <span className="b-kits">
                            {reg.kits_vendidos} kits
                          </span>
                        ) : (
                          <span className="b-sin-reg">—</span>
                        )}
                      </div>
                      <div>
                        {reg ? (
                          <span className="b-ivpt">
                            {reg.seguidores_ivpt} seg
                          </span>
                        ) : (
                          <span className="b-sin-reg">—</span>
                        )}
                      </div>
                      <div className="sw-act-btns">
                        {user?.role === "admin" && (
                          <button
                            className="sw-act-btn primary"
                            onClick={() => openModal(c)}
                            title={
                              reg ? "Editar registro" : "Registrar siembra"
                            }
                          >
                            {reg ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"
                                  stroke="#fff"
                                  strokeWidth="1.2"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M6 1v10M1 6h10"
                                  stroke="#fff"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                        {reg && (
                          <button
                            className="sw-act-btn danger"
                            onClick={() => setDeleteConfirm(reg.id)}
                            title="Eliminar registro"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M2 3h8M4 3V2h4v1M3 3l.5 7h5l.5-7"
                                stroke="#8A9CC0"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div></div>
          )}
        </div>
      </div>

      {/* Modal registrar/editar */}
      {modal && editando && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sw-modal-head">
              <div>
                <div className="sw-modal-title">
                  {getRegistro(editando.id)
                    ? "Editar registro"
                    : "Registrar siembra"}
                </div>
                <div className="sw-modal-sub">
                  {editando.nombre} · {formatFecha(fecha)}
                </div>
              </div>
              <button
                className="sw-modal-close"
                onClick={() => setModal(false)}
              >
                ×
              </button>
            </div>
            <div className="sw-modal-body">
              <div>
                <label className="sw-field-label">Kits sembrados</label>
                <div className="sw-num-input-wrap">
                  <button
                    className="sw-num-btn"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        kits_vendidos: String(
                          Math.max(0, parseInt(f.kits_vendidos) || 0) - 1,
                        ),
                      }))
                    }
                  >
                    −
                  </button>
                  <input
                    className="sw-num-input"
                    type="text"
                    placeholder="0"
                    value={form.kits_vendidos}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        kits_vendidos: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                  />
                  <button
                    className="sw-num-btn"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        kits_vendidos: String(
                          (parseInt(f.kits_vendidos) || 0) + 1,
                        ),
                      }))
                    }
                  >
                    +
                  </button>
                </div>
                <div className="sw-field-desc">
                  Número de kits de libros sembrados en el día
                </div>
              </div>
              <div>
                <label className="sw-field-label">Seguidores IVPT</label>
                <div className="sw-num-input-wrap">
                  <button
                    className="sw-num-btn"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        seguidores_ivpt: String(
                          Math.max(0, parseInt(f.seguidores_ivpt) || 0) - 1,
                        ),
                      }))
                    }
                  >
                    −
                  </button>
                  <input
                    className="sw-num-input"
                    type="text"
                    placeholder="0"
                    value={form.seguidores_ivpt}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        seguidores_ivpt: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                  />
                  <button
                    className="sw-num-btn"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        seguidores_ivpt: String(
                          (parseInt(f.seguidores_ivpt) || 0) + 1,
                        ),
                      }))
                    }
                  >
                    +
                  </button>
                </div>
                <div className="sw-field-desc">
                  Personas que siguieron la página de Instagram del IVPT
                </div>
              </div>
            </div>
            <div className="sw-modal-foot">
              <button className="sw-btn-cancel" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="sw-btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal generar enlace */}
      {modalEnlace && (
        <div className="overlay" onClick={() => setModalEnlace(false)}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sw-modal-head">
              <div>
                <div className="sw-modal-title">Generar enlace de siembra</div>
                <div className="sw-modal-sub">
                  Los colportores registrarán con su número de documento
                </div>
              </div>
              <button
                className="sw-modal-close"
                onClick={() => setModalEnlace(false)}
              >
                ×
              </button>
            </div>
            <div className="sw-modal-body">
              <div>
                <label className="sw-field-label">
                  Fecha asignada a los registros
                </label>
                <input
                  className="sw-fecha-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  type="date"
                  value={enlaceFecha}
                  onChange={(e) => setEnlaceFecha(e.target.value)}
                />
                <div className="sw-field-desc">
                  Los registros que hagan los colportores se guardarán en esta
                  fecha
                </div>
              </div>
              <div>
                <label className="sw-field-label">El enlace expira en</label>
                <div className="expiracion-grid">
                  {[
                    { val: "1", label: "1 hora" },
                    { val: "6", label: "6 horas" },
                    { val: "12", label: "12 horas" },
                    { val: "24", label: "24 horas" },
                  ].map((op) => (
                    <button
                      key={op.val}
                      className={`exp-btn ${enlaceExpiracion === op.val ? "on" : ""}`}
                      onClick={() => setEnlaceExpiracion(op.val)}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {enlaceGenerado && (
                <div>
                  <label className="sw-field-label">Enlace generado</label>
                  <div className={`enlace-box enlace-ok`}>{enlaceGenerado}</div>
                  <button
                    className={`btn-copiar ${copiado ? "copiado" : ""}`}
                    onClick={copiarEnlace}
                  >
                    {copiado ? "✓ Copiado" : "Copiar enlace"}
                  </button>
                </div>
              )}
            </div>
            <div className="sw-modal-foot">
              <button
                className="sw-btn-cancel"
                onClick={() => setModalEnlace(false)}
              >
                Cerrar
              </button>
              {!enlaceGenerado && (
                <button
                  className="sw-btn-save"
                  onClick={handleGenerarEnlace}
                  disabled={generandoEnlace}
                >
                  {generandoEnlace ? "Generando..." : "Generar enlace"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {deleteConfirm && (
        <div className="overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Eliminar registro?</div>
            <div className="confirm-sub">
              Se eliminará el registro de siembra de este colportor para el día{" "}
              {formatFecha(fecha)}.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}