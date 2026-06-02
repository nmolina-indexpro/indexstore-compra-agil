// api/proveedor.js
// Resuelve RUT → CodigoProveedor interno de Mercado Público

const TICKET = process.env.MP_TICKET || 'B0689F6E-27AD-41C2-9CC6-59FE6192F3D2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { rut } = req.query;
  if (!rut) return res.status(400).json({ error: 'Falta parámetro rut' });

  const url = `https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarProveedor?rutempresaproveedor=${encodeURIComponent(rut)}&ticket=${TICKET}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return res.status(r.status).json({ error: `MP devolvió ${r.status}` });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
