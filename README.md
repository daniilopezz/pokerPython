# Solver Poker

Plataforma educativa de póker con frontend estático, backend HTTP sin dependencias externas y persistencia local en JSON.

## Descripción

Solver Poker es una aplicación web que combina:
- **Guía educativa** — reglas, valor de manos, fases y glosario de Texas Hold'em
- **Simulador heads-up** — partidas contra una CPU adaptativa con feedback AI post-mano
- **Asistente AI en tiempo real** — recomendaciones de acción basadas en equity, posición y contexto
- **Dashboard de analítica** — métricas persistidas, curva de EV, distribución de acciones y errores frecuentes
- **Salas y bonos** — comparativa servida desde API con operadores reales, enlaces oficiales y bonos de registro
- **Trailer cinemático** — presentación reproducible del producto

Todo el motor de cálculo de poker (evaluador de manos, Monte Carlo equity, decisor CPU) está implementado en JavaScript puro sin dependencias, compartido entre backend y frontend.

## Requisitos

- **Node.js >= 20** (sin dependencias npm externas — todo con módulos nativos)
- Conexión a Internet solo para cargar fuentes Google y React desde CDN (en desarrollo)

## Instalación

```bash
git clone <repo-url>
cd poker
```

No hay `npm install` necesario. El proyecto no tiene dependencias externas de producción.

## Variables de entorno

Copia el archivo de ejemplo y ajusta si es necesario:

```bash
cp .env.example .env
```

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `HOST` | `127.0.0.1` | Interfaz de red del servidor |
| `PORT` | `3000` | Puerto del servidor HTTP |
| `NODE_ENV` | `development` | Activa headers de producción cuando es `production` |
| `DATA_FILE` | `data/solver-poker-store.json` | Ruta del almacén local persistente |
| `CORS_ORIGIN` | `*` en desarrollo | Orígenes permitidos, separados por coma |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Límite general por minuto/IP/ruta |
| `RATE_LIMIT_POKER_MAX_REQUESTS` | `40` | Límite por minuto/IP/ruta para endpoints de cálculo |

## Desarrollo

```bash
# Arrancar el servidor (sirve frontend + API)
npm run dev

# La aplicación queda disponible en:
# http://127.0.0.1:3000
```

## Producción

```bash
npm run check
npm test
npm run build
npm start
```

Para exponer en una IP o puerto diferente:

```bash
NODE_ENV=production HOST=0.0.0.0 PORT=8080 CORS_ORIGIN=https://tu-dominio.com npm start
```

También se incluye `Dockerfile` y `Procfile` para Render, Railway, Fly.io, Heroku-like platforms o VPS con contenedor.

## Tests

```bash
npm test
```

Los tests usan el módulo nativo `node:test` (Node 20+) y no requieren ningún framework externo.

## Estructura del proyecto

```
poker/
├── backend/
│   ├── server.js              # Punto de entrada HTTP
│   ├── app.js                 # Router principal (API vs estático)
│   ├── config/app.config.js   # Configuración y rutas de archivos
│   ├── controllers/           # Controladores (health, dashboard, poker)
│   ├── data/                  # Store JSON y seeds iniciales
│   ├── services/              # Lógica de negocio
│   ├── routes/api.routes.js   # Definición de endpoints API
│   ├── schemas/poker.schema.js# Validación de payloads
│   └── utils/                 # Errores y helpers HTTP
├── frontend/
│   ├── pages/                 # HTML de cada pantalla
│   ├── assets/styles/         # CSS global
│   └── src/
│       ├── apps/              # Apps React por pantalla (Babel in-browser)
│       │   ├── assistant/     # Asistente AI
│       │   ├── dashboard/     # Dashboard analítico
│       │   ├── practice/      # Simulador heads-up
│       │   └── trailer/       # Trailer cinemático reusable
│       ├── services/          # api-client.js (fetch wrapper)
│       ├── components/        # Helpers de cartas (vanilla)
│       └── shared/            # ui.js (nav, reveal scroll)
├── shared/
│   └── poker/
│       ├── engine.js          # Motor de poker (evaluador, Monte Carlo, CPU)
│       └── strategy.js        # Recomendaciones estratégicas
├── data/.gitkeep              # Directorio para el store local ignorado por git
├── scripts/build.js           # Build estático sin dependencias externas
├── tests/api.test.js          # Tests de integración del backend
├── .env.example               # Variables de entorno de ejemplo
└── package.json
```

## API endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/api/dashboard/summary` | Datos del dashboard analítico |
| `GET` | `/api/poker/rooms` | Salas y bonos desde el store |
| `GET` | `/api/poker/hands` | Últimas manos guardadas |
| `GET` | `/api/poker/recommendations` | Recomendaciones guardadas |
| `POST` | `/api/poker/equity` | Cálculo de equity Monte Carlo |
| `POST` | `/api/poker/recommendation` | Recomendación de acción AI |
| `POST` | `/api/poker/analyze-hand` | Análisis post-mano de errores |
| `POST` | `/api/poker/hands` | Persistencia de una mano completada |

### Ejemplo: calcular equity

```bash
curl -X POST http://localhost:3000/api/poker/equity \
  -H "Content-Type: application/json" \
  -d '{"hand":["Ah","Kh"],"board":["7h","2d","Th"],"samples":200}'
```

### Ejemplo: recomendación

```bash
curl -X POST http://localhost:3000/api/poker/recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "hand": ["Ah","Kh"],
    "board": ["7h","2d","Th"],
    "players": 3,
    "position": "BTN",
    "potSize": 120,
    "toCall": 40,
    "stack": 960,
    "style": "balanced"
  }'
```

## Notas técnicas

- El frontend usa React 18 + Babel standalone cargados desde CDN (sin bundler). Es ideal para desarrollo y demo. Para producción con alto tráfico se recomienda un paso de build (Vite, esbuild).
- Los archivos `.jsx` son transformados en el navegador por Babel — no requieren compilación previa.
- El motor de poker (`shared/poker/engine.js`) usa un patrón UMD para funcionar tanto en Node.js (backend, tests) como en el navegador (frontend).
- El dashboard combina seeds iniciales con manos reales guardadas por el simulador y recomendaciones guardadas por el asistente.
- La persistencia actual usa un archivo JSON con escrituras atomicas. Para multiusuario o alto tráfico, migrar a Postgres/Neon/Supabase o SQLite con migraciones.
- El backend añade CSP compatible con el stack actual, CORS configurable, rate limiting, ETag, gzip para assets textuales y páginas legales básicas.
