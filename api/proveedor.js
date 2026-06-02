// api/proveedor.js
// Resuelve RUT → CodigoProveedor interno de Mercado Público
// Estrategia: prueba el endpoint oficial, si falla busca en OC del día actual

const TICKET = process.env.MP_TICKET || 'B0689F6E-27AD-41C2-9CC6-59FE6192F3D2';

function toMPDate(d) {
  return String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + d.getFullYear();
}

async function buscarEnOC(rut, fecha) {
  // Busca en OC del día y extrae el CodigoProveedor que coincide con el RUT
  const url = `https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=${fecha}&ticket=${TICKET}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const data = await r.json();
    const list = data.Listado || [];
    const rutClean = rut.replace(/\./g,'').replace(/-/g,'').toLowerCase();
    const match = list.find(oc => {
      const rutOC = (oc.Proveedor?.RutProveedor || oc.RutProveedor || '')
        .replace(/\./g,'').replace(/-/g,'').toLowerCase();
      return rutOC === rutClean;
    });
    if (match) return match.Proveedor?.CodigoProveedor || match.CodigoProveedor || null;
  } catch { return null; }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { rut } = req.query;
  if (!rut) return res.status(400).json({ error: 'Falta parámetro rut' });

  // 1) Intentar endpoint oficial
  try {
    const url = `https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarProveedor?rutempresaproveedor=${encodeURIComponent(rut)}&ticket=${TICKET}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      const codigo = data.CodigoEmpresa || data.Codigo ||
        (data.Listado && data.Listado[0]?.CodigoEmpresa) || null;
      if (codigo) return res.status(200).json({ CodigoEmpresa: codigo, fuente: 'oficial' });
    }
  } catch { /* continuar con fallback */ }

  // 2) Fallback: buscar en OC de los últimos 30 días
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const codigo = await buscarEnOC(rut, toMPDate(d));
    if (codigo) return res.status(200).json({ CodigoEmpresa: codigo, fuente: `oc_dia_${i}` });
  }

  return res.status(404).json({ error: 'No se encontró el código del proveedor', rut });
}
