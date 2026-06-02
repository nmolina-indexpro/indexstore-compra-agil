// api/licitaciones.js
// Serverless function para Vercel — proxy seguro hacia API de Mercado Público
// El ticket queda en el servidor, nunca expuesto al navegador.

const TICKET = process.env.MP_TICKET || 'B0689F6E-27AD-41C2-9CC6-59FE6192F3D2';
const BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';

export default async function handler(req, res) {
  // CORS: permite solicitudes solo desde tu propio dominio (ajusta en producción)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // caché 5 min

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { fecha, estado, codigo, q } = req.query;

  // Construir parámetros para la API oficial
  const params = new URLSearchParams({ ticket: TICKET });

  if (fecha)  params.set('fecha', fecha);
  if (estado && estado !== 'todos') params.set('estado', estado);
  if (codigo) params.set('codigo', codigo);

  const apiUrl = `${BASE_URL}?${params.toString()}`;

  try {
    const upstream = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Error desde Mercado Público: ${upstream.status}`,
        url: apiUrl.replace(TICKET, '***'),
      });
    }

    const data = await upstream.json();

    // Filtrado por texto libre (q) — se hace aquí para no exponer lógica al cliente
    let listado = data.Listado || [];

    if (q && q.trim()) {
      const query = q.trim().toLowerCase();
      const terms = query.split(/\s+/);
      listado = listado.filter(item => {
        const haystack = [
          item.Nombre,
          item.Descripcion,
          item.Comprador?.NombreOrganismo,
          item.Comprador?.CodigoOrganismo,
        ].filter(Boolean).join(' ').toLowerCase();
        return terms.every(t => haystack.includes(t));
      });
    }

    return res.status(200).json({
      Cantidad: listado.length,
      Listado: listado,
      FechaBusqueda: fecha || 'hoy',
      FuenteAPI: 'api.mercadopublico.cl',
    });

  } catch (err) {
    console.error('[MP API Error]', err.message);
    return res.status(502).json({
      error: 'No se pudo conectar con la API de Mercado Público.',
      detalle: err.message,
    });
  }
}
