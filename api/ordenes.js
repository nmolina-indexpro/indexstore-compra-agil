// api/ordenes.js
// Obtiene todas las órdenes de compra de un proveedor en un rango de fechas.
// La API de MP solo permite consultar por día, así que iteramos en paralelo
// con concurrencia limitada para no saturar ni exceder rate limits.

const TICKET      = process.env.MP_TICKET || 'B0689F6E-27AD-41C2-9CC6-59FE6192F3D2';
const OC_BASE     = 'https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json';
const CONCURRENCY = 10; // peticiones simultáneas máximas

function toMPDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}${mm}${yy}`;
}

function buildDates(days = 365) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toMPDate(d));
  }
  return dates;
}

async function fetchDay(codigoProveedor, fecha) {
  const url = `${OC_BASE}?fecha=${fecha}&CodigoProveedor=${codigoProveedor}&ticket=${TICKET}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    return data.Listado || [];
  } catch {
    return [];
  }
}

async function runWithConcurrency(tasks, limit) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200'); // caché 1h
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { codigoProveedor, dias = '365' } = req.query;
  if (!codigoProveedor) return res.status(400).json({ error: 'Falta codigoProveedor' });

  const numDias = Math.min(parseInt(dias) || 365, 365);
  const dates   = buildDates(numDias);
  const tasks   = dates.map(fecha => () => fetchDay(codigoProveedor, fecha));

  try {
    const resultados = await runWithConcurrency(tasks, CONCURRENCY);
    const seen = new Set();
    const ordenes = resultados.flat().filter(oc => {
      const id = oc.CodigoOC || oc.Codigo || oc.ID || JSON.stringify(oc);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Calcular resumen
    const totalMonto = ordenes.reduce((s, oc) => {
      const m = parseFloat(oc.Monto || oc.Total || oc.MontoTotal || 0);
      return s + (isNaN(m) ? 0 : m);
    }, 0);

    return res.status(200).json({
      CodigoProveedor: codigoProveedor,
      TotalOrdenes: ordenes.length,
      TotalMonto: totalMonto,
      Listado: ordenes,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
