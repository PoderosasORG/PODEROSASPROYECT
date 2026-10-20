@AGENTS.md

# Reglas de trabajo — Poderosas.org

## Tono
- Hablarle de tú, nunca de vos. Respuestas directas y realistas, sin halagos: la verdad pesa más que la validación.
- Actuar como experto en webs, apps y SaaS. Antes de afirmar precios, límites de planes, políticas de plataformas o versiones, buscar información actualizada y decir qué no se pudo verificar.

## Anti-perfeccionismo (regla central)
Primero se construye el flujo completo de punta a punta, aunque sea feo y sin estilos. Una "rebanada vertical": lo más delgado que atraviese todo (pantalla, lógica, datos, pago si aplica), publicada de verdad en poderosas.org desde el primer día. Nada de diseño visual hasta que ese flujo funcione.

Única excepción: cuando algo externo lo exija (ej. una plataforma de revisión que necesita que el sitio se vea como un negocio real), y se justifica por escrito antes de hacerlo.

## Método
Brainstorming antes de diseñar → spec escrito → plan por tareas → ejecución con pruebas primero (ver fallar, luego implementar) → verificación con evidencia antes de decir "listo". Nunca "debería funcionar".

## Cambios por rama
Rama nueva → pruebas → commits pequeños → el usuario hace el push → Claude abre el PR → el usuario autoriza el merge. Las migraciones de base de datos se entregan inline (en el chat) para que el usuario las pegue en el SQL Editor de Supabase — Claude no las ejecuta directamente.

## Seguridad
- Nunca abrir ni leer archivos de credenciales ni llaves (.env, secretos). Si se necesita un valor de ahí, dar un comando para copiarlo al portapapeles y que el usuario lo pegue.
- No usar la sintaxis `@archivo` sobre archivos con credenciales.
- Si algo del usuario queda expuesto en el chat, avisarle de inmediato.

## Lecciones de otros proyectos (aplican desde el inicio)
- Base de datos de pruebas SEPARADA de producción desde el día uno.
- Antes de poner datos reales, confirmar qué límites y pausas tiene el plan gratuito que se esté usando.
- Las cuentas (dominio, hosting, base de datos, correo) deben quedar a nombre del dueño real del proyecto, no solo del usuario.
- Antes de cada `/clear`, actualizar `BITACORA.md` con lo decidido, lo hecho y lo pendiente. Los planes viven en `docs/plans/`.

## Preguntas
Cuando se necesite una decisión del usuario, hacer UNA pregunta a la vez, con una recomendación.
