//DASHBOARD
//TORNEOS
//CLUBES
//CATEGORIAS
//USUARIOS

//ADMIN

TODO
================================
🏗️ Módulos por desarrollar:

  👥 Gestión de Usuarios/Jugadores

  - Perfiles de jugadores
  - Rankings y estadísticas
  - Gestión de equipos/parejas
  - Sistema de roles (Admin, Organizador, Jugador)

  🏆 Sistema de Partidos

  - Programación de partidos
  - Gestión de resultados
  - Árbitros y mesa de control
  - Sistema de puntajes en tiempo real

  📊 Categorías y Rankings

  - Gestión de categorías
  - Sistemas de puntuación
  - Rankings dinámicos
  - Históricos de rendimiento

  💰 Gestión Económica

  - Pagos e inscripciones
  - Premios y distribución
  - Reportes financieros
  - Gestión de sponsors

  📱 Funcionalidades Avanzadas

  - Notificaciones en tiempo real
  - App móvil/PWA
  - Streaming/transmisiones
  - Integración con redes sociales

TEST
=======================
🏆 MÓDULO DE TORNEOS - PRUEBAS

  1. Visualización y Navegación
  DONE - Lista de torneos: Verificar que se muestran todos los torneos con información básica
  DONE - Filtros: Probar filtrado por estado, tipo, fecha, club sede
  DONE - Búsqueda: Buscar torneos por nombre
  - Paginación/Scroll: Si hay muchos torneos, verificar navegación
  DONE - Detalles de torneo: Click en "Ver detalles" abre la página correcta

  2. Estados de Torneos
  DONE - DRAFT: Torneo en borrador, solo visible para admins
  DONE - PUBLISHED: Torneo publicado, visible para todos
  DONE - REGISTRATION_OPEN: Inscripciones abiertas, botón de inscribir activo
  DONE - REGISTRATION_CLOSED: Inscripciones cerradas, botón deshabilitado
  DONE - IN_PROGRESS: Torneo en curso, mostrar progreso/resultados
  DONE - COMPLETED: Torneo terminado, mostrar resultados finales
  DONE - CANCELLED: Torneo cancelado, mostrar mensaje apropiado

  3. CRUD - Creación de Torneos
  DONE - Crear torneo básico: Nombre, descripción, fechas, club sede
  DONE - Seleccionar categorías: Agregar/quitar categorías del torneo
  DONE - Agregar clubes auxiliares: Seleccionar clubes que prestan canchas
  DONE - Configuración avanzada: Precios, límites de equipos, reglas
  DONE - Validaciones: Fecha de inicio posterior a hoy, fechas coherentes
  DONE - Guardado: Crear como DRAFT por defecto

  4. CRUD - Edición de Torneos
  FAIL - Editar información básica: Solo si está en DRAFT o PUBLISHED
  DONE - Modificar fechas: Validar que no afecten inscripciones existentes
  - Agregar/quitar categorías: Solo si no hay equipos inscritos
  - Cambiar clubes auxiliares: Solo si no hay partidos programados
  - Restricciones por estado: DRAFT permite todo, otros estados tienen restricciones

  5. Gestión de Estados
  DONE - DRAFT → PUBLISHED: Validar que toda la información esté completa
  DONE - PUBLISHED → REGISTRATION_OPEN: Abrir inscripciones automáticamente
  DONE - REGISTRATION_OPEN → REGISTRATION_CLOSED: Cerrar inscripciones manualmente o automáticamente
  DONE - REGISTRATION_CLOSED → IN_PROGRESS: Iniciar torneo cuando llegue la fecha
  DONE - IN_PROGRESS → COMPLETED: Finalizar cuando todos los partidos terminen
  DONE - Cualquier estado → CANCELLED: Cancelar torneo con confirmación

  6. Inscripciones y Equipos
  - Ver inscripciones: Lista de equipos por categoría
  - Aprobar/Rechazar: Si hay moderación de inscripciones
  - Límites de equipos: No exceder máximo por categoría
  - Estados de pago: Pendiente, pagado, etc.
  - Lista de espera: Si está lleno, agregar a waitlist

  7. Programación y Partidos
  - Generar fixture: Crear partidos automáticamente
  - Asignar canchas: Distribuir partidos entre club principal y auxiliares
  - Asignar horarios: Evitar conflictos de horarios y canchas
  - Modificar partidos: Cambiar fecha, hora, cancha si es necesario
  - Resultados: Cargar resultados de partidos

  8. Clubes Participantes
  - Club sede principal: Aparece como organizador
  - Clubes auxiliares: Aparecen como participantes, prestan canchas
  - No duplicar: Un club no puede ser principal Y auxiliar del mismo torneo
  - Estadísticas: Conteos correctos en vistas de clubs

  9. Permisos y Seguridad
  - Usuario no logueado: Solo ver torneos públicos, no crear/editar
  - Usuario regular: Ver torneos, inscribirse, no editar
  - Admin: Acceso completo a todas las funciones
  - Validación server-side: Verificar permisos en backend

  10. Notificaciones y Comunicación
  - Inscripción confirmada: Email/notificación al inscribirse
  - Cambios de estado: Notificar a participantes sobre cambios
  - Recordatorios: Próximos partidos, fechas importantes
  - Resultados: Notificar resultados de partidos

 ---
🏢 MÓDULO DE CLUBES - PRUEBAS

  1. Visualización y Filtrado
  DONE - Lista de clubes: Todos los clubes activos con información básica
  DONE - Búsqueda: Por nombre, ciudad, dirección
  DONE - Filtro por estado: ACTIVE, INACTIVE, MAINTENANCE
  DONE - Filtro por ubicación: Por ciudad/estado
  DONE - Estadísticas correctas: Canchas, torneos sede, torneos auxiliares

  2. Estadísticas de Clubes
  DONE - Conteo de canchas: Total de canchas del club
  DONE - Torneos como sede: Solo torneos activos donde es sede principal
  DONE - Torneos como auxiliar: Solo torneos activos donde participa
  DONE - Sin doble conteo: No aparecer como sede Y auxiliar del mismo torneo
  DONE - Solo activos: PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS

  3. CRUD - Creación de Clubes
  DONE - Información básica: Nombre, descripción, contacto
  DONE - Ubicación: Dirección completa, coordenadas GPS
  DONE - Contacto: Teléfono, email, sitio web
  DONE - Validaciones: No nombres duplicados en la misma ciudad
  DONE - Estado por defecto: ACTIVE al crear
  DONE - Logo/Imagen: Subir y mostrar correctamente

  4. CRUD - Edición de Clubes
  DONE - Editar información: Nombre, descripción, contacto, ubicación
  DONE - NO editar estado: Campo estado no aparece en formulario de edición
  DONE - Validaciones: No nombres duplicados (excepto el propio)
  DONE - Actualización exitosa: Cambios se reflejan inmediatamente
  - Permisos: Solo admins pueden editar

  5. Gestión de Estado de Clubes
  DONE - Activar club: INACTIVE → ACTIVE
  DONE - Desactivar club: ACTIVE → INACTIVE
  DONE - Estado mantenimiento: ACTIVE ↔ MAINTENANCE
  DONE - Validaciones: No desactivar si tiene torneos activos como sede
  DONE - Validaciones: No desactivar si participa en torneos activos
  DONE - Confirmación: Diálogos de confirmación antes de cambiar estados

  6. Gestión de Canchas
  DONE - Ver canchas del club: Lista filtrable y buscable
  DONE - Crear cancha nueva: Formulario completo con todas las características
  DONE - Editar cancha: Modificar información y características
  DONE - Características básicas: Superficie, iluminación, techo
  DONE - Características avanzadas: Exterior, cristal panorámico, pared concreto, red 4m
  DONE - Estados de cancha: AVAILABLE, MAINTENANCE, RESERVED, UNAVAILABLE

  7. Características de Canchas
  DONE - 6 características implementadas: Todas funcionando correctamente
  DONE - Iconos correctos: Cada característica con su icono apropiado
  DONE - Badges y colores: Visualización clara y consistente
  DONE - Filtros: Filtrar canchas por características
  DONE - Formulario: Checkboxes funcionando correctamente

  8. Operaciones de Canchas
  DONE - Desactivar cancha: Cambiar a UNAVAILABLE
  DONE - Reactivar cancha: Cambiar de UNAVAILABLE a AVAILABLE
  - Validaciones: No desactivar si tiene partidos programados
  DONE - Estados intermedios: MAINTENANCE, RESERVED funcionando
  DONE - Confirmaciones: Diálogos antes de cambiar estados

  9. Vista de Detalles del Club
  DONE - Información completa: Todos los datos del club
  DONE - Tabs funcionando: Información, Canchas, Torneos
  DONE - Contadores correctos: Números en tabs coinciden con contenido
  DONE - Torneos sede principal: Lista correcta, solo activos
  DONE - Torneos sede auxiliar: Lista correcta con nombre de sede principal
  DONE - Enlaces funcionando: "Ver torneo" va a la página correcta

  10. Integración con Torneos
  DONE - Crear torneo: Seleccionar club como sede principal
  DONE - Agregar auxiliares: Seleccionar otros clubes para usar sus canchas
  DONE - Estadísticas actualizadas: Cambios se reflejan en conteos inmediatamente
  DONE - Validaciones cruzadas: No permitir operaciones que afecten torneos activos

  11. Permisos y Seguridad
  - Usuario no logueado: Solo visualización básica
  - Usuario regular: Ver información, no editar
  - Admin completo: Todas las operaciones permitidas
  - Validación backend: Permisos verificados en servidor
  - Errores claros: Mensajes comprensibles para usuarios

  12. Casos Edge y Errores
  DONE - Club sin canchas: Mostrar "0 canchas" correctamente
  DONE - Club sin torneos: Solo mostrar canchas
  DONE - Nombres especiales: Acentos, espacios, caracteres especiales
  DONE - Club inactivo: Comportamiento correcto en listados
  - Errores de red: Manejo gracioso de errores de API

  13. Performance y UX
  DONE - Carga rápida: Tanto lista como detalles cargan ágilmente
  DONE - Estados de carga: Spinners y feedback visual apropiado
  DONE - Mensajes de éxito: Confirmaciones después de operaciones
  DONE - Mensajes de error: Errores claros y accionables
  - Navegación fluida: Botones de volver, enlaces coherentes

  14. Responsive y Móvil
  - Vista móvil: Tablas y formularios se adaptan
  - Filtros móviles: Accesibles y fáciles de usar
  - Botones táctiles: Tamaño apropiado para dedos
  - Navegación móvil: Menús y acciones accesibles

  ---
  🔄 PRUEBAS DE INTEGRACIÓN ENTRE MÓDULOS

  1. Flujo Completo
  DONE - Crear club → Crear canchas → Crear torneo → Inscribir equipos
  DONE - Cambios de estado: Verificar que afecten ambos módulos correctamente
  DONE - Estadísticas: Conteos consistentes en ambas vistas

  2. Validaciones Cruzadas
  DONE - No desactivar club con torneos activos
  DONE - No desactivar cancha con partidos programados
  DONE - Consistencia de datos entre vistas de club y torneo