# PRD — Entrada de Vehículos · Central de Carrocería y Pintura

## Original problem statement
Crea una app web responsive en español para registrar la entrada de vehículos al taller "CENTRAL DE CARROCERIA Y PINTURA". Tablet-first, también computadora y celular. Tema CLARO, alto contraste, botones/chips grandes. Logo en encabezado, login y PDF.
Fase 1: app completa SIN correo (sin SMTP). Fase 2: activar envío real con variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM_NAME, MAIL_TALLER (Gmail SMTP, no Resend/SendGrid; nunca loguear SMTP_PASS).
Datos del taller editables (nombre, teléfono, dirección, nota legal) + indicador "Correo: no configurado/activo".
Login solo personal. Asistente 7 pasos (cliente/vehículo, orden, ¿qué trae?, ¿qué se dañó?, fotos/comentarios, resumen, vista previa PDF) con borrador automático; validar solo nombre cliente, placas, kilometraje. Folio consecutivo al confirmar. PDF carta <15 MB con logo, recuadros, 4 tablas inventario Cant/Sí/No, daños, otros, comentarios, galería, nota legal, recuadros de firma en papel. Inventario con búsqueda/filtros, interruptor En taller/Entregado, detalle, editar y regenerar PDF, reenviar.
User choice: login con Google.

## Architecture
- Backend FastAPI (server.py, pdf_gen.py [reportlab + pymupdf para vista previa en PNG], mailer.py [smtplib, desactivado sin env], catalog.py). MongoDB: users, user_sessions, allowed_emails, settings, counters, entries, photos (JPEG binario).
- Auth: Emergent Google Auth + allow-list (`allowed_emails`); ADMIN_EMAIL=edga83@hotmail.com seeded as admin.
- Frontend React: Login, Inventario (/), Nueva entrada (/nueva), Detalle (/entradas/:id), Editar (/entradas/:id/editar), Éxito (/exito/:id), Configuración. Borrador en localStorage.

## User personas
Recepcionista/personal del taller en tablet; administrador del taller.

## Implemented (2026-10-02)
- Fase 1 completa: auth con allow-list, asistente 7 pasos, fotos comprimidas, vista previa PDF, folio consecutivo, éxito, inventario, detalle/edición, configuración y gestión de usuarios. Correo estructurado pero desactivado. Testing: 24/24 backend, frontend completo OK.

## Implemented (2026-10-03) — Firmas en pantalla
- Paso "Firmas" (entre Resumen y Vista previa), dos lienzos obligatorios (taller sin nombre; cliente con nombre editable y texto legal), PNG transparente + fecha/hora; se borran si se edita cualquier dato antes de confirmar.
- PDF firmado inmutable: se genera una vez al confirmar y se guarda (GridFS `pdfs` + colección `pdf_versions`). Descargar/reenviar entregan el archivo guardado. Editar crea versión nueva ("00003 - v2") con firmas nuevas; historial de versiones en el detalle.
- Entradas antiguas sin firma: descargar/reenviar abre /entradas/:id/firmar para generar v1.
- Admins: edgal1998@gmail.com, ileinn.els@gmail.com.

## Backlog
- P0: Fase 2 — configurar variables SMTP (Gmail app password) y probar envío.
- P1: Selector de fecha localizado en filtros.
- P2: Exportar inventario a Excel.
