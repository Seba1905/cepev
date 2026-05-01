'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type User = { id: string; name: string; phone: string; role: string }
type Campo = { id: string; ciudad: string; pais: string; estado: string }
type Categoria = 'CDA INTEGRAL' | 'CEPEVISTA' | 'COLPORTOR' | 'PAC' | ''

export default function ReportesPanel({ user }: { user: User }) {
  const [campos, setCampos] = useState<Campo[]>([])
  const [generando, setGenerando] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [logoHeaderBase64, setLogoHeaderBase64] = useState<string>('')
  const [logoAspect, setLogoAspect] = useState<number>(1)

  const [filtroCategoria, setFiltroCategoria] = useState<Categoria>('')
  const [filtroSiembraInicio, setFiltroSiembraInicio] = useState('')
  const [filtroSiembraFin, setFiltroSiembraFin] = useState('')
  const [filtroSiembraTipo, setFiltroSiembraTipo] = useState<'colportor' | 'campo' | 'categoria'>('campo')
  const [filtroSiembraColportor, setFiltroSiembraColportor] = useState('')
  const [filtroSiembraCategoria, setFiltroSiembraCategoria] = useState<Categoria>('')
  const [filtroSiembraCampo, setFiltroSiembraCampo] = useState('')
  const [colportores, setColportores] = useState<any[]>([])
  const [filtroCampoColportores, setFiltroCampoColportores] = useState('')
  const [filtroRankingInicio, setFiltroRankingInicio] = useState('')
  const [filtroRankingFin, setFiltroRankingFin] = useState('')

  useEffect(() => {
    fetchCampos()
    fetchColportores()
    cargarLogos()
  }, [])

  async function fetchCampos() {
    const { data } = await supabase.from('campos').select('id, ciudad, pais, estado').order('ciudad')
    setCampos(data || [])
  }

  async function fetchColportores() {
    const { data } = await supabase.from('colportores').select('id, nombre').order('nombre')
    setColportores(data || [])
  }

  async function cargarLogos() {
    try {
      const toBase64 = (url: string): Promise<string> =>
        fetch(url).then(r => r.blob()).then(b => new Promise((res, rej) => {
          const reader = new FileReader()
          reader.onloadend = () => res(reader.result as string)
          reader.onerror = rej
          reader.readAsDataURL(b)
        }))
      const [b1, b2] = await Promise.all([
        toBase64('/logo-cepev.png'),
        toBase64('/logo-header.png')
      ])
      setLogoBase64(b1)
      setLogoHeaderBase64(b2)
      // Calcular aspect ratio real del logo para la marca de agua
      const img = new Image()
      img.onload = () => setLogoAspect(img.naturalWidth / img.naturalHeight)
      img.src = b1
    } catch {}
  }

  function calcularEdad(fecha: string) {
    if (!fecha) return '—'
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() - nac.getMonth() === 0 && hoy.getDate() < nac.getDate())) edad--
    return `${edad} años`
  }

  function formatFecha(f: string) {
    if (!f) return '—'
    return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

function basePDF(titulo: string, subtitulo?: string, logo?: string, logoHeader?: string, logoAspect: number = 1) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  const drawHeaderFooter = (pageNum: number, totalPages: number) => {
    // Marca de agua con opacidad nativa de jsPDF, respetando proporción original
    if (logo) {
  try {
    const size = 70
    const imgW = logoAspect >= 1 ? size * logoAspect : size
    const imgH = logoAspect >= 1 ? size / logoAspect : size
    ;(doc as any).setGState((doc as any).GState({ opacity: 0.10 }))
    doc.addImage(logo, 'PNG', W / 2 - imgW / 2, H / 2 - imgH / 2, imgW, imgH)
    ;(doc as any).setGState((doc as any).GState({ opacity: 1 }))
  } catch (e) {}
}

    // --- Tu código de Header azul y Dorado (Sin cambios) ---
    doc.setFillColor(13, 31, 69);
    doc.rect(0, 0, W, 26, 'F');
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 26, W, 3, 'F');

    if (logoHeader) {
      try { doc.addImage(logoHeader, 'PNG', 3, 1, 20, 20); } catch (e) {}
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 166, 35);
    doc.text(titulo, W / 2, 12, { align: 'center' });

    if (subtitulo) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 200, 230);
      const sub = subtitulo.length > 80 ? subtitulo.substring(0, 80) + '...' : subtitulo;
      doc.text(sub, W / 2, 19, { align: 'center' });
    }

    // --- Footer (Sin cambios) ---
    doc.setFillColor(13, 31, 69);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setTextColor(180, 195, 220);
    doc.setFontSize(7);
    doc.text('CEPEV — Sistema de Gestión de Colportores', 14, H - 4);
    doc.text(`Página ${pageNum} de ${totalPages}`, W - 14, H - 4, { align: 'right' });
  };

  const addFooter = () => {
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      drawHeaderFooter(i, total);
    }
  };

  return { doc, addFooter, startY: 34 };
}

  // ─── REPORTE 1: Misioneros por categoría ───
  async function reporte1() {
    setGenerando('r1')
    let query = supabase.from('colportores').select('*').order('categoria').order('nombre')
    if (filtroCategoria) query = query.eq('categoria', filtroCategoria)
    const { data } = await query
    if (!data?.length) { setGenerando(null); return }

    const titulo = filtroCategoria ? `Misioneros — ${filtroCategoria}` : 'Todos los Misioneros por Categoría'
    const { doc, addFooter, startY } = basePDF(titulo, `Total: ${data.length} misioneros`, logoBase64, logoHeaderBase64, logoAspect)

    autoTable(doc, {
      startY,
      head: [['Nombre', 'Edad', 'Documento', 'Localidad', 'Ubicación', 'Pasaporte', 'Categoría']],
      body: data.map(c => [
        c.nombre,
        calcularEdad(c.fecha_nacimiento),
        `${c.tipo_documento} ${c.numero_documento}`,
        c.localidad || '—',
        c.ubicacion_actual || 'Sin campo',
        c.tiene_pasaporte ? 'Sí' : 'No',
        c.categoria
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: { 0: { cellWidth: 42 }, 6: { cellWidth: 24 } },
    })

    addFooter()
    doc.save(`misioneros${filtroCategoria ? '-' + filtroCategoria.toLowerCase().replace(/ /g, '-') : ''}.pdf`)
    setGenerando(null)
  }

  // ─── REPORTE 2: Colportores en campo ───
  async function reporte2() {
    setGenerando('r2')
    let camposQuery = supabase.from('campos').select('id, ciudad, pais, fecha_inicio').eq('estado', 'activo')
    if (filtroCampoColportores) camposQuery = camposQuery.eq('id', filtroCampoColportores)
    const { data: camposData } = await camposQuery
    if (!camposData?.length) { setGenerando(null); return }

    const { doc, addFooter, startY } = basePDF('Colportores en Campo', `Campos activos: ${camposData.length}`, logoBase64, logoHeaderBase64, logoAspect)
    let currentY = startY

    for (const campo of camposData) {
      const { data: equipo } = await supabase
        .from('campo_colportores')
        .select('*, colportores(nombre, tipo_documento, numero_documento, categoria, fecha_nacimiento)')
        .eq('campo_id', campo.id)
        .eq('estado', 'activo')

      if (!equipo?.length) continue

      if (currentY > 220) { doc.addPage(); currentY = 34 }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(13, 31, 69)
      doc.text(`Campo en ${campo.ciudad} — ${campo.pais}`, 14, currentY)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Inicio: ${formatFecha(campo.fecha_inicio)} · ${equipo.length} colportores`, 14, currentY + 5)

      autoTable(doc, {
        startY: currentY + 9,
        head: [['Nombre', 'Edad', 'Documento', 'Categoría', 'Ingresó']],
        body: equipo.map((e: any) => [
          e.colportores.nombre,
          calcularEdad(e.colportores.fecha_nacimiento),
          `${e.colportores.tipo_documento} ${e.colportores.numero_documento}`,
          e.colportores.categoria,
          formatFecha(e.fecha_ingreso)
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [245, 166, 35], textColor: [13, 31, 69], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 253] },
      })

      currentY = (doc as any).lastAutoTable.finalY + 14
    }

    addFooter()
    doc.save('colportores-en-campo.pdf')
    setGenerando(null)
  }

  // ─── REPORTE 3: Misioneros en el exterior ───
  async function reporte3() {
    setGenerando('r3')
    const { data: enExterior } = await supabase
      .from('campo_colportores')
      .select('*, colportores(nombre, tipo_documento, numero_documento, categoria, fecha_nacimiento, tiene_pasaporte), campos(ciudad, pais)')
      .eq('estado', 'activo')

    const exterior = (enExterior || [])
      .filter((e: any) => e.campos?.pais && !e.campos.pais.toLowerCase().includes('colombia'))
      .sort((a: any, b: any) => a.colportores.nombre.localeCompare(b.colportores.nombre))

    const { doc, addFooter, startY } = basePDF('Misioneros en el Exterior', `${exterior.length} misioneros fuera de Colombia`, logoBase64, logoHeaderBase64, logoAspect)

    autoTable(doc, {
      startY,
      head: [['Nombre', 'Edad', 'Documento', 'Categoría', 'Campo actual', 'País', 'Pasaporte']],
      body: exterior.map((e: any) => [
        e.colportores.nombre,
        calcularEdad(e.colportores.fecha_nacimiento),
        `${e.colportores.tipo_documento} ${e.colportores.numero_documento}`,
        e.colportores.categoria,
        `Campo en ${e.campos.ciudad}`,
        e.campos.pais,
        e.colportores.tiene_pasaporte ? 'Sí' : 'No'
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
    })

    addFooter()
    doc.save('misioneros-exterior.pdf')
    setGenerando(null)
  }

  // ─── REPORTE 4: Siembra por período ───
  async function reporte4() {
    if (!filtroSiembraInicio || !filtroSiembraFin) return
    setGenerando('r4')

    let query = supabase
      .from('siembra')
      .select('*, colportores(nombre, categoria), campos(ciudad, pais)')
      .gte('fecha', filtroSiembraInicio)
      .lte('fecha', filtroSiembraFin)
      .order('fecha')

    if (filtroSiembraTipo === 'colportor' && filtroSiembraColportor)
      query = query.eq('colportor_id', filtroSiembraColportor)
    if (filtroSiembraTipo === 'campo' && filtroSiembraCampo)
      query = query.eq('campo_id', filtroSiembraCampo)

    const { data } = await query
    let registros = data || []

    if (filtroSiembraTipo === 'categoria' && filtroSiembraCategoria)
      registros = registros.filter((r: any) => r.colportores?.categoria === filtroSiembraCategoria)

    const totalKits = registros.reduce((a: number, r: any) => a + r.kits_vendidos, 0)
    const totalIVPT = registros.reduce((a: number, r: any) => a + r.seguidores_ivpt, 0)
    const subtitulo = `${formatFecha(filtroSiembraInicio)} — ${formatFecha(filtroSiembraFin)} · ${registros.length} registros · ${totalKits} kits`
    const { doc, addFooter, startY } = basePDF('Reporte de Siembra', subtitulo, logoBase64, logoHeaderBase64, logoAspect)

    autoTable(doc, {
      startY,
      head: [['Fecha', 'Colportor', 'Categoría', 'Campo', 'Kits', 'Seg. IVPT']],
      body: registros.map((r: any) => [
        formatFecha(r.fecha),
        r.colportores?.nombre || '—',
        r.colportores?.categoria || '—',
        r.campos ? `Campo en ${r.campos.ciudad}` : '—',
        r.kits_vendidos,
        r.seguidores_ivpt
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      foot: [['', '', '', 'TOTAL', totalKits, totalIVPT]],
      footStyles: { fillColor: [245, 166, 35], textColor: [13, 31, 69], fontStyle: 'bold' },
    })

    addFooter()
    doc.save(`siembra-${filtroSiembraInicio}-${filtroSiembraFin}.pdf`)
    setGenerando(null)
  }

  // ─── REPORTE 5: Seguidores IVPT ───
  async function reporte5() {
    setGenerando('r5')
    const { data } = await supabase
      .from('siembra')
      .select('colportor_id, seguidores_ivpt, colportores(nombre, categoria)')

    const agrupado: Record<string, { nombre: string; categoria: string; total: number }> = {}
    for (const r of data || []) {
      const id = r.colportor_id
      if (!agrupado[id]) agrupado[id] = { nombre: (r as any).colportores?.nombre || '—', categoria: (r as any).colportores?.categoria || '—', total: 0 }
      agrupado[id].total += r.seguidores_ivpt
    }

    const rows = Object.values(agrupado).sort((a, b) => b.total - a.total)
    const totalIVPT = rows.reduce((a, r) => a + r.total, 0)
    const { doc, addFooter, startY } = basePDF('Reporte de Seguidores IVPT', `Total acumulado: ${totalIVPT} seguidores`, logoBase64, logoHeaderBase64, logoAspect)

    autoTable(doc, {
      startY,
      head: [['#', 'Colportor', 'Categoría', 'Total seguidores IVPT']],
      body: rows.map((r, i) => [i + 1, r.nombre, r.categoria, r.total]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center' } },
      foot: [['', '', 'TOTAL', totalIVPT]],
      footStyles: { fillColor: [245, 166, 35], textColor: [13, 31, 69], fontStyle: 'bold' },
    })

    addFooter()
    doc.save('seguidores-ivpt.pdf')
    setGenerando(null)
  }

  // ─── REPORTE 6: Resumen general ───
  async function reporte6() {
    setGenerando('r6')
    const [{ data: cols }, { data: camp }, { data: siem }] = await Promise.all([
      supabase.from('colportores').select('id, categoria, ubicacion_actual, tiene_pasaporte'),
      supabase.from('campos').select('id, ciudad, pais, estado'),
      supabase.from('siembra').select('kits_vendidos, seguidores_ivpt')
    ])

    const totalCols = cols?.length || 0
    const enCampo = cols?.filter(c => c.ubicacion_actual).length || 0
    const conPasaporte = cols?.filter(c => c.tiene_pasaporte).length || 0
    const camposActivos = camp?.filter(c => c.estado === 'activo').length || 0
    const totalKits = siem?.reduce((a, s) => a + s.kits_vendidos, 0) || 0
    const totalIVPT = siem?.reduce((a, s) => a + s.seguidores_ivpt, 0) || 0
    const categorias = ['CDA INTEGRAL', 'CEPEVISTA', 'COLPORTOR', 'PAC']
    const porCategoria = categorias.map(cat => [cat, cols?.filter(c => c.categoria === cat).length || 0])

    const { doc, addFooter, startY } = basePDF('Resumen General CEPEV', `Generado el ${new Date().toLocaleDateString('es-CO')}`, logoBase64, logoHeaderBase64, logoAspect)
    let y = startY

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(13, 31, 69)
    doc.text('Totales Generales', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total de misioneros', totalCols],
        ['Misioneros en campo actualmente', enCampo],
        ['Misioneros sin campo', totalCols - enCampo],
        ['Misioneros con pasaporte', conPasaporte],
        ['Campos activos', camposActivos],
        ['Campos totales', camp?.length || 0],
        ['Kits sembrados (histórico)', totalKits],
        ['Seguidores IVPT (histórico)', totalIVPT],
      ],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
    })

    y = (doc as any).lastAutoTable.finalY + 12
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(13, 31, 69)
    doc.text('Distribución por Categoría', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Categoría', 'Cantidad', '% del total']],
      body: porCategoria.map(([cat, count]) => [
        cat,
        count,
        totalCols > 0 ? `${Math.round((count as number / totalCols) * 100)}%` : '0%'
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [245, 166, 35], textColor: [13, 31, 69], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    })

    addFooter()
    doc.save('resumen-general-cepev.pdf')
    setGenerando(null)
  }

  // ─── REPORTE 7: Historial por colportor ───
  async function reporte7() {
    if (!filtroSiembraColportor) return
    setGenerando('r7')
    const colportor = colportores.find(c => c.id === filtroSiembraColportor)
    const { data } = await supabase
      .from('campo_colportores')
      .select('*, campos(ciudad, pais, fecha_inicio)')
      .eq('colportor_id', filtroSiembraColportor)
      .order('fecha_ingreso', { ascending: false })

    const { doc, addFooter, startY } = basePDF(
      'Historial de Campos',
      `Colportor: ${colportor?.nombre || '—'} · ${data?.length || 0} participaciones`,
      logoBase64, logoHeaderBase64, logoAspect
    )

    autoTable(doc, {
      startY,
      head: [['Campo', 'País', 'Ingresó', 'Retiró', 'Estado']],
      body: (data || []).map((e: any) => [
        `Campo en ${e.campos?.ciudad || '—'}`,
        e.campos?.pais || '—',
        formatFecha(e.fecha_ingreso),
        e.fecha_retiro ? formatFecha(e.fecha_retiro) : '—',
        e.estado === 'activo' ? 'Activo' : 'Retirado'
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
    })

    addFooter()
    doc.save(`historial-${colportor?.nombre?.toLowerCase().replace(/ /g, '-') || 'colportor'}.pdf`)
    setGenerando(null)
  }

  // ─── REPORTE 8: Sin campo activo ───
  async function reporte8() {
    setGenerando('r8')
    const { data } = await supabase
      .from('colportores')
      .select('*')
      .is('ubicacion_actual', null)
      .order('nombre')

    const { doc, addFooter, startY } = basePDF('Misioneros Sin Campo Activo', `${data?.length || 0} misioneros disponibles`, logoBase64, logoHeaderBase64, logoAspect)

    autoTable(doc, {
      startY,
      head: [['Nombre', 'Categoría', 'Documento', 'Localidad', 'Pasaporte']],
      body: (data || []).map(c => [
        c.nombre,
        c.categoria,
        `${c.tipo_documento} ${c.numero_documento}`,
        c.localidad || '—',
        c.tiene_pasaporte ? 'Sí' : 'No'
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
    })

    addFooter()
    doc.save('misioneros-sin-campo.pdf')
    setGenerando(null)
  }

  // ─── REPORTE 9: Ranking de siembra ───
  async function reporte9() {
    if (!filtroRankingInicio || !filtroRankingFin) return
    setGenerando('r9')

    const { data } = await supabase
      .from('siembra')
      .select('colportor_id, kits_vendidos, colportores(nombre, categoria)')
      .gte('fecha', filtroRankingInicio)
      .lte('fecha', filtroRankingFin)

    const agrupado: Record<string, { nombre: string; categoria: string; kits: number }> = {}
    for (const r of data || []) {
      if (!agrupado[r.colportor_id]) agrupado[r.colportor_id] = { nombre: (r as any).colportores?.nombre || '—', categoria: (r as any).colportores?.categoria || '—', kits: 0 }
      agrupado[r.colportor_id].kits += r.kits_vendidos
    }

    const rows = Object.values(agrupado).sort((a, b) => b.kits - a.kits)
    const { doc, addFooter, startY } = basePDF(
      'Ranking de Siembra',
      `${formatFecha(filtroRankingInicio)} — ${formatFecha(filtroRankingFin)}`,
      logoBase64, logoHeaderBase64, logoAspect
    )

    autoTable(doc, {
      startY,
      head: [['#', 'Colportor', 'Categoría', 'Kits sembrados']],
      body: rows.map((r, i) => [i + 1, r.nombre, r.categoria, r.kits]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 31, 69], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.row.index === 0) data.cell.styles.fillColor = [245, 166, 35]
          if (data.row.index === 1) data.cell.styles.fillColor = [200, 200, 200]
          if (data.row.index === 2) data.cell.styles.fillColor = [205, 170, 120]
        }
      },
      foot: [['', '', 'TOTAL', rows.reduce((a, r) => a + r.kits, 0)]],
      footStyles: { fillColor: [245, 166, 35], textColor: [13, 31, 69], fontStyle: 'bold' },
    })

    addFooter()
    doc.save(`ranking-siembra-${filtroRankingInicio}-${filtroRankingFin}.pdf`)
    setGenerando(null)
  }

  const reportes = [
    {
      id: 'r1', titulo: 'Misioneros', desc: 'Lista completa ordenada por equipos con datos personales.',
      icono: '📑', filtro: (
        <select className="rp-select" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as Categoria)}>
          <option value="">Todos los Equipos</option>
          {['CDA INTEGRAL', 'CEPEVISTA', 'COLPORTOR', 'PAC'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      ), action: reporte1
    },
    {
      id: 'r2', titulo: 'Colportores en Campo', desc: 'Tabla por campo con los misioneros activos.',
      icono: '📑', filtro: (
        <select className="rp-select" value={filtroCampoColportores} onChange={e => setFiltroCampoColportores(e.target.value)}>
          <option value="">Todos los campos</option>
          {campos.filter(c => c.estado === 'activo').map(c => <option key={c.id} value={c.id}>Campo en {c.ciudad}</option>)}
        </select>
      ), action: reporte2
    },
    {
      id: 'r3', titulo: 'Misioneros en el Exterior', desc: 'Todos los misioneros activos en campos en el exterior.',
      icono: '📑', filtro: null, action: reporte3
    },
    {
      id: 'r4', titulo: 'Siembra', desc: 'Registros de siembra filtrados por fecha, persona, campo o equipo.',
      icono: '📑', filtro: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="rp-filter-label">Desde</label>
              <input className="rp-input" type="date" value={filtroSiembraInicio} onChange={e => setFiltroSiembraInicio(e.target.value)} />
            </div>
            <div>
              <label className="rp-filter-label">Hasta</label>
              <input className="rp-input" type="date" value={filtroSiembraFin} onChange={e => setFiltroSiembraFin(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center' }}>
            <select className="rp-select" value={filtroSiembraTipo} onChange={e => setFiltroSiembraTipo(e.target.value as any)}>
              <option value="campo">Por campo</option>
              <option value="colportor">Por colportor</option>
              <option value="categoria">Por categoría</option>
            </select>
            {filtroSiembraTipo === 'campo' && (
              <select className="rp-select" value={filtroSiembraCampo} onChange={e => setFiltroSiembraCampo(e.target.value)}>
                <option value="">Todos los campos</option>
                {campos.map(c => <option key={c.id} value={c.id}>Campo en {c.ciudad}</option>)}
              </select>
            )}
            {filtroSiembraTipo === 'colportor' && (
              <select className="rp-select" value={filtroSiembraColportor} onChange={e => setFiltroSiembraColportor(e.target.value)}>
                <option value="">Todos los colportores</option>
                {colportores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            {filtroSiembraTipo === 'categoria' && (
              <select className="rp-select" value={filtroSiembraCategoria} onChange={e => setFiltroSiembraCategoria(e.target.value as Categoria)}>
                <option value="">Todas las categorías</option>
                {['CDA INTEGRAL', 'CEPEVISTA', 'COLPORTOR', 'PAC'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      ), action: reporte4
    },
    {
      id: 'r5', titulo: 'Seguidores IVPT', desc: 'Total de seguidores de Instagram del IVPT conseguidos por cada misionero.',
      icono: '📑', filtro: null, action: reporte5
    },
    {
      id: 'r6', titulo: 'Resumen General', desc: 'Documento de informe con totales, distribución por categoría y estadísticas globales.',
      icono: '📑', filtro: null, action: reporte6
    },
    {
      id: 'r7', titulo: 'Historial por Colportor', desc: 'Todos los campos por los que ha pasado un misionero con fechas.',
      icono: '📑', filtro: (
        <select className="rp-select" value={filtroSiembraColportor} onChange={e => setFiltroSiembraColportor(e.target.value)}>
          <option value="">Selecciona un colportor</option>
          {colportores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      ), action: reporte7
    },
    {
      id: 'r8', titulo: 'Misioneros Sin Campo', desc: 'Lista de misioneros que no están asignados a ningún campo actualmente.',
      icono: '📑', filtro: null, action: reporte8 
    },
    {
      id: 'r9', titulo: 'Ranking de Siembra', desc: 'Top de misioneros por kits sembrados en un período elegido.',
      icono: '📑', filtro: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="rp-filter-label">Desde</label>
            <input className="rp-input" type="date" value={filtroRankingInicio} onChange={e => setFiltroRankingInicio(e.target.value)} />
          </div>
          <div>
            <label className="rp-filter-label">Hasta</label>
            <input className="rp-input" type="date" value={filtroRankingFin} onChange={e => setFiltroRankingFin(e.target.value)} />
          </div>
        </div>
      ), action: reporte9
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        .rp-wrap { display: flex; flex-direction: column; height: 100%; font-family: 'DM Sans', sans-serif; }
        .rp-topbar { background: #fff; border-bottom: 1.5px solid #E4E8F0; padding: 0.9rem 1.5rem; flex-shrink: 0; }
        .rp-topbar-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #0D1F45; }
        .rp-topbar-sub { font-size: 12px; color: #8A9CC0; margin-top: 1px; }
        .rp-content { flex: 1; padding: 1.2rem 1.5rem; overflow-y: auto; }
        .rp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .rp-card { background: #fff; border: 1.5px solid #E4E8F0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.18s; }
        .rp-card:hover { border-color: #2B5BA8; box-shadow: 0 4px 16px rgba(13,31,69,0.08); }
        .rp-card-top { padding: 1.2rem 1.2rem 0.8rem; display: flex; align-items: flex-start; gap: 12px; }
        .rp-icon { width: 44px; height: 44px; border-radius: 10px; background: #F0F4FA; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .rp-card-info { flex: 1; }
        .rp-card-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: #0D1F45; margin-bottom: 3px; }
        .rp-card-desc { font-size: 12px; color: #8A9CC0; line-height: 1.5; }
        .rp-filtros { padding: 0 1.2rem 0.8rem; }
        .rp-filter-label { font-size: 10px; font-weight: 700; color: #4A6080; letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .rp-select { width: 100%; padding: 7px 10px; border: 1.5px solid #E4E8F0; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #0D1F45; background: #F7F9FD; outline: none; }
        .rp-input { width: 100%; padding: 7px 10px; border: 1.5px solid #E4E8F0; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #0D1F45; background: #F7F9FD; outline: none; box-sizing: border-box; }
        .rp-card-footer { padding: 0.8rem 1.2rem; border-top: 1.5px solid #F0F3FA; margin-top: auto; }
        .rp-download-btn { width: 100%; padding: 9px; border: none; border-radius: 8px; background: #0D1F45; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .rp-download-btn:hover { background: #1A3A6B; }
        .rp-download-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rp-download-btn.loading { background: #F5A623; color: #0D1F45; }
        @media (max-width: 768px) {
          .rp-grid { grid-template-columns: 1fr; }
          .rp-content { padding: 1rem; }
        }
      `}</style>

      <div className="rp-wrap">
        <div className="rp-topbar">
          <div className="rp-topbar-title">Reportes</div>
          <div className="rp-topbar-sub">{reportes.length} reportes disponibles · Descarga en PDF</div>
        </div>
        <div className="rp-content">
          <div className="rp-grid">
            {reportes.map(r => (
              <div key={r.id} className="rp-card">
                <div className="rp-card-top">
                  <div className="rp-icon">{r.icono}</div>
                  <div className="rp-card-info">
                    <div className="rp-card-title">{r.titulo}</div>
                    <div className="rp-card-desc">{r.desc}</div>
                  </div>
                </div>
                {r.filtro && <div className="rp-filtros">{r.filtro}</div>}
                <div className="rp-card-footer">
                  <button
                    className={`rp-download-btn ${generando === r.id ? 'loading' : ''}`}
                    onClick={r.action}
                    disabled={generando !== null}
                  >
                    {generando === r.id ? (
                      <>⏳ Generando...</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Descargar PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}