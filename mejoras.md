 # Auditoría técnica del proyecto

  ## 1. Resumen general

  El proyecto está en estado de demo funcional avanzada, no en estado production-ready. Tiene una arquitectura clara y pequeña (frontend/, backend/, shared/,
  tests/), backend HTTP nativo sin dependencias, frontend estático con React/Babel desde CDN y un motor de póker compartido.

  Puntos positivos: la API básica funciona, los tests pasan (14/14), el backend tiene separación por rutas/controladores/servicios/esquemas, y el diseño desktop
  está cuidado.

  Distancia a producción: media-alta. Lo principal que falta es persistencia real, datos reales, responsive móvil sólido, build frontend profesional,
  endurecimiento de seguridad, accesibilidad, configuración de deploy y una estrategia clara de producto/datos.

  ## 2. Problemas detectados

  ### Frontend

  - React y Babel se cargan desde CDN en modo desarrollo; no hay build/bundler.
  - Mucho HTML duplicado entre páginas: nav, footer, bloques legales.
  - Muchas reglas inline, lo que complica mantenimiento y responsive.
  - Responsive móvil roto en pantallas clave: asistente, dashboard y práctica se recortan horizontalmente.
  - overflow-x: hidden oculta problemas en lugar de resolverlos.
  - Selectores de cartas y mesa de práctica no están adaptados a móvil.
  - Elementos clicables implementados como div/span, con accesibilidad limitada.
  - No hay foco visible global para botones/enlaces.
  - Enlaces legales (Términos, Privacidad, Juego responsable, Contacto) apuntan a #.
  - Hay datos demo/hardcodeados en home, ranking y dashboard.
  - Error visual real: frontend/pages/ranking.html tiene style="padting:16px...".

  ### Backend

  - Backend real existe y está bien organizado para una demo.
  - API mínima: health, dashboard summary, equity, recommendation, analyze-hand.
  - No hay autenticación ni autorización.
  - No hay persistencia de sesiones, manos, usuarios ni métricas.
  - CORS está abierto con Access-Control-Allow-Origin: *.
  - No hay rate limiting.
  - No hay logs estructurados ni request IDs.
  - El cálculo Monte Carlo es CPU-bound y corre en el event loop.
  - /src y /shared se exponen como estáticos, válido para demo pero débil para producción.

  ### Base de datos

  - No existe base de datos.
  - El dashboard usa datos demo desde backend/services/dashboard.service.js.
  - No hay migraciones, modelos, seeds ni relaciones.
  - Para producción haría falta persistir usuarios, sesiones, manos, decisiones, recomendaciones y métricas.

  ### Integración

  - El frontend sí llama endpoints reales en asistente, práctica y dashboard.
  - La mayoría de datos de producto siguen siendo hardcodeados.
  - api-client.js usa rutas relativas, sin API_BASE_URL ni configuración por entorno.
  - El asistente cae a modo local si falla la API, pero el error queda poco visible.
  - El dashboard muestra error genérico sin diagnóstico.
  - No hay contrato tipado entre frontend y backend.

  ### Seguridad

  - Buen inicio: .env.example, no hay secretos expuestos, headers básicos (nosniff, DENY, referrer).
  - Falta CSP; además el uso de Babel/CDN/inline styles dificulta una CSP fuerte.
  - Falta HSTS para producción.
  - Falta Permissions-Policy.
  - Falta limitar CORS por entorno.
  - Falta rate limiting para endpoints de cálculo.
  - Falta sanitización/validación más estricta en algunos payloads, especialmente analyze-hand.
  - No hay auth para datos privados si se implementan usuarios.

  ### Rendimiento

  - Babel transforma JSX en el navegador: no apto para producción.
  - React development desde CDN aumenta carga inicial.
  - No hay minificación, code splitting ni bundling.
  - No hay compresión HTTP.
  - No hay ETag/Last-Modified.
  - Monte Carlo puede bloquear el servidor bajo carga.
  - El trailer es pesado, aunque visualmente carga bien en desktop.
  - Fuentes Google y CDN externos hacen la app dependiente de red externa.

  ### Calidad de código

  - Tests existentes pasan.
  - Falta lint, formatter y TypeScript o validación de contratos.
  - Duplicación importante en layout, cartas y navegación.
  - Mucho estilo inline.
  - No hay repositorio Git inicializado en esta carpeta.
  - No hay lockfile, aunque el proyecto no tiene dependencias npm.
  - Faltan tests del motor de póker: evaluación de manos, empates, edge cases y probabilidades aproximadas.

  ### Deploy

  - npm start funciona como servidor Node long-running.
  - No hay vercel.json, Dockerfile, Procfile, .nvmrc, ni configuración de plataforma.
  - Mejor encaje actual: Render, Railway, Fly.io o VPS simple.
  - Para Vercel habría que convertir backend a serverless o separar frontend estático/API.
  - Falta estrategia de variables por entorno.
  - Falta build frontend.

  ## 3. Funcionalidades que faltan

  - Persistencia real de manos jugadas.
  - Historial de sesiones.
  - Dashboard basado en datos del usuario.
  - Autenticación si hay usuarios.
  - Guardado de recomendaciones.
  - Ranking de salas gestionable o basado en datos reales.
  - Páginas legales reales.
  - Estado de loading/error/success homogéneo.
  - Responsive completo en móvil.
  - Modo producción del frontend.
  - Métricas/logs de backend.
  - Seeds iniciales si se añade base de datos.

  ## 4. Mejoras recomendadas

  - Añadir Vite o similar para compilar React, eliminar Babel en navegador y servir assets versionados.
  - Mantener el diseño visual actual, pero corregir responsive y overflow.
  - Extraer layout común: nav, drawer, footer, legal blocks.
  - Crear base de datos. Para demo seria: SQLite. Para producción: Postgres con Neon/Supabase.
  - Crear tablas mínimas: users, sessions, hands, decisions, recommendations, dashboard_metrics, poker_rooms.
  - Endurecer API: CORS configurable, rate limiting, validaciones más estrictas, logs.
  - Separar motor CPU-bound si crece el tráfico: worker thread, job queue o cache.
  - Añadir tests de dominio del motor de póker y tests UI críticos.
  - Definir plataforma de deploy antes de cambiar estructura.

  ## 5. Plan de implementación

  ### Fase 1: Correcciones críticas

  - Corregir responsive móvil en asistente, práctica y dashboard.
  - Reparar enlaces legales o crear páginas.
  - Corregir typo padting.
  - Añadir foco visible y accesibilidad básica.

  ### Fase 2: Backend y lógica funcional

  - Diseñar modelos de datos.
  - Añadir base de datos.
  - Persistir sesiones, manos y decisiones.
  - Convertir dashboard demo en dashboard real.

  ### Fase 3: Integración frontend-backend

  - Crear capa API configurable por entorno.
  - Conectar dashboard, ranking e historial a datos reales.
  - Normalizar estados loading/error/success.

  ### Fase 4: Seguridad y validaciones

  - CORS por entorno.
  - Rate limiting.
  - CSP viable tras bundling.
  - Validación estricta de payloads.
  - Auth si hay datos privados.

  ### Fase 5: Testing y optimización

  - Tests del motor de póker.
  - Tests API de persistencia.
  - Tests visuales/responsive básicos.
  - Build minificado.
  - Cache, compresión y headers.

  ### Fase 6: Preparación para deploy

  - Elegir plataforma.
  - Añadir configuración deploy.
  - Documentar variables.
  - Añadir healthcheck real.
  - Validar producción end-to-end.

  ## 6. Prioridades

  Alta: responsive móvil, build frontend, persistencia real, dashboard real, CORS/rate limiting, deploy config.

  Media: refactor layout/componentes, accesibilidad, tests del motor, API client configurable, logs estructurados.

  Baja: admin para ranking, analítica avanzada, modo offline de fuentes, mejoras editoriales.

  ## 7. Archivos que probablemente habrá que modificar o crear

  - package.json: scripts de build/lint/start y dependencias si se adopta Vite.
  - frontend/assets/styles/styles.css: responsive, focus states, overflow, layouts móviles.
  - frontend/pages/*.html: eliminar duplicación, enlaces legales, scripts production.
  - frontend/src/apps/assistant/assistant-app.jsx: accesibilidad, errores, API states.
  - frontend/src/apps/practice/practice-app.jsx: responsive, reglas de apuesta, feedback.
  - frontend/src/apps/dashboard/dashboard-app.jsx: datos reales, estados y gráficos robustos.
  - frontend/src/services/api-client.js: base URL, errores, timeouts configurables.
  - backend/routes/api.routes.js: nuevas rutas.
  - backend/schemas/poker.schema.js: validación más estricta.
  - backend/services/dashboard.service.js: reemplazar datos demo por consultas.
  - Crear backend/db/*, migraciones y seeds.
  - Crear vercel.json, Dockerfile o config específica según plataforma.

  ## 8. Riesgos técnicos

  - El frontend actual se ve bien en desktop, pero móvil no está listo.
  - Sin base de datos, la app no puede ser una herramienta real de seguimiento.
  - Babel en navegador y React dev bloquean una estrategia seria de producción.
  - El backend nativo está bien para demo, pero necesita endurecimiento antes de exposición pública.
  - El motor usa Math.random() y Monte Carlo aproximado; sirve para educación, no para prometer precisión tipo solver/GTO.
  - Datos demo pueden generar expectativas engañosas si se publican como producto real.

  ## 9. Recomendación final senior

  La mejor estrategia es no rediseñar la interfaz, sino profesionalizar la base: primero arreglar responsive y accesibilidad, después introducir build frontend y
  persistencia, y finalmente endurecer seguridad/deploy. Mantendría el estilo visual actual, pero convertiría la demo en una app real por capas: datos
  persistidos, API clara, UI conectada a estado real, tests de dominio y despliegue controlado.

  Verificaciones realizadas: npm test pasa 14/14, node --check pasa en backend/shared/tests, servidor local responde, API real funciona y se validaron capturas
  desktop/mobile con Brave headless. No he modificado ningún archivo.
  