"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type User = { id: string; name: string; phone: string; role: string };

type Colportor = {
  id: string;
  nombre: string;
  tipo_documento: "RC" | "TI" | "CC" | "CE";
  numero_documento: string;
  telefono: string;
  fecha_nacimiento: string;
  tiene_pasaporte: boolean;
  localidad: string;
  ubicacion_actual: string | null;
  categoria: "CDA INTEGRAL" | "CEPEVISTA" | "COLPORTOR" | "PAC";
};

type SiembraHoy = { colportor_id: string; kits_vendidos: number };

const EMPTY: Omit<Colportor, "id"> = {
  nombre: "",
  tipo_documento: "CC",
  numero_documento: "",
  telefono: "",
  fecha_nacimiento: "",
  tiene_pasaporte: false,
  localidad: "",
  ubicacion_actual: null,
  categoria: "COLPORTOR",
};

type FilterKey = "total" | "campo" | "pasaporte" | "kits";

function calcularEdad(fecha: string): number {
  if (!fecha) return 0;
  const hoy = new Date();
  const nac = new Date(fecha);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export default function ColportoresPanel({ user }: { user: User }) {
  const [colportores, setColportores] = useState<Colportor[]>([]);
  const [siembraHoy, setSiembraHoy] = useState<SiembraHoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("total");
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroLocalidad, setFiltroLocalidad] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Colportor | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: cols }, { data: siembra }] = await Promise.all([
      supabase.from("colportores").select("*").order("nombre"),
      supabase
        .from("siembra")
        .select("colportor_id, kits_vendidos")
        .eq("fecha", today),
    ]);
    setColportores((cols || []).map((c) => ({ ...c, ubicacion_actual: c.ubicacion_actual ?? "CEPEV" })));
    setSiembraHoy(siembra || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(c: Colportor) {
    setEditing(c);
    setForm({ ...c });
    setModal(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      await supabase.from("colportores").update(form).eq("id", editing.id);
    } else {
      const ubicacion_actual = form.categoria === "PAC" ? "PAC" : "CEPEV";
      await supabase.from("colportores").insert({ ...form, ubicacion_actual });
    }
    setSaving(false);
    setModal(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    await supabase.from("colportores").delete().eq("id", id);
    setDeleteConfirm(null);
    fetchAll();
  }

  const kitsMap = Object.fromEntries(
    siembraHoy.map((s) => [s.colportor_id, s.kits_vendidos]),
  );
  const totalKits = siembraHoy.reduce((a, s) => a + s.kits_vendidos, 0);

  // Normaliza texto: minúsculas sin tildes
  function normalize(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Localidades y ubicaciones únicas para filtros (sin duplicados por tilde/mayúscula, ordenadas)
  const localidades = [
    ...new Map(
      colportores
        .map((c) => c.localidad)
        .filter(Boolean)
        .map((v) => [normalize(v), v] as [string, string])
    ).values(),
  ].sort((a, b) => normalize(a).localeCompare(normalize(b)));

  const ubicaciones = [
    ...new Map(
      colportores
        .map((c) => c.ubicacion_actual)
        .filter(Boolean)
        .map((v) => [normalize(v!), v!] as [string, string])
    ).values(),
  ].sort((a, b) => normalize(a).localeCompare(normalize(b)));

  // Filtrado por card + búsqueda + filtros de columna
  const filtered = colportores
    .filter((c) => {
      if (filter === "campo") return !!c.ubicacion_actual && normalize(c.ubicacion_actual) !== "cepev" && normalize(c.ubicacion_actual) !== "pac";
      if (filter === "pasaporte") return c.tiene_pasaporte;
      return true;
    })
    .filter((c) => normalize(c.nombre).includes(normalize(search)))
    .filter((c) => (filtroCategoria ? c.categoria === filtroCategoria : true))
    .filter((c) => (filtroLocalidad ? normalize(c.localidad) === normalize(filtroLocalidad) : true))
    .filter((c) =>
      filtroUbicacion ? (
        normalize(filtroUbicacion) === "cepev"
          ? (c.ubicacion_actual === null || normalize(c.ubicacion_actual) === "cepev")
          : normalize(c.ubicacion_actual ?? "") === normalize(filtroUbicacion)
      ) : true,
    );

  const stats = {
    total: colportores.length,
    campo: colportores.filter((c) => c.ubicacion_actual && normalize(c.ubicacion_actual) !== "cepev" && normalize(c.ubicacion_actual) !== "pac").length,
    pasaporte: colportores.filter((c) => c.tiene_pasaporte).length,
    kits: totalKits,
  };

  const filterLabels: Record<FilterKey, string> = {
    total: "Todos los colportores",
    campo: "Colportores en campo",
    pasaporte: "Colportores con pasaporte",
    kits: "Siembra del día",
  };

  const actionBtns = (c: Colportor) => (
    <div className="act-btns">
      <button className="act-btn" onClick={() => openEdit(c)} title="Editar">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"
            stroke="#8A9CC0"
            strokeWidth="1.2"
          />
        </svg>
      </button>
      <button
        className="act-btn danger"
        onClick={() => setDeleteConfirm(c.id)}
        title="Eliminar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 3h8M4 3V2h4v1M3 3l.5 7h5l.5-7"
            stroke="#8A9CC0"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        .cp-wrap { display: flex; flex-direction: column; height: 100%; font-family: 'DM Sans', sans-serif; }
        .cp-topbar { background: #fff; border-bottom: 1.5px solid #E4E8F0; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .cp-topbar-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .cp-topbar-sub { font-size: 12px; color: #8A9CC0; margin-top: 1px; }
        .cp-add-btn { display: flex; align-items: center; gap: 6px; background: #F5A623; color: #0D1F45; border: none; border-radius: 9px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .cp-add-btn:hover { opacity: 0.88; }
        .cp-content { flex: 1; padding: 1.2rem 1.5rem; overflow-y: auto; }

        /* Stats */
        .cp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.2rem; }
        .cp-stat { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 0; padding: 1rem; cursor: pointer; transition: all 0.18s; }
        .cp-stat:hover { border-color: #F5A623; background: rgba(245,166,35,0.04); }
        .cp-stat.sel { border-color: #F5A623; background: rgba(245,166,35,0.10); }
        .cp-stat-label { font-size: 11px; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .cp-stat.sel .cp-stat-label { color: #B8760A; }
        .cp-stat-num { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: #0D1F45; }
        .cp-stat.sel .cp-stat-num { color: #B8760A; }
        .cp-stat-sub { font-size: 11px; color: #8A9CC0; margin-top: 3px; }
        .cp-stat.sel .cp-stat-sub { color: #B8760A; }

        /* Barra de búsqueda y filtros */
        .cp-filters { display: flex; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap; }
        .cp-search-wrap { flex: 1; min-width: 180px; position: relative; }
        .cp-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .cp-search { width: 100%; padding: 8px 12px 8px 32px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0D1F45; background: #fff; outline: none; transition: border 0.2s; }
        .cp-search:focus { border-color: #1A3A6B; }
        .cp-filter-select { padding: 8px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #4A6080; background: #fff; outline: none; cursor: pointer; }
        .cp-filter-select:focus { border-color: #1A3A6B; }

        /* Table */
        .cp-section-title { font-size: 13px; font-weight: 700; color: #0D1F45; margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .cp-table { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; overflow: hidden; }
        .cp-thead { display: grid; padding: 10px 16px; background: #F7F9FD; border-bottom: 1.5px solid #E4E8F0; }
        .cp-th { font-size: 11px; font-weight: 700; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.05em; }
        .cp-row { display: grid; padding: 11px 16px; border-bottom: 1px solid #F0F3FA; align-items: center; }
        .cp-row:last-child { border-bottom: none; }
        .cp-row:hover { background: #FAFBFF; }
        .cp-td { font-size: 13px; color: #0D1F45; }
        .cp-td-m { font-size: 13px; color: #8A9CC0; }
        .nombre-cell { display: flex; flex-direction: column; gap: 2px; }
        .nombre-edad { font-size: 11px; color: #8A9CC0; }
        .b-active { display: inline-block; background: rgba(16,185,129,0.1); color: #065F46; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .b-none { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .b-kits { display: inline-block; background: rgba(245,166,35,0.12); color: #B8760A; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
        .b-pass { display: inline-block; background: rgba(43,91,168,0.1); color: #1A3A6B; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .b-cat { display: inline-block; background: rgba(13,31,69,0.07); color: #0D1F45; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .act-btns { display: flex; gap: 6px; }
        .act-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #E4E8F0; background: #F7F9FD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .act-btn:hover { border-color: #8A9CC0; }
        .act-btn.danger:hover { border-color: #FCA5A5; background: #FEF2F2; }
        .empty { text-align: center; padding: 2.5rem; color: #8A9CC0; font-size: 13px; }

        /* Modal */
        .overlay { position: fixed; inset: 0; background: rgba(13,31,69,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 540px; overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
        .modal-head { padding: 1.2rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .modal-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .modal-close { background: none; border: none; cursor: pointer; color: #8A9CC0; font-size: 22px; line-height: 1; }
        .modal-body { padding: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; overflow-y: auto; }
        .modal-body .full { grid-column: 1 / -1; }
        .field-label { font-size: 11px; font-weight: 700; color: #4A6080; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .field-input { width: 100%; padding: 9px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0D1F45; background: #F7F9FD; outline: none; transition: border 0.2s; }
        .field-input:focus { border-color: #1A3A6B; background: #fff; }
        .field-select { width: 100%; padding: 9px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0D1F45; background: #F7F9FD; outline: none; }
        .edad-preview { font-size: 12px; color: #8A9CC0; margin-top: 5px; }
        .edad-preview span { color: #1A3A6B; font-weight: 600; }
        .checkbox-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; cursor: pointer; }
        .checkbox-row input { width: 16px; height: 16px; accent-color: #1A3A6B; cursor: pointer; }
        .checkbox-label { font-size: 14px; color: #0D1F45; }
        .modal-foot { padding: 1rem 1.5rem; border-top: 1.5px solid #E4E8F0; display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }
        .btn-cancel { padding: 9px 18px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #4A6080; cursor: pointer; }
        .btn-save { padding: 9px 20px; border: none; border-radius: 9px; background: #0D1F45; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s; }
        .btn-save:hover { background: #1A3A6B; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Confirm delete */
        .confirm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 360px; padding: 1.5rem; text-align: center; }
        .confirm-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; margin-bottom: 0.5rem; }
        .confirm-sub { font-size: 13px; color: #8A9CC0; margin-bottom: 1.5rem; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
        .btn-delete { padding: 9px 20px; border: none; border-radius: 9px; background: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }

        /* Zebra stripes */
        .cp-row:nth-child(even) { background: #F7F9FD; }
        .cp-row:nth-child(even):hover { background: #F0F4FC; }

        @media (max-width: 768px) {
          .cp-stats { grid-template-columns: repeat(2, 1fr); }
          .modal-body { grid-template-columns: 1fr; }
          .cp-content { padding: 0.75rem; }
          .cp-filters { flex-direction: column; }
          .cp-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .cp-table { min-width: 620px; }
        }
      `}</style>

      <div className="cp-wrap">
        {/* Topbar */}
        <div className="cp-topbar">
          <div>
            <div className="cp-topbar-title">Colportores</div>
            <div className="cp-topbar-sub">
              {filtered.length} {filterLabels[filter].toLowerCase()}
            </div>
          </div>

          {/* Solo si es admin se muestra el botón de agregar */}
          {user?.role === "admin" && (
            <button className="cp-add-btn" onClick={openCreate}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v12M1 7h12"
                  stroke="#0D1F45"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Nuevo Colportor
            </button>
          )}
        </div>

        <div className="cp-content">
          {/* Stats cards */}
          <div className="cp-stats">
            {(
              [
                {
                  key: "total",
                  label: "Total",
                  num: stats.total,
                  sub: "Colportores",
                },
                {
                  key: "campo",
                  label: "En campo",
                  num: stats.campo,
                  sub: "Activos hoy",
                },
                {
                  key: "pasaporte",
                  label: "Con pasaporte",
                  num: stats.pasaporte,
                  sub: "Habilitados",
                },
                {
                  key: "kits",
                  label: "Kits hoy",
                  num: stats.kits,
                  sub: "Siembra diaria",
                },
              ] as const
            ).map((s) => (
              <div
                key={s.key}
                className={`cp-stat ${filter === s.key ? "sel" : ""}`}
                onClick={() => setFilter(s.key)}
              >
                <div className="cp-stat-label">{s.label}</div>
                <div className="cp-stat-num">{s.num}</div>
                <div className="cp-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Búsqueda y filtros */}
          <div className="cp-filters">
            <div className="cp-search-wrap">
              <span className="cp-search-icon">
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
                className="cp-search"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="cp-filter-select"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {["CDA INTEGRAL", "CEPEVISTA", "COLPORTOR", "PAC"].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              className="cp-filter-select"
              value={filtroLocalidad}
              onChange={(e) => setFiltroLocalidad(e.target.value)}
            >
              <option value="">Todas las localidades</option>
              {localidades.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {(filter === "total" ||
              filter === "campo" ||
              filter === "kits") && (
              <select
                className="cp-filter-select"
                value={filtroUbicacion}
                onChange={(e) => setFiltroUbicacion(e.target.value)}
              >
                <option value="">Todas las ubicaciones</option>
                {ubicaciones.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tabla */}
          <div className="cp-section-title">{filterLabels[filter]}</div>

          {loading ? (
            <div className="empty">Cargando...</div>
          ) : (
            <div className="cp-table-scroll"><div className="cp-table">
              {filter === "kits" ? (
                <>
                  <div
                    className="cp-thead"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px" }}
                  >
                    {[
                      "Nombre / Edad",
                      "Documento",
                      "Categoría",
                      "Ubicación actual",
                      "Kits hoy",
                      "",
                    ].map((h) => (
                      <span key={h} className="cp-th">
                        {h}
                      </span>
                    ))}
                  </div>
                  {filtered.length === 0 ? (
                    <div className="empty">Sin registros</div>
                  ) : (
                    filtered.map((c) => (
                      <div
                        key={c.id}
                        className="cp-row"
                        style={{
                          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px",
                        }}
                      >
                        <div className="nombre-cell">
                          <span className="cp-td">{c.nombre}</span>
                          <span className="nombre-edad">
                            {calcularEdad(c.fecha_nacimiento)} años
                          </span>
                        </div>
                        <span className="cp-td-m">
                          {c.tipo_documento} · {c.numero_documento}
                        </span>
                        <span>
                          <span className="b-cat">{c.categoria}</span>
                        </span>
                        <span>
                          {c.ubicacion_actual ? (
                            <span className="b-active">
                              {c.ubicacion_actual}
                            </span>
                          ) : (
                            <span className="b-none">Sin asignar</span>
                          )}
                        </span>
                        <span>
                          {(kitsMap[c.id] ?? 0) > 0 ? (
                            <span className="b-kits">{kitsMap[c.id]} kits</span>
                          ) : (
                            <span className="b-none">0 kits</span>
                          )}
                        </span>
                        {actionBtns(c)}
                      </div>
                    ))
                  )}
                </>
              ) : filter === "pasaporte" ? (
                <>
                  <div
                    className="cp-thead"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px" }}
                  >
                    {[
                      "Nombre / Edad",
                      "Documento",
                      "Categoría",
                      "Localidad",
                      "Pasaporte",
                      "",
                    ].map((h) => (
                      <span key={h} className="cp-th">
                        {h}
                      </span>
                    ))}
                  </div>
                  {filtered.length === 0 ? (
                    <div className="empty">Sin registros</div>
                  ) : (
                    filtered.map((c) => (
                      <div
                        key={c.id}
                        className="cp-row"
                        style={{
                          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px",
                        }}
                      >
                        <div className="nombre-cell">
                          <span className="cp-td">{c.nombre}</span>
                          <span className="nombre-edad">
                            {calcularEdad(c.fecha_nacimiento)} años
                          </span>
                        </div>
                        <span className="cp-td-m">
                          {c.tipo_documento} · {c.numero_documento}
                        </span>
                        <span>
                          <span className="b-cat">{c.categoria}</span>
                        </span>
                        <span className="cp-td-m">{c.localidad}</span>
                        <span>
                          <span className="b-pass">Sí</span>
                        </span>
                        {actionBtns(c)}
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  <div
                    className="cp-thead"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px" }}
                  >
                    {[
                      "Nombre / Edad",
                      "Documento",
                      "Equipo",
                      "Localidad",
                      "Ubicación actual",
                      "",
                    ].map((h) => (
                      <span key={h} className="cp-th">
                        {h}
                      </span>
                    ))}
                  </div>
                  {filtered.length === 0 ? (
                    <div className="empty">Sin registros</div>
                  ) : (
                    filtered.map((c) => (
                      <div
                        key={c.id}
                        className="cp-row"
                        style={{
                          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 70px",
                        }}
                      >
                        <div className="nombre-cell">
                          <span className="cp-td">{c.nombre}</span>
                          <span className="nombre-edad">
                            {calcularEdad(c.fecha_nacimiento)} años
                          </span>
                        </div>
                        <span className="cp-td-m">
                          {c.tipo_documento} · {c.numero_documento}
                        </span>
                        <span>
                          <span className="b-cat">{c.categoria}</span>
                        </span>
                        <span className="cp-td-m">{c.localidad}</span>
                        <span>
                          {c.ubicacion_actual ? (
                            <span className="b-active">
                              {c.ubicacion_actual}
                            </span>
                          ) : (
                            <span className="b-none">CEPEV</span>
                          )}
                        </span>
                        {user?.role === 'admin' && actionBtns(c)}
                      </div>
                    ))
                  )}
                </>
              )}
            </div></div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">
                {editing ? "Editar Colportor" : "Nuevo Colportor"}
              </span>
              <button className="modal-close" onClick={() => setModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="full">
                <label className="field-label">Nombre completo</label>
                <input
                  className="field-input"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="field-label">Tipo de documento</label>
                <select
                  className="field-select"
                  value={form.tipo_documento}
                  onChange={(e) =>
                    setForm({ ...form, tipo_documento: e.target.value as any })
                  }
                >
                  <option value="RC">Registro Civil</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                </select>
              </div>
              <div>
                <label className="field-label">Número de documento</label>
                <input
                  className="field-input"
                  value={form.numero_documento}
                  onChange={(e) =>
                    setForm({ ...form, numero_documento: e.target.value })
                  }
                  placeholder="Número"
                />
              </div>
              <div>
                <label className="field-label">Fecha de nacimiento</label>
                <input
                  className="field-input"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fecha_nacimiento: e.target.value })
                  }
                />
                {form.fecha_nacimiento && (
                  <div className="edad-preview">
                    Edad calculada:{" "}
                    <span>{calcularEdad(form.fecha_nacimiento)} años</span>
                  </div>
                )}
              </div>
              <div>
                <label className="field-label">Teléfono</label>
                <input
                  className="field-input"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                  placeholder="Teléfono"
                />
              </div>
              <div>
                <label className="field-label">Equipo</label>
                <select
                  className="field-select"
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value as any })
                  }
                >
                  <option value="CDA INTEGRAL">CDA INTEGRAL</option>
                  <option value="CEPEVISTA">CEPEVISTA</option>
                  <option value="COLPORTOR">COLPORTOR</option>
                  <option value="PAC">PAC</option>
                </select>
              </div>
              <div>
                <label className="field-label">Localidad de origen</label>
                <input
                  className="field-input"
                  value={form.localidad}
                  onChange={(e) =>
                    setForm({ ...form, localidad: e.target.value })
                  }
                  placeholder="Ciudad de origen"
                />
              </div>
              {editing && (
                <div className="full">
                  <label className="field-label">Ubicación actual</label>
                  <input
                    className="field-input"
                    value={form.ubicacion_actual ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, ubicacion_actual: e.target.value || null })
                    }
                    placeholder="Ej: Barranquilla, Sincelejo..."
                  />
                </div>
              )}
              <div className="full">
                <label className="field-label">Pasaporte</label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.tiene_pasaporte}
                    onChange={(e) =>
                      setForm({ ...form, tiene_pasaporte: e.target.checked })
                    }
                  />
                  <span className="checkbox-label">
                    Tiene pasaporte vigente
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {deleteConfirm && (
        <div className="overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Eliminar?</div>
            <div className="confirm-sub">
              Esta acción no se puede deshacer. Se eliminarán todos los
              registros asociados.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-delete"
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