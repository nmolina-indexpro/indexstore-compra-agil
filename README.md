# IndexStore — Portal Compra Ágil
**Portal interno de oportunidades de Mercado Público para el equipo comercial de IndexStore.**

---

## Estructura del proyecto

```
indexstore-compra-agil/
├── api/
│   └── licitaciones.js     ← Backend serverless (proxy seguro a la API de MP)
├── public/
│   └── index.html          ← Frontend del portal (HTML/CSS/JS puro)
├── vercel.json             ← Configuración de rutas Vercel
├── package.json
└── README.md
```

---

## Despliegue en Vercel — paso a paso

### Requisitos previos
- Cuenta en [vercel.com](https://vercel.com) (gratis)
- Cuenta en [github.com](https://github.com) (gratis)
- Node.js 18+ instalado (para desarrollo local opcional)

---

### Paso 1 — Sube el código a GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Crea un repositorio llamado `indexstore-compra-agil` (puede ser privado ✓)
3. Sube todos los archivos de este proyecto:
   - Puedes arrastrarlos directamente en la interfaz web de GitHub
   - O usar Git en terminal:
     ```bash
     git init
     git add .
     git commit -m "Portal Compra Ágil IndexStore"
     git remote add origin https://github.com/TU_USUARIO/indexstore-compra-agil.git
     git push -u origin main
     ```

---

### Paso 2 — Conecta con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta GitHub
2. Click en **"Add New Project"**
3. Selecciona el repositorio `indexstore-compra-agil`
4. Vercel detecta automáticamente la configuración — no cambies nada
5. Click **"Deploy"**

---

### Paso 3 — Configura la variable de entorno (tu API key)

> ⚠️ Este paso es crucial. Tu ticket de API NO debe estar en el código subido a GitHub.

1. En Vercel, ve a tu proyecto → **Settings** → **Environment Variables**
2. Agrega:
   - **Name:** `MP_TICKET`
   - **Value:** `B0689F6E-27AD-41C2-9CC6-59FE6192F3D2`
   - **Environments:** Production, Preview, Development
3. Click **Save**
4. Ve a **Deployments** → click en el último deploy → **Redeploy**

---

### Paso 4 — Accede a tu portal

Tu URL quedará algo así:
```
https://indexstore-compra-agil.vercel.app
```

Comparte esa URL con tu equipo comercial. Es pública pero sin indexación en buscadores.

---

### Paso 5 — Dominio personalizado (opcional)

Para tener una URL como `oportunidades.indexstore.cl`:

1. En Vercel → tu proyecto → **Settings** → **Domains**
2. Agrega `oportunidades.indexstore.cl`
3. Vercel te dará un registro CNAME para agregar en tu DNS (donde gestionas indexstore.cl)
4. En ~10 minutos queda activo con SSL automático

---

## Desarrollo local (opcional)

```bash
npm install
npx vercel dev
```
Abre `http://localhost:3000`

---

## Cómo personalizar

### Cambiar palabras clave por defecto
Edita `public/index.html`, busca el array `DEFAULT_KEYWORDS`:
```js
const DEFAULT_KEYWORDS = [
  'notebook','pantalla notebook','cargador notebook',
  // agrega o quita los que necesites
];
```

### Cambiar el título/marca
En `public/index.html`, busca y edita:
- `<title>IndexStore — Oportunidades Compra Ágil</title>`
- El texto en `.header-title`

### Agregar más endpoints de API
En `api/licitaciones.js` puedes agregar lógica adicional: 
filtros por región, tipo de organismo, etc.

---

## Seguridad

- El ticket de API **nunca viaja al navegador** — queda en el servidor Vercel
- El portal no tiene login, pero la URL solo la conoce tu equipo
- Para agregar contraseña, puedes usar [Vercel Password Protection](https://vercel.com/docs/security/deployment-protection) (plan Pro) o agregar autenticación básica en el serverless function

---

## Soporte API Mercado Público
- Documentación: https://api.mercadopublico.cl
- Email soporte: api@chilecompra.cl
- La API de Compra Ágil usa el mismo endpoint de licitaciones con filtros de fecha
