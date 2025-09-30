//DASHBOARD
//USUARIOS
//CLUBES
- club desactivo en el log figura como badge club eliminado
  //CANCHAS

//CATEGORIAS
//TORNEOS
- torneo eliminado no loguea.
- torneo completado no se podria editar ni eliminar ni nada.
- especificar categorias que son de tipo main vs categorias que no lo son por ejemplo MASC 7MA vs SUMA 18 o cosas asi. a las main ponele un numero 7ma = 7 y asi.
- torneo completo no se deberia poder editar en absoluto.
//RANKINGS
  //calculo automatico de puntos

//EQUIPOS/INSCRIPTIONES
- un jugador puede tener 2 inscripciones a un torneo a una categoria? a mas de una categoria que onda?
- inscribo 2 veces al mismo equipo y me permite, deberia tirar error.
- filtrar por torneos.
- sistema de pagos?

//PARTIDOS/MATCHES


//ADMIN
//LOGS
- mejorar los mensajes de logs.
- modulo esta al pedo
- entidad deberia estar a la izq


REGISTRATIONS
===============
  🎉 Esqueleto del Sistema de Inscripciones COMPLETADO

  ✅ Lo que se ha creado:

  1. Esquemas de Validación (src/lib/validations/registration.ts)

  - Validación completa de formularios de inscripción
  - Esquemas para pagos y verificación de elegibilidad
  - Opciones de estado y métodos de pago
  - Refine personalizado para validaciones complejas

  2. API Routes Completas

  - /api/registrations - CRUD principal de inscripciones
  - /api/registrations/[id] - Operaciones por ID específico
  - /api/registrations/[id]/payment - Gestión de pagos
  - /api/registrations/eligibility - Verificación de elegibilidad

  3. Componentes

  - RegistrationsHeader - Header reutilizable
  - RegistrationsTable - Tabla con paginación y filtros
  - RegistrationForm - Formulario complejo con validación en tiempo real

  4. Páginas

  - /dashboard/registrations - Lista principal
  - /dashboard/registrations/new - Crear nueva inscripción
  - /dashboard/registrations/[id] - Vista detallada

  🎯 Características Implementadas:

  🔐 Seguridad y Permisos

  - Verificación de roles y permisos en todas las APIs
  - Solo usuarios autorizados pueden ver/modificar inscripciones
  - Validaciones de estado del torneo

  🧠 Lógica de Negocio Avanzada

  - Verificación de elegibilidad en tiempo real:
    - Restricciones por género, edad, ranking
    - Verificación de cupos disponibles
    - Detección de inscripciones duplicadas
    - Estado del torneo y fechas

  💰 Sistema de Pagos

  - Gestión de pagos parciales y completos
  - Múltiples métodos de pago
  - Historial de transacciones
  - Estados automáticos según pago

  📊 Estados y Flujos

  - PENDING → CONFIRMED → PAID
  - WAITLIST para cuando no hay cupos
  - CANCELLED para cancelaciones

  🎨 UI/UX Consistente

  - Mismo patrón de diseño que el resto del proyecto
  - Formularios con validación en tiempo real
  - Badges de estado con colores consistentes
  - Tablas con paginación y filtros

  🚀 Próximos Pasos para Completar el Módulo:

  1. Agregar ruta al sidebar - Para acceso desde el menú principal
  2. Implementar notificaciones - Emails de confirmación
  3. Integración con Stripe - Pagos reales
  4. Lista de espera automática - Mover equipos cuando hay cupos
  5. Validaciones adicionales - Reglas específicas por categoría

  💡 Lógica Compleja que Falta Desarrollar:

  El esqueleto está preparado para implementar la lógica avanzada como:
  - Algoritmos de elegibilidad más complejos
  - Gestión automática de lista de espera
  - Integración con sistema de brackets
  - Notificaciones automáticas
  - Procesamiento de reembolsos

  ¿Te gustaría que empecemos a implementar alguna de estas funcionalidades específicas o prefieres revisar y probar primero lo que tenemos?

  El esqueleto está completo y funcionalmente sólido, listo para agregar la lógica específica que necesites.