// api/ordenes.js
// Obtiene órdenes de compra de un proveedor en los últimos N días.
// La API de MP solo permite consultar por día, iteramos con concurrencia limitada.

const TICKET      = process.env.MP_TICKET || 'B0689F6E-27AD-41C2-9CC6-59FE6192F3D2';
const OC_BASE     = 'https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json';
const CONCURRENCY = 8;

function toMPDate(d) {
  return String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + d.getFullYear();
}

function buildDates(days = 365) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return toMPDate(d);
  });
}

async function fetchDay(codigoProveedor, rut, fecha) {
  // Intenta por CodigoProveedor, si no por RUT directo
  const params = new URLSearchParams({ fecha, ticket: TICKET });
  if (codigoProveedor) params.set('CodigoProveedor', codigoProveedor);

  try {
    const url = `${OC_BASE}?${params}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    let list = data.Listado || [];

    // Si tenemos RUT, filtrar por él para mayor precisión
    if (rut && list.length > 0) {
      const rutClean = rut.replace(/\./g,'').replace(/-/g,'').toLowerCase();
      const filtered = list.filter(oc => {
        const rutOC = (oc.Proveedor?.RutProveedor || oc.RutProveedor || '')
          .replace(/\./g,'').replace(/-/g,'').toLowerCase();
        return rutOC === rutClean;
      });
      // Solo aplicar filtro RUT si encontró coincidencias (evitar false negatives)
      if (filtered.length > 0) list = filtered;
    }
    return list;
  } catch { return []; }
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { codigoProveedor, rut, dias = '365' } = req.query;
  if (!codigoProveedor && !rut) {
    return res.status(400).json({ error: 'Se requiere codigoProveedor o rut' });
  }

  const numDias = Math.min(parseInt(dias) || 365, 365);
  const dates   = buildDates(numDias);
  const tasks   = dates.map(fecha => () => fetchDay(codigoProveedor || null, rut || null, fecha));

  try {
    const resultados = await runWithConcurrency(tasks, CONCURRENCY);
    const seen = new Set();
    const ordenes = resultados.flat().filter(oc => {
      const id = oc.CodigoOC || oc.Codigo || oc.ID || `${oc.Nombre}_${oc.FechaCreacion}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const totalMonto = ordenes.reduce((s, oc) => {
      const m = parseFloat(oc.Monto || oc.Total || oc.MontoTotal || 0);
      return s + (isNaN(m) ? 0 : m);
    }, 0);

    return res.status(200).json({
      CodigoProveedor: codigoProveedor || null,
      TotalOrdenes: ordenes.length,
      TotalMonto: totalMonto,
      Listado: ordenes,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
