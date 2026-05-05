"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type User = { id: string; name: string; phone: string; role: string };

type Campo = {
  id: string;
  ciudad: string;
  departamento: string | null;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: "activo" | "cerrado";
  created_at: string;
};

type CampoColportor = {
  id: string;
  campo_id: string;
  colportor_id: string;
  fecha_ingreso: string;
  fecha_retiro: string | null;
  estado: "activo" | "retirado";
  colportores: {
    id: string;
    nombre: string;
    tipo_documento: string;
    numero_documento: string;
    categoria: string;
  };
};

type Colportor = {
  id: string;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  categoria: string;
};

type SiembraRow = {
  id: string;
  colportor_id: string;
  campo_id: string;
  fecha: string;
  kits_vendidos: number;
  seguidores_ivpt: number;
  colportores: { nombre: string };
};

type TabDetalle = "equipo" | "individual" | "siembra-equipo";
type PeriodoSiembra = "dia" | "semana" | "mes";

export default function CamposPanel({ user }: { user: User }) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaDetalle, setVistaDetalle] = useState<Campo | null>(null);
  const [equipoCampo, setEquipoCampo] = useState<CampoColportor[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [tabDetalle, setTabDetalle] = useState<TabDetalle>("equipo");

  // Siembra
  const [siembraData, setSiembraData] = useState<SiembraRow[]>([]);
  const [loadingSiembra, setLoadingSiembra] = useState(false);
  const [periodoSiembra, setPeriodoSiembra] = useState<PeriodoSiembra>("dia");
  const [colportorFiltro, setColportorFiltro] = useState<string>("");
  const [fechaNav, setFechaNav] = useState(new Date());

  // Modal nuevo campo
  const [modalCampo, setModalCampo] = useState(false);
  const [formCampo, setFormCampo] = useState({
    ciudad: "",
    departamento: "",
    pais: "Colombia",
  });
  const [fechaInicio, setFechaInicio] = useState("");
  const [savingCampo, setSavingCampo] = useState(false);

  // Modal agregar colportor
  const [modalAgregar, setModalAgregar] = useState(false);
  const [colportoresDisponibles, setColportoresDisponibles] = useState<
    Colportor[]
  >([]);
  const [colportorSeleccionado, setColportorSeleccionado] = useState("");
  const [busquedaColportor, setBusquedaColportor] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [savingColportor, setSavingColportor] = useState(false);
  const [conflicto, setConflicto] = useState<{
    nombre: string;
    campo: string;
  } | null>(null);
  const [pendienteTraslado, setPendienteTraslado] = useState<string | null>(
    null,
  );

  // Filtro por país
  const [filtroPais, setFiltroPais] = useState<"todos" | "colombia" | "exterior">("todos");

  // Confirmaciones
  const [confirmarCierre, setConfirmarCierre] = useState<string | null>(null);
  const [confirmarRetiro, setConfirmarRetiro] = useState<string | null>(null);
  const [confirmarReactivar, setConfirmarReactivar] = useState<string | null>(
    null,
  );
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  useEffect(() => {
    fetchCampos();
  }, []);

  useEffect(() => {
    if (
      vistaDetalle &&
      (tabDetalle === "individual" || tabDetalle === "siembra-equipo")
    ) {
      fetchSiembra(vistaDetalle.id);
    }
  }, [tabDetalle, periodoSiembra, fechaNav, colportorFiltro, vistaDetalle]);

  async function fetchCampos() {
    setLoading(true);
    const { data } = await supabase
      .from("campos")
      .select("*")
      .order("created_at", { ascending: false });
    setCampos(data || []);
    setLoading(false);
  }

  async function fetchDetalle(campo: Campo) {
    setVistaDetalle(campo);
    setMostrarHistorial(false);
    setTabDetalle("equipo");
    setFechaNav(new Date());
    setLoadingDetalle(true);
    const { data } = await supabase
      .from("campo_colportores")
      .select(
        `*, colportores(id, nombre, tipo_documento, numero_documento, categoria)`,
      )
      .eq("campo_id", campo.id)
      .order("fecha_ingreso", { ascending: false });
    setEquipoCampo(data || []);
    setLoadingDetalle(false);
  }

  async function fetchSiembra(campoId: string) {
    setLoadingSiembra(true);
    const { inicio, fin } = getRango();
    let query = supabase
      .from("siembra")
      .select(`*, colportores(nombre)`)
      .eq("campo_id", campoId)
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("fecha", { ascending: true });

    if (tabDetalle === "individual" && colportorFiltro) {
      query = query.eq("colportor_id", colportorFiltro);
    }

    const { data } = await query;
    setSiembraData(data || []);
    setLoadingSiembra(false);
  }

  function getRango(): { inicio: string; fin: string } {
    const d = new Date(fechaNav);
    if (periodoSiembra === "dia") {
      const f = d.toISOString().split("T")[0];
      return { inicio: f, fin: f };
    }
    if (periodoSiembra === "semana") {
      const day = d.getDay();
      const diffLunes = day === 0 ? -6 : 1 - day;
      const lunes = new Date(d);
      lunes.setDate(d.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return {
        inicio: lunes.toISOString().split("T")[0],
        fin: domingo.toISOString().split("T")[0],
      };
    }
    // mes
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      inicio: inicio.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
    };
  }

  function navAnterior() {
    const d = new Date(fechaNav);
    if (periodoSiembra === "dia") d.setDate(d.getDate() - 1);
    if (periodoSiembra === "semana") d.setDate(d.getDate() - 7);
    if (periodoSiembra === "mes") d.setMonth(d.getMonth() - 1);
    setFechaNav(d);
  }

  function navSiguiente() {
    const d = new Date(fechaNav);
    if (periodoSiembra === "dia") d.setDate(d.getDate() + 1);
    if (periodoSiembra === "semana") d.setDate(d.getDate() + 7);
    if (periodoSiembra === "mes") d.setMonth(d.getMonth() + 1);
    setFechaNav(d);
  }

  function getLabelNav(): string {
    const { inicio, fin } = getRango();
    if (periodoSiembra === "dia") return formatFecha(inicio);
    if (periodoSiembra === "semana")
      return `${formatFecha(inicio)} — ${formatFecha(fin)}`;
    return new Date(
      fechaNav.getFullYear(),
      fechaNav.getMonth(),
      1,
    ).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  }

  async function handleCrearCampo() {
    if (!formCampo.ciudad || !formCampo.pais || !fechaInicio) return;
    setSavingCampo(true);
    await supabase.from("campos").insert({
      ciudad: formCampo.ciudad,
      departamento: formCampo.departamento || null,
      pais: formCampo.pais,
      fecha_inicio: fechaInicio,
      estado: "activo",
    });
    setSavingCampo(false);
    setModalCampo(false);
    setFormCampo({ ciudad: "", departamento: "", pais: "Colombia" });
    setFechaInicio("");
    fetchCampos();
  }

  async function handleCerrarCampo(id: string) {
    const hoy = new Date().toISOString().split("T")[0];
    const { data: activos } = await supabase
      .from("campo_colportores")
      .select("colportor_id")
      .eq("campo_id", id)
      .eq("estado", "activo");
    if (activos) {
      for (const a of activos) {
        await supabase
          .from("colportores")
          .update({ ubicacion_actual: null })
          .eq("id", a.colportor_id);
      }
    }
    await supabase
      .from("campo_colportores")
      .update({ estado: "retirado", fecha_retiro: hoy })
      .eq("campo_id", id)
      .eq("estado", "activo");
    await supabase
      .from("campos")
      .update({ estado: "cerrado", fecha_fin: hoy })
      .eq("id", id);
    setConfirmarCierre(null);
    if (vistaDetalle?.id === id) {
      const updated = {
        ...vistaDetalle,
        estado: "cerrado" as const,
        fecha_fin: hoy,
      };
      setVistaDetalle(updated);
      fetchDetalle(updated);
    }
    fetchCampos();
  }

  async function handleReactivarCampo(id: string) {
    const hoy = new Date().toISOString().split("T")[0];
    await supabase
      .from("campos")
      .update({ estado: "activo", fecha_fin: null, fecha_inicio: hoy })
      .eq("id", id);
    setConfirmarReactivar(null);
    if (vistaDetalle?.id === id) {
      const updated = {
        ...vistaDetalle,
        estado: "activo" as const,
        fecha_fin: null,
        fecha_inicio: hoy,
      };
      setVistaDetalle(updated);
      fetchDetalle(updated);
    }
    fetchCampos();
  }

  async function handleEliminarCampo(id: string) {
    await supabase.from("campo_colportores").delete().eq("campo_id", id);
    await supabase.from("siembra").delete().eq("campo_id", id);
    await supabase.from("campos").delete().eq("id", id);
    setConfirmarEliminar(null);
    if (vistaDetalle?.id === id) setVistaDetalle(null);
    fetchCampos();
  }

  async function handleRetirarColportor(registro: CampoColportor) {
    const hoy = new Date().toISOString().split("T")[0];
    await supabase
      .from("campo_colportores")
      .update({ estado: "retirado", fecha_retiro: hoy })
      .eq("id", registro.id);
    await supabase
      .from("colportores")
      .update({ ubicacion_actual: null })
      .eq("id", registro.colportor_id);
    setConfirmarRetiro(null);
    if (vistaDetalle) fetchDetalle(vistaDetalle);
  }

  async function abrirModalAgregar() {
    const { data: todos } = await supabase
      .from("colportores")
      .select("id, nombre, tipo_documento, numero_documento, categoria")
      .order("nombre");
    setColportoresDisponibles(todos || []);
    setColportorSeleccionado("");
    setBusquedaColportor("");
    setMostrarSugerencias(false);
    setFechaIngreso(new Date().toISOString().split("T")[0]);
    setConflicto(null);
    setPendienteTraslado(null);
    setModalAgregar(true);
  }

  async function handleAgregarColportor() {
    if (!colportorSeleccionado || !vistaDetalle) return;
    setSavingColportor(true);
    const yaEnEsteCampo = equipoCampo.find(
      (e) => e.colportor_id === colportorSeleccionado && e.estado === "activo",
    );
    if (yaEnEsteCampo) {
      const col = colportoresDisponibles.find(
        (c) => c.id === colportorSeleccionado,
      );
      setConflicto({ nombre: col?.nombre || "", campo: "este campo" });
      setSavingColportor(false);
      return;
    }
    const { data: enOtroCampo } = await supabase
      .from("campo_colportores")
      .select(`*, campos(ciudad, pais)`)
      .eq("colportor_id", colportorSeleccionado)
      .eq("estado", "activo")
      .neq("campo_id", vistaDetalle.id)
      .maybeSingle();
    if (enOtroCampo) {
      const col = colportoresDisponibles.find(
        (c) => c.id === colportorSeleccionado,
      );
      const campoNombre = `Campo en ${(enOtroCampo as any).campos.ciudad}, ${(enOtroCampo as any).campos.pais}`;
      setConflicto({ nombre: col?.nombre || "", campo: campoNombre });
      setPendienteTraslado(colportorSeleccionado);
      setSavingColportor(false);
      return;
    }
    await ejecutarAgregar(colportorSeleccionado);
    setSavingColportor(false);
  }

  async function ejecutarAgregar(colportorId: string, traslado = false) {
    const hoy = new Date().toISOString().split("T")[0];
    const fechaIngresoFinal = fechaIngreso || hoy;
    if (traslado) {
      await supabase
        .from("campo_colportores")
        .update({ estado: "retirado", fecha_retiro: hoy })
        .eq("colportor_id", colportorId)
        .eq("estado", "activo");
    }
    await supabase.from("campo_colportores").insert({
      campo_id: vistaDetalle!.id,
      colportor_id: colportorId,
      fecha_ingreso: fechaIngresoFinal,
      estado: "activo",
    });
    await supabase
      .from("colportores")
      .update({ ubicacion_actual: vistaDetalle!.ciudad })
      .eq("id", colportorId);
    setModalAgregar(false);
    setConflicto(null);
    setPendienteTraslado(null);
    fetchDetalle(vistaDetalle!);
  }

  const equipoActivo = equipoCampo.filter((e) => e.estado === "activo");
  const equipoMostrado = mostrarHistorial ? equipoCampo : equipoActivo;

  // Agrupar siembra por colportor para vista equipo
  const siembraEquipoAgrupada = equipoCampo
    .filter((e) => e.colportores)
    .map((e) => {
      const registros = siembraData.filter((s) => s.colportor_id === e.colportor_id);
      const kits = registros.reduce((a, s) => a + s.kits_vendidos, 0);
      const ivpt = registros.reduce((a, s) => a + (s.seguidores_ivpt || 0), 0);
      return { id: e.colportor_id, nombre: e.colportores.nombre, kits, ivpt };
    })
    .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
    .sort((a, b) => b.kits - a.kits);

  const totalKitsEquipo = siembraEquipoAgrupada.reduce((a, e) => a + e.kits, 0);
  const totalIvptEquipo = siembraEquipoAgrupada.reduce((a, e) => a + e.ivpt, 0);

  // Siembra equipo agrupada por fecha (suma de todo el equipo día a día)
  const siembraEquipoPorFecha = siembraData.reduce(
    (acc, s) => {
      if (!acc[s.fecha]) acc[s.fecha] = { kits: 0, ivpt: 0 };
      acc[s.fecha].kits += s.kits_vendidos;
      acc[s.fecha].ivpt += s.seguidores_ivpt || 0;
      return acc;
    },
    {} as Record<string, { kits: number; ivpt: number }>,
  );

  // Siembra individual agrupada por fecha
  const siembraIndividualPorFecha = siembraData.reduce(
    (acc, s) => {
      if (!acc[s.fecha]) acc[s.fecha] = { kits: 0, ivpt: 0 };
      acc[s.fecha].kits += s.kits_vendidos;
      acc[s.fecha].ivpt += s.seguidores_ivpt || 0;
      return acc;
    },
    {} as Record<string, { kits: number; ivpt: number }>,
  );

  const totalKitsIndividual = siembraData.reduce((a, s) => a + s.kits_vendidos, 0);
  const totalIvptIndividual = siembraData.reduce((a, s) => a + (s.seguidores_ivpt || 0), 0);

  function normalizarTexto(texto: string) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  const camposFiltrados = campos.filter((c) => {
    if (filtroPais === "todos") return true;
    const paisNorm = normalizarTexto(c.pais);
    const esColombia = paisNorm === "colombia";
    if (filtroPais === "colombia") return esColombia;
    if (filtroPais === "exterior") return !esColombia;
    return true;
  });

  function formatFecha(f: string) {
    return new Date(f + "T00:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const colportoresUnicos = equipoCampo.filter(
    (v, i, arr) =>
      arr.findIndex((x) => x.colportor_id === v.colportor_id) === i,
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        .ca-wrap { display: flex; flex-direction: column; height: 100%; font-family: 'DM Sans', sans-serif; }
        .ca-topbar { background: #fff; border-bottom: 1.5px solid #E4E8F0; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .ca-topbar-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .ca-topbar-sub { font-size: 12px; color: #8A9CC0; margin-top: 1px; }
        .ca-add-btn { display: flex; align-items: center; gap: 6px; background: #F5A623; color: #0D1F45; border: none; border-radius: 9px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .ca-add-btn:hover { opacity: 0.88; }
        .ca-content { flex: 1; padding: 1.2rem 1.5rem; overflow-y: auto; }
        .ca-layout { display: grid; grid-template-columns: 300px 1fr; gap: 1.2rem; min-height: 100%; }
        .ca-lista { display: flex; flex-direction: column; gap: 10px; align-content: start; }
        .ca-filtros-pais { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
        .filtro-pais-btn { padding: 5px 14px; border-radius: 20px; border: 1.5px solid #E4E8F0; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #8A9CC0; cursor: pointer; transition: all 0.18s; }
        .filtro-pais-btn:hover { border-color: #2B5BA8; color: #0D1F45; }
        .filtro-pais-btn.on { background: #0D1F45; border-color: #0D1F45; color: #fff; }

        .campo-card { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; padding: 1rem 1.2rem; cursor: pointer; transition: all 0.18s; }
        .campo-card:hover { border-color: #2B5BA8; }
        .campo-card.sel { border-color: #1A3A6B; box-shadow: 0 0 0 3px rgba(26,58,107,0.08); }
        .campo-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 0.5rem; }
        .campo-nombre { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: #0D1F45; }
        .campo-pais { font-size: 12px; color: #8A9CC0; margin-top: 2px; }
        .campo-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 0.6rem; flex-wrap: wrap; gap: 4px; }
        .campo-fecha { font-size: 11px; color: #8A9CC0; }

        .b-activo { display: inline-block; background: rgba(16,185,129,0.1); color: #065F46; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; white-space: nowrap; }
        .b-cerrado { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; white-space: nowrap; }
        .b-cat { display: inline-block; background: rgba(13,31,69,0.07); color: #0D1F45; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }

        .ca-detalle { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .detalle-head { padding: 1.2rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .detalle-title { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: #0D1F45; }
        .detalle-sub { font-size: 12px; color: #8A9CC0; margin-top: 3px; }
        .detalle-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .btn-cerrar-campo { padding: 7px 14px; border: 1.5px solid #FECACA; border-radius: 9px; background: #FEF2F2; color: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .btn-cerrar-campo:hover { background: #DC2626; color: #fff; }
        .btn-reactivar { padding: 7px 14px; border: 1.5px solid rgba(16,185,129,0.3); border-radius: 9px; background: rgba(16,185,129,0.08); color: #065F46; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .btn-reactivar:hover { background: #065F46; color: #fff; }
        .btn-eliminar-campo { padding: 7px 14px; border: 1.5px solid #FECACA; border-radius: 9px; background: #FEF2F2; color: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .btn-eliminar-campo:hover { background: #DC2626; color: #fff; }
        .btn-agregar { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: none; border-radius: 9px; background: #0D1F45; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .btn-agregar:hover { background: #1A3A6B; }

        /* Tabs principales del detalle */
        .detalle-tabs { display: flex; border-bottom: 1.5px solid #E4E8F0; padding: 0 1.5rem; gap: 0; }
        .detalle-tab { padding: 10px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #8A9CC0; cursor: pointer; border-bottom: 2.5px solid transparent; margin-bottom: -1.5px; background: none; border-top: none; border-left: none; border-right: none; transition: all 0.18s; white-space: nowrap; }
        .detalle-tab:hover { color: #0D1F45; }
        .detalle-tab.on { color: #0D1F45; border-bottom-color: #F5A623; }

        /* Toggle historial */
        .detalle-toggle { padding: 0.8rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; gap: 8px; flex-wrap: wrap; }
        .toggle-btn { padding: 5px 14px; border-radius: 20px; border: 1.5px solid #E4E8F0; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #8A9CC0; cursor: pointer; transition: all 0.18s; }
        .toggle-btn.on { background: #0D1F45; border-color: #0D1F45; color: #fff; }

        /* Navegación de siembra */
        .siembra-nav { padding: 0.8rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .periodo-btns { display: flex; gap: 6px; }
        .periodo-btn { padding: 5px 14px; border-radius: 20px; border: 1.5px solid #E4E8F0; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #8A9CC0; cursor: pointer; transition: all 0.18s; }
        .periodo-btn.on { background: #F5A623; border-color: #F5A623; color: #0D1F45; }
        .nav-fecha { display: flex; align-items: center; gap: 10px; }
        .nav-arrow { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #E4E8F0; background: #F7F9FD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .nav-arrow:hover { border-color: #1A3A6B; background: #EBF0FC; }
        .nav-fecha-label { font-size: 13px; font-weight: 600; color: #0D1F45; min-width: 160px; text-align: center; }
        
        /* Filtro colportor individual */
        .siembra-filtro { padding: 0.8rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; }
        .field-select-sm { width: 100%; padding: 8px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0D1F45; background: #F7F9FD; outline: none; }

        .detalle-body { flex: 1; overflow-y: auto; padding: 1.2rem 1.5rem; }

        /* Tabla equipo */
        .equipo-table { width: 100%; border-collapse: collapse; }
        .equipo-table th { font-size: 11px; font-weight: 700; color: #8A9CC0; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; background: #F7F9FD; text-align: left; }
        .equipo-table td { font-size: 13px; color: #0D1F45; padding: 10px 12px; border-bottom: 1px solid #F0F3FA; vertical-align: middle; }
        .equipo-table tr:last-child td { border-bottom: none; }
        .equipo-table tr:hover td { background: #FAFBFF; }
        .td-muted { color: #8A9CC0 !important; font-size: 11px !important; }
        .act-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #E4E8F0; background: #F7F9FD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .act-btn.danger:hover { border-color: #FCA5A5; background: #FEF2F2; }

        /* Siembra cards */
        .siembra-total-card { background: rgba(245,166,35,0.08); border: 1.5px solid rgba(245,166,35,0.3); border-radius: 10px; padding: 1rem 1.2rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; }
        .siembra-total-label { font-size: 12px; color: #B8760A; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .siembra-total-num { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 800; color: #B8760A; }
        .siembra-total-sub { font-size: 11px; color: #B8760A; opacity: 0.7; }

        .siembra-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #F0F3FA; }
        .siembra-row:last-child { border-bottom: none; }
        .siembra-row:hover { background: #FAFBFF; }
        .siembra-nombre { font-size: 13px; font-weight: 600; color: #0D1F45; }
        .siembra-fecha { font-size: 12px; color: #8A9CC0; }
        .b-kits { display: inline-block; background: rgba(245,166,35,0.12); color: #B8760A; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .b-kits-zero { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .b-ivpt { display: inline-block; background: rgba(43,91,168,0.1); color: #1A3A6B; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .b-ivpt-zero { display: inline-block; background: #F0F3FA; color: #8A9CC0; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }

        /* Gráfica de línea */
        .bar-chart-legend { display: flex; gap: 14px; padding: 0.8rem 1rem 0.2rem; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #4A6080; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .bar-chart-scroll { overflow-x: auto; padding: 0 1rem 0.8rem; }

        /* Totales card con ivpt */
        .siembra-total-card-2 { background: rgba(245,166,35,0.08); border: 1.5px solid rgba(245,166,35,0.3); border-radius: 10px; padding: 1rem 1.2rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .total-stat { display: flex; flex-direction: column; align-items: flex-end; }
        .total-stat-num { font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 800; }
        .total-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.75; }
        .total-stats-row { display: flex; gap: 1.5rem; }
        .total-kits-num { color: #B8760A; }
        .total-ivpt-num { color: #1A3A6B; }

        .empty-detalle { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #8A9CC0; font-size: 13px; gap: 8px; padding: 2rem; text-align: center; }
        .empty-icon { font-size: 32px; opacity: 0.4; }

        /* Modales */
        .overlay { position: fixed; inset: 0; background: rgba(13,31,69,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 460px; overflow: hidden; }
        .modal-head { padding: 1.2rem 1.5rem; border-bottom: 1.5px solid #E4E8F0; display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .modal-close { background: none; border: none; cursor: pointer; color: #8A9CC0; font-size: 22px; line-height: 1; }
        .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .field-label { font-size: 11px; font-weight: 700; color: #4A6080; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .field-input { width: 100%; padding: 9px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0D1F45; background: #F7F9FD; outline: none; transition: border 0.2s; box-sizing: border-box; }
        .field-input:focus { border-color: #1A3A6B; background: #fff; }
        .field-select { width: 100%; padding: 9px 12px; border: 1.5px solid #E4E8F0; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0D1F45; background: #F7F9FD; outline: none; box-sizing: border-box; }
        .modal-foot { padding: 1rem 1.5rem; border-top: 1.5px solid #E4E8F0; display: flex; justify-content: flex-end; gap: 10px; }
        .btn-cancel { padding: 9px 18px; border: 1.5px solid #E4E8F0; border-radius: 9px; background: #F7F9FD; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #4A6080; cursor: pointer; }
        .btn-save { padding: 9px 20px; border: none; border-radius: 9px; background: #0D1F45; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s; }
        .btn-save:hover { background: #1A3A6B; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .conflicto-box { background: #FEF9EC; border: 1.5px solid #F5A623; border-radius: 10px; padding: 1rem; }
        .conflicto-title { font-size: 13px; font-weight: 700; color: #B8760A; margin-bottom: 4px; }
        .conflicto-sub { font-size: 12px; color: #92660A; margin-bottom: 0.8rem; line-height: 1.6; }
        .conflicto-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-traslado { padding: 7px 14px; border: none; border-radius: 8px; background: #F5A623; color: #0D1F45; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; }
        .btn-cancelar-traslado { padding: 7px 14px; border: 1.5px solid #E4E8F0; border-radius: 8px; background: #fff; color: #4A6080; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; }
        .autocomplete-wrap { position: relative; }
        .autocomplete-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid #E4E8F0; border-radius: 10px; box-shadow: 0 8px 24px rgba(13,31,69,0.12); z-index: 200; max-height: 200px; overflow-y: auto; }
        .autocomplete-item { padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #F0F3FA; transition: background 0.15s; }
        .autocomplete-item:last-child { border-bottom: none; }
        .autocomplete-item:hover { background: #F0F5FF; }
        .autocomplete-nombre { font-size: 13px; font-weight: 600; color: #0D1F45; }
        .autocomplete-doc { font-size: 11px; color: #8A9CC0; }
        .autocomplete-empty { padding: 12px 14px; font-size: 13px; color: #8A9CC0; text-align: center; }
        .confirm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 380px; padding: 1.5rem; text-align: center; }
        .confirm-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; margin-bottom: 0.5rem; }
        .confirm-sub { font-size: 13px; color: #8A9CC0; margin-bottom: 1.5rem; line-height: 1.6; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
        .btn-danger { padding: 9px 20px; border: none; border-radius: 9px; background: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }
        .btn-success { padding: 9px 20px; border: none; border-radius: 9px; background: #065F46; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; }

        @media (max-width: 900px) {
          .ca-layout { grid-template-columns: 1fr; }
          .ca-detalle { min-height: 400px; }
          .detalle-tabs { overflow-x: auto; }
        }
      `}</style>

      <div className="ca-wrap">
        <div className="ca-topbar">
          <div>
            <div className="ca-topbar-title">Campos</div>
            <div className="ca-topbar-sub">
              {campos.filter((c) => c.estado === "activo").length} activos ·{" "}
              {campos.filter((c) => c.estado === "cerrado").length} cerrados
            </div>
          </div>
          {user.role === "admin" && (
            <button className="ca-add-btn" onClick={() => setModalCampo(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v12M1 7h12"
                  stroke="#0D1F45"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Nuevo Campo
            </button>
          )}
        </div>

        <div className="ca-content">
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#8A9CC0",
                fontSize: 13,
              }}
            >
              Cargando...
            </div>
          ) : (
            <div className="ca-layout">
              {/* Lista */}
              <div className="ca-lista">
                <div className="ca-filtros-pais">
                  {(["todos", "colombia", "exterior"] as const).map((f) => (
                    <button
                      key={f}
                      className={`filtro-pais-btn ${filtroPais === f ? "on" : ""}`}
                      onClick={() => setFiltroPais(f)}
                    >
                      {f === "todos" ? "Todos" : f === "colombia" ? "Colombia" : "Exterior"}
                    </button>
                  ))}
                </div>
                {camposFiltrados.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#8A9CC0",
                      fontSize: 13,
                    }}
                  >
                    No hay campos registrados
                  </div>
                )}
                {camposFiltrados.map((campo) => (
                  <div
                    key={campo.id}
                    className={`campo-card ${vistaDetalle?.id === campo.id ? "sel" : ""}`}
                    onClick={() => fetchDetalle(campo)}
                  >
                    <div className="campo-card-top">
                      <div>
                        <div className="campo-nombre">
                          Campo en {campo.ciudad}
                        </div>
                        <div className="campo-pais">
                          {[campo.departamento, campo.pais].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      <span
                        className={
                          campo.estado === "activo" ? "b-activo" : "b-cerrado"
                        }
                      >
                        {campo.estado === "activo" ? "Activo" : "Cerrado"}
                      </span>
                    </div>
                    <div className="campo-card-bottom">
                      <span className="campo-fecha">
                        Desde {formatFecha(campo.fecha_inicio)}
                      </span>
                      {campo.fecha_fin && (
                        <span className="campo-fecha">
                          Hasta {formatFecha(campo.fecha_fin)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detalle */}
              <div className="ca-detalle">
                {!vistaDetalle ? (
                  <div className="empty-detalle">
                    <div className="empty-icon">🗺️</div>
                    <div>Selecciona un campo para ver el detalle</div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="detalle-head">
                      <div>
                        <div className="detalle-title">
                          Campo en {vistaDetalle.ciudad}
                        </div>
                        <div className="detalle-sub">
                          {[vistaDetalle.departamento, vistaDetalle.pais].filter(Boolean).join(", ")} · Desde{" "}
                          {formatFecha(vistaDetalle.fecha_inicio)}
                          {vistaDetalle.fecha_fin &&
                            ` · Hasta ${formatFecha(vistaDetalle.fecha_fin)}`}
                        </div>
                      </div>
                      <div className="detalle-head-actions">
                        {user?.role === "admin" &&
                          (vistaDetalle.estado === "activo" ? (
                            <>
                              <button
                                className="btn-agregar"
                                onClick={abrirModalAgregar}
                              >
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
                                Agregar colportor
                              </button>
                              <button
                                className="btn-cerrar-campo"
                                onClick={() =>
                                  setConfirmarCierre(vistaDetalle.id)
                                }
                              >
                                Cerrar campo
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-reactivar"
                                onClick={() =>
                                  setConfirmarReactivar(vistaDetalle.id)
                                }
                              >
                                Reactivar campo
                              </button>
                              <button
                                className="btn-eliminar-campo"
                                onClick={() =>
                                  setConfirmarEliminar(vistaDetalle.id)
                                }
                              >
                                Eliminar campo
                              </button>
                            </>
                          ))}
                      </div>
                    </div>

                    {/* Tabs principales */}
                    <div className="detalle-tabs">
                      <button
                        className={`detalle-tab ${tabDetalle === "equipo" ? "on" : ""}`}
                        onClick={() => setTabDetalle("equipo")}
                      >
                        Equipo
                      </button>
                      <button
                        className={`detalle-tab ${tabDetalle === "siembra-equipo" ? "on" : ""}`}
                        onClick={() => setTabDetalle("siembra-equipo")}
                      >
                        Siembra del equipo
                      </button>
                      <button
                        className={`detalle-tab ${tabDetalle === "individual" ? "on" : ""}`}
                        onClick={() => setTabDetalle("individual")}
                      >
                        Siembra individual
                      </button>
                    </div>

                    {/* Tab: Equipo */}
                    {tabDetalle === "equipo" && (
                      <>
                        <div className="detalle-toggle">
                          <button
                            className={`toggle-btn ${!mostrarHistorial ? "on" : ""}`}
                            onClick={() => setMostrarHistorial(false)}
                          >
                            Equipo activo ({equipoActivo.length})
                          </button>
                          <button
                            className={`toggle-btn ${mostrarHistorial ? "on" : ""}`}
                            onClick={() => setMostrarHistorial(true)}
                          >
                            Historial completo ({equipoCampo.length})
                          </button>
                        </div>
                        <div className="detalle-body">
                          {loadingDetalle ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "2rem",
                                color: "#8A9CC0",
                                fontSize: 13,
                              }}
                            >
                              Cargando...
                            </div>
                          ) : equipoMostrado.length === 0 ? (
                            <div className="empty-detalle">
                              <div className="empty-icon">👥</div>
                              <div>
                                {mostrarHistorial
                                  ? "Sin historial"
                                  : "No hay colportores activos"}
                              </div>
                            </div>
                          ) : (
                            <table className="equipo-table">
                              <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Categoría</th>
                                  <th>Ingresó</th>
                                  {mostrarHistorial && <th>Retiró</th>}
                                  {mostrarHistorial && <th>Estado</th>}
                                  {!mostrarHistorial &&
                                    vistaDetalle.estado === "activo" && (
                                      <th></th>
                                    )}
                                </tr>
                              </thead>
                              <tbody>
                                {equipoMostrado.map((e) => (
                                  <tr key={e.id}>
                                    <td>
                                      <div style={{ fontWeight: 600 }}>
                                        {e.colportores.nombre}
                                      </div>
                                      <div className="td-muted">
                                        {e.colportores.tipo_documento} ·{" "}
                                        {e.colportores.numero_documento}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="b-cat">
                                        {e.colportores.categoria}
                                      </span>
                                    </td>
                                    <td className="td-muted">
                                      {formatFecha(e.fecha_ingreso)}
                                    </td>
                                    {mostrarHistorial && (
                                      <td className="td-muted">
                                        {e.fecha_retiro
                                          ? formatFecha(e.fecha_retiro)
                                          : "—"}
                                      </td>
                                    )}
                                    {mostrarHistorial && (
                                      <td>
                                        <span
                                          className={
                                            e.estado === "activo"
                                              ? "b-activo"
                                              : "b-cerrado"
                                          }
                                        >
                                          {e.estado === "activo"
                                            ? "Activo"
                                            : "Retirado"}
                                        </span>
                                      </td>
                                    )}
                                    {/* Agregamos la validación del rol al inicio de las condiciones */}
                                    {user?.role === "admin" &&
                                      !mostrarHistorial &&
                                      vistaDetalle.estado === "activo" && (
                                        <td>
                                          <button
                                            className="act-btn danger"
                                            onClick={() =>
                                              setConfirmarRetiro(e.id)
                                            }
                                            title="Retirar"
                                          >
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                            >
                                              <path
                                                d="M2 6h8"
                                                stroke="#8A9CC0"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                              />
                                            </svg>
                                          </button>
                                        </td>
                                      )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </>
                    )}

                    {/* Tab: Siembra del equipo */}
                    {tabDetalle === "siembra-equipo" && (
                      <>
                        <div className="siembra-nav">
                          <div className="periodo-btns">
                            {(["dia", "semana", "mes"] as PeriodoSiembra[]).map(
                              (p) => (
                                <button
                                  key={p}
                                  className={`periodo-btn ${periodoSiembra === p ? "on" : ""}`}
                                  onClick={() => setPeriodoSiembra(p)}
                                >
                                  {p === "dia"
                                    ? "Día"
                                    : p === "semana"
                                      ? "Semana"
                                      : "Mes"}
                                </button>
                              ),
                            )}
                          </div>
                          <div className="nav-fecha">
                            <button className="nav-arrow" onClick={navAnterior}>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M7.5 2L3.5 6l4 4"
                                  stroke="#0D1F45"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <span className="nav-fecha-label">
                              {getLabelNav()}
                            </span>
                            <button
                              className="nav-arrow"
                              onClick={navSiguiente}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M4.5 2l4 4-4 4"
                                  stroke="#0D1F45"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="detalle-body">
                          {loadingSiembra ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "2rem",
                                color: "#8A9CC0",
                                fontSize: 13,
                              }}
                            >
                              Cargando...
                            </div>
                          ) : (
                            <>
                              <div className="siembra-total-card-2">
                                <div>
                                  <div className="siembra-total-label">Total del equipo</div>
                                  <div className="siembra-total-sub">{getLabelNav()}</div>
                                </div>
                                <div className="total-stats-row">
                                  <div className="total-stat">
                                    <div className="total-stat-num total-kits-num">{totalKitsEquipo}</div>
                                    <div className="total-stat-label" style={{ color: "#B8760A" }}>kits</div>
                                  </div>
                                  <div className="total-stat">
                                    <div className="total-stat-num total-ivpt-num">{totalIvptEquipo}</div>
                                    <div className="total-stat-label" style={{ color: "#1A3A6B" }}>IVPT</div>
                                  </div>
                                </div>
                              </div>
                              {siembraEquipoAgrupada.length === 0 ? (
                                <div className="empty-detalle">
                                  <div className="empty-icon">🌱</div>
                                  <div>Sin registros de siembra en este período</div>
                                </div>
                              ) : periodoSiembra === "dia" ? (
                                // Vista día: lista por colportor con kits e ivpt
                                <div style={{ background: "#fff", border: "1.5px solid #E4E8F0", borderRadius: 10, overflow: "hidden" }}>
                                  {siembraEquipoAgrupada.map((e) => (
                                    <div key={e.id} className="siembra-row">
                                      <div className="siembra-nombre">{e.nombre}</div>
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <span className={e.kits > 0 ? "b-kits" : "b-kits-zero"}>{e.kits} kits</span>
                                        <span className={e.ivpt > 0 ? "b-ivpt" : "b-ivpt-zero"}>{e.ivpt} IVPT</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // Vista semana/mes: gráfica de línea doble día a día del equipo
                                <div style={{ background: "#fff", border: "1.5px solid #E4E8F0", borderRadius: 10, overflow: "hidden" }}>
                                  <div className="bar-chart-legend">
                                    <div className="legend-item"><div className="legend-dot" style={{ background: "#F5A623" }}></div>Kits sembrados</div>
                                    <div className="legend-item"><div className="legend-dot" style={{ background: "#2B5BA8" }}></div>Seguidores IVPT</div>
                                  </div>
                                  <div className="bar-chart-scroll">
                                    {(() => {
                                      const entries = Object.entries(siembraEquipoPorFecha).sort(([a], [b]) => a.localeCompare(b));
                                      if (entries.length === 0) return <div className="empty-detalle" style={{height:120}}><div className="empty-icon">🌱</div><div>Sin registros</div></div>;
                                      const maxVal = Math.max(...entries.flatMap(([, v]) => [v.kits, v.ivpt]), 1);
                                      const marginL = 30; const marginR = 16; const marginT = 28; const marginB = 38;
                                      const colW = Math.max(56, Math.floor(320 / entries.length));
                                      const svgW = Math.max(marginL + entries.length * colW + marginR, 320);
                                      const svgH = 200;
                                      const chartH = svgH - marginT - marginB;
                                      const px = (i: number) => marginL + i * colW + colW / 2;
                                      const py = (v: number) => marginT + chartH - (v / maxVal) * chartH;
                                      const fmtShort = (f: string) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
                                      const kitsPoints = entries.map(([, v], i) => `${px(i)},${py(v.kits)}`).join(" ");
                                      const ivptPoints = entries.map(([, v], i) => `${px(i)},${py(v.ivpt)}`).join(" ");
                                      return (
                                        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
                                          {/* Grid horizontal */}
                                          {[0, 0.25, 0.5, 0.75, 1].map(t => {
                                            const y = marginT + chartH - t * chartH;
                                            return (
                                              <g key={t}>
                                                <line x1={marginL} y1={y} x2={svgW - marginR} y2={y} stroke="#F0F3FA" strokeWidth="1" />
                                                <text x={marginL - 4} y={y + 4} fontSize="9" fill="#8A9CC0" textAnchor="end">{Math.round(t * maxVal)}</text>
                                              </g>
                                            );
                                          })}
                                          {/* Área kits (relleno suave) */}
                                          <polygon
                                            points={`${px(0)},${marginT + chartH} ${kitsPoints} ${px(entries.length - 1)},${marginT + chartH}`}
                                            fill="rgba(245,166,35,0.08)"
                                          />
                                          {/* Área ivpt (relleno suave) */}
                                          <polygon
                                            points={`${px(0)},${marginT + chartH} ${ivptPoints} ${px(entries.length - 1)},${marginT + chartH}`}
                                            fill="rgba(43,91,168,0.07)"
                                          />
                                          {/* Línea kits */}
                                          <polyline points={kitsPoints} fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                          {/* Línea ivpt */}
                                          <polyline points={ivptPoints} fill="none" stroke="#2B5BA8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                          {/* Puntos y etiquetas */}
                                          {entries.map(([fecha, v], i) => (
                                            <g key={fecha}>
                                              <circle cx={px(i)} cy={py(v.kits)} r="4" fill="#fff" stroke="#F5A623" strokeWidth="2" />
                                              <circle cx={px(i)} cy={py(v.ivpt)} r="4" fill="#fff" stroke="#2B5BA8" strokeWidth="2" />
                                              {v.kits > 0 && <text x={px(i)} y={py(v.kits) - 8} fontSize="9" fill="#B8760A" textAnchor="middle" fontWeight="700">{v.kits}</text>}
                                              {v.ivpt > 0 && <text x={px(i)} y={py(v.ivpt) - 8} fontSize="9" fill="#1A3A6B" textAnchor="middle" fontWeight="700">{v.ivpt}</text>}
                                              {/* Fecha eje X */}
                                              <text x={px(i)} y={svgH - marginB + 14} fontSize="9" fill="#4A6080" textAnchor="middle" fontWeight="600">{fmtShort(fecha)}</text>
                                            </g>
                                          ))}
                                          {/* Eje X base */}
                                          <line x1={marginL} y1={marginT + chartH} x2={svgW - marginR} y2={marginT + chartH} stroke="#E4E8F0" strokeWidth="1.5" />
                                        </svg>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {/* Tab: Siembra individual */}
                    {tabDetalle === "individual" && (
                      <>
                        <div className="siembra-nav">
                          <div className="periodo-btns">
                            {(["dia", "semana", "mes"] as PeriodoSiembra[]).map(
                              (p) => (
                                <button
                                  key={p}
                                  className={`periodo-btn ${periodoSiembra === p ? "on" : ""}`}
                                  onClick={() => setPeriodoSiembra(p)}
                                >
                                  {p === "dia"
                                    ? "Día"
                                    : p === "semana"
                                      ? "Semana"
                                      : "Mes"}
                                </button>
                              ),
                            )}
                          </div>
                          <div className="nav-fecha">
                            <button className="nav-arrow" onClick={navAnterior}>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M7.5 2L3.5 6l4 4"
                                  stroke="#0D1F45"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <span className="nav-fecha-label">
                              {getLabelNav()}
                            </span>
                            <button
                              className="nav-arrow"
                              onClick={navSiguiente}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M4.5 2l4 4-4 4"
                                  stroke="#0D1F45"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="siembra-filtro">
                          <select
                            className="field-select-sm"
                            value={colportorFiltro}
                            onChange={(e) => setColportorFiltro(e.target.value)}
                          >
                            <option value="">
                              — Selecciona un colportor —
                            </option>
                            {colportoresUnicos.map((e) => (
                              <option
                                key={e.colportor_id}
                                value={e.colportor_id}
                              >
                                {e.colportores.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="detalle-body">
                          {!colportorFiltro ? (
                            <div className="empty-detalle">
                              <div className="empty-icon">👆</div>
                              <div>Selecciona un colportor para ver su siembra</div>
                            </div>
                          ) : loadingSiembra ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#8A9CC0", fontSize: 13 }}>
                              Cargando...
                            </div>
                          ) : (
                            <>
                              <div className="siembra-total-card-2">
                                <div>
                                  <div className="siembra-total-label">Total individual</div>
                                  <div className="siembra-total-sub">{getLabelNav()}</div>
                                </div>
                                <div className="total-stats-row">
                                  <div className="total-stat">
                                    <div className="total-stat-num total-kits-num">{totalKitsIndividual}</div>
                                    <div className="total-stat-label" style={{ color: "#B8760A" }}>kits</div>
                                  </div>
                                  <div className="total-stat">
                                    <div className="total-stat-num total-ivpt-num">{totalIvptIndividual}</div>
                                    <div className="total-stat-label" style={{ color: "#1A3A6B" }}>IVPT</div>
                                  </div>
                                </div>
                              </div>
                              {Object.keys(siembraIndividualPorFecha).length === 0 ? (
                                <div className="empty-detalle">
                                  <div className="empty-icon">🌱</div>
                                  <div>Sin registros de siembra en este período</div>
                                </div>
                              ) : periodoSiembra === "dia" ? (
                                // Vista día: un solo número por colportor
                                <div style={{ background: "#fff", border: "1.5px solid #E4E8F0", borderRadius: 10, overflow: "hidden" }}>
                                  {Object.entries(siembraIndividualPorFecha)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([fecha, vals]) => (
                                      <div key={fecha} className="siembra-row">
                                        <span className="siembra-fecha">{formatFecha(fecha)}</span>
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <span className={vals.kits > 0 ? "b-kits" : "b-kits-zero"}>{vals.kits} kits</span>
                                          <span className={vals.ivpt > 0 ? "b-ivpt" : "b-ivpt-zero"}>{vals.ivpt} IVPT</span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                // Vista semana/mes: gráfica de línea doble día a día del colportor
                                <div style={{ background: "#fff", border: "1.5px solid #E4E8F0", borderRadius: 10, overflow: "hidden" }}>
                                  <div className="bar-chart-legend">
                                    <div className="legend-item"><div className="legend-dot" style={{ background: "#F5A623" }}></div>Kits sembrados</div>
                                    <div className="legend-item"><div className="legend-dot" style={{ background: "#2B5BA8" }}></div>Seguidores IVPT</div>
                                  </div>
                                  <div className="bar-chart-scroll">
                                    {(() => {
                                      const entries = Object.entries(siembraIndividualPorFecha).sort(([a], [b]) => a.localeCompare(b));
                                      if (entries.length === 0) return <div className="empty-detalle" style={{height:120}}><div className="empty-icon">🌱</div><div>Sin registros</div></div>;
                                      const maxVal = Math.max(...entries.flatMap(([, v]) => [v.kits, v.ivpt]), 1);
                                      const marginL = 30; const marginR = 16; const marginT = 28; const marginB = 38;
                                      const colW = Math.max(56, Math.floor(320 / entries.length));
                                      const svgW = Math.max(marginL + entries.length * colW + marginR, 320);
                                      const svgH = 200;
                                      const chartH = svgH - marginT - marginB;
                                      const px = (i: number) => marginL + i * colW + colW / 2;
                                      const py = (v: number) => marginT + chartH - (v / maxVal) * chartH;
                                      const fmtShort = (f: string) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
                                      const kitsPoints = entries.map(([, v], i) => `${px(i)},${py(v.kits)}`).join(" ");
                                      const ivptPoints = entries.map(([, v], i) => `${px(i)},${py(v.ivpt)}`).join(" ");
                                      return (
                                        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
                                          {[0, 0.25, 0.5, 0.75, 1].map(t => {
                                            const y = marginT + chartH - t * chartH;
                                            return (
                                              <g key={t}>
                                                <line x1={marginL} y1={y} x2={svgW - marginR} y2={y} stroke="#F0F3FA" strokeWidth="1" />
                                                <text x={marginL - 4} y={y + 4} fontSize="9" fill="#8A9CC0" textAnchor="end">{Math.round(t * maxVal)}</text>
                                              </g>
                                            );
                                          })}
                                          <polygon points={`${px(0)},${marginT + chartH} ${kitsPoints} ${px(entries.length - 1)},${marginT + chartH}`} fill="rgba(245,166,35,0.08)" />
                                          <polygon points={`${px(0)},${marginT + chartH} ${ivptPoints} ${px(entries.length - 1)},${marginT + chartH}`} fill="rgba(43,91,168,0.07)" />
                                          <polyline points={kitsPoints} fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                          <polyline points={ivptPoints} fill="none" stroke="#2B5BA8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                          {entries.map(([fecha, v], i) => (
                                            <g key={fecha}>
                                              <circle cx={px(i)} cy={py(v.kits)} r="4" fill="#fff" stroke="#F5A623" strokeWidth="2" />
                                              <circle cx={px(i)} cy={py(v.ivpt)} r="4" fill="#fff" stroke="#2B5BA8" strokeWidth="2" />
                                              {v.kits > 0 && <text x={px(i)} y={py(v.kits) - 8} fontSize="9" fill="#B8760A" textAnchor="middle" fontWeight="700">{v.kits}</text>}
                                              {v.ivpt > 0 && <text x={px(i)} y={py(v.ivpt) - 8} fontSize="9" fill="#1A3A6B" textAnchor="middle" fontWeight="700">{v.ivpt}</text>}
                                              <text x={px(i)} y={svgH - marginB + 14} fontSize="9" fill="#4A6080" textAnchor="middle" fontWeight="600">{fmtShort(fecha)}</text>
                                            </g>
                                          ))}
                                          <line x1={marginL} y1={marginT + chartH} x2={svgW - marginR} y2={marginT + chartH} stroke="#E4E8F0" strokeWidth="1.5" />
                                        </svg>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo campo */}
      {modalCampo && (
        <div className="overlay" onClick={() => setModalCampo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Nuevo Campo</span>
              <button
                className="modal-close"
                onClick={() => setModalCampo(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="field-label">Ciudad o municipio</label>
                <input
                  className="field-input"
                  value={formCampo.ciudad}
                  onChange={(e) =>
                    setFormCampo({ ...formCampo, ciudad: e.target.value })
                  }
                  placeholder="Ej: Montería"
                />
              </div>
              <div>
                <label className="field-label">Departamento o estado</label>
                <input
                  className="field-input"
                  value={formCampo.departamento}
                  onChange={(e) =>
                    setFormCampo({ ...formCampo, departamento: e.target.value })
                  }
                  placeholder="Ej: Córdoba"
                />
              </div>
              <div>
                <label className="field-label">País</label>
                <input
                  className="field-input"
                  value={formCampo.pais}
                  onChange={(e) =>
                    setFormCampo({ ...formCampo, pais: e.target.value })
                  }
                  placeholder="Ej: Colombia"
                />
              </div>
              <div>
                <label className="field-label">Fecha de inicio</label>
                <input
                  className="field-input"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                className="btn-cancel"
                onClick={() => setModalCampo(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-save"
                onClick={handleCrearCampo}
                disabled={
                  savingCampo ||
                  !formCampo.ciudad ||
                  !formCampo.pais ||
                  !fechaInicio
                }
              >
                {savingCampo ? "Creando..." : "Crear campo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar colportor */}
      {modalAgregar && (
        <div
          className="overlay"
          onClick={() => {
            setModalAgregar(false);
            setConflicto(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Agregar Colportor</span>
              <button
                className="modal-close"
                onClick={() => {
                  setModalAgregar(false);
                  setConflicto(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="field-label">Buscar colportor</label>
                <div className="autocomplete-wrap">
                  <input
                    className="field-input"
                    placeholder="Escribe el nombre..."
                    value={busquedaColportor}
                    autoComplete="off"
                    onChange={(e) => {
                      setBusquedaColportor(e.target.value);
                      setColportorSeleccionado("");
                      setConflicto(null);
                      setPendienteTraslado(null);
                      setMostrarSugerencias(true);
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                  />
                  {mostrarSugerencias && busquedaColportor.length > 0 && (
                    <div className="autocomplete-list">
                      {colportoresDisponibles
                        .filter((c) =>
                          c.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            .includes(busquedaColportor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                        )
                        .slice(0, 8)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="autocomplete-item"
                            onMouseDown={() => {
                              setColportorSeleccionado(c.id);
                              setBusquedaColportor(c.nombre);
                              setMostrarSugerencias(false);
                              setConflicto(null);
                              setPendienteTraslado(null);
                            }}
                          >
                            <span className="autocomplete-nombre">{c.nombre}</span>
                            <span className="autocomplete-doc">{c.tipo_documento} · {c.numero_documento}</span>
                          </div>
                        ))}
                      {colportoresDisponibles.filter((c) =>
                        c.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                          .includes(busquedaColportor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                      ).length === 0 && (
                        <div className="autocomplete-empty">Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="field-label">Fecha de ingreso al campo</label>
                <input
                  className="field-input"
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>
              {conflicto && (
                <div className="conflicto-box">
                  <div className="conflicto-title">
                    ⚠️ Colportor en otro campo
                  </div>
                  <div className="conflicto-sub">
                    <strong>{conflicto.nombre}</strong> está activo en{" "}
                    <strong>{conflicto.campo}</strong>. ¿Deseas trasladarlo a
                    este campo?
                  </div>
                  <div className="conflicto-btns">
                    <button
                      className="btn-traslado"
                      onClick={() => ejecutarAgregar(pendienteTraslado!, true)}
                    >
                      Sí, trasladar
                    </button>
                    <button
                      className="btn-cancelar-traslado"
                      onClick={() => {
                        setConflicto(null);
                        setPendienteTraslado(null);
                        setColportorSeleccionado("");
                        setBusquedaColportor("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!conflicto && (
              <div className="modal-foot">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setModalAgregar(false);
                    setConflicto(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="btn-save"
                  onClick={handleAgregarColportor}
                  disabled={savingColportor || !colportorSeleccionado || !fechaIngreso}
                >
                  {savingColportor ? "Verificando..." : "Agregar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmar retiro */}
      {confirmarRetiro && (
        <div className="overlay" onClick={() => setConfirmarRetiro(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Retirar colportor?</div>
            <div className="confirm-sub">
              Se registrará la fecha de retiro y el colportor quedará disponible
              para otro campo.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setConfirmarRetiro(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const reg = equipoCampo.find((e) => e.id === confirmarRetiro);
                  if (reg) handleRetirarColportor(reg);
                }}
              >
                Retirar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar cierre */}
      {confirmarCierre && (
        <div className="overlay" onClick={() => setConfirmarCierre(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Cerrar este campo?</div>
            <div className="confirm-sub">
              Se registrará la fecha de cierre y todos los colportores activos
              serán retirados automáticamente.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setConfirmarCierre(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => handleCerrarCampo(confirmarCierre)}
              >
                Cerrar campo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmarEliminar && (
        <div className="overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Eliminar este campo?</div>
            <div className="confirm-sub">
              Esta acción no se puede deshacer. Se eliminarán el campo, todos
              sus registros de equipo y su historial de siembra.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setConfirmarEliminar(null)}
              >
                Cancelar
              </button>

              {/*}
              <button
                className="btn-danger"
                onClick={() => handleEliminarCampo(confirmarEliminar)}
              >
                Eliminar
              </button>
              */}
            </div>
          </div>
        </div>
      )}
                


      {/* Confirmar reactivar */}
      {confirmarReactivar && (
        <div className="overlay" onClick={() => setConfirmarReactivar(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">¿Reactivar este campo?</div>
            <div className="confirm-sub">
              La fecha de inicio se actualizará a hoy y la fecha de cierre será
              eliminada. El campo quedará activo nuevamente.
            </div>
            <div className="confirm-btns">
              <button
                className="btn-cancel"
                onClick={() => setConfirmarReactivar(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-success"
                onClick={() => handleReactivarCampo(confirmarReactivar)}
              >
                Reactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}