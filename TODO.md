//DASHBOARD
-

//TORNEOS
- Solamente que se puedan elegir clubes habilitados.



TEST
=======================
🏢 PRUEBAS DE CLUBES

  1. Visualización y Filtrado
  DONE - Lista de clubes: Verificar que se muestran todos los clubes activos
  DONE - Búsqueda por nombre: Probar filtro de búsqueda con nombres parciales
  DONE - Filtro por estado: Filtrar clubes por ACTIVE, INACTIVE, MAINTENANCE
  DONE - Filtro por ciudad: Verificar filtrado por ubicación
  DONE - Ordenamiento: Comprobar que se ordenan alfabéticamente por nombre

  2. Estadísticas de Clubes
  DONE - Conteo de canchas: Verificar que muestra el número correcto de canchas
  DONE - Torneos como sede: Solo torneos activos donde el club es sede principal
  DONE - Participaciones: Solo torneos activos donde el club es auxiliar (no sede)
  DONE - Sin doble conteo: Un club NO debe aparecer como sede Y participante del mismo torneo
  DONE - Estados de torneo activos: Solo contar PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS

  3. CRUD - Creación de Clubes
  - Crear club válido: Con todos los campos obligatorios
  DONE - Validación de nombre: No permitir nombres duplicados en la misma ciudad
  - Validación de campos: Email válido, teléfono, coordenadas
  DONE - Estado por defecto: Debe crearse como ACTIVE
  - Imagen/Logo: Subida y visualización correcta

  4. CRUD - Edición de Clubes
  DONE - Editar información básica: Nombre, descripción, contacto
  DONE - Editar ubicación: Dirección, ciudad, estado, país
  - NO editar estado: Verificar que el campo status no aparece en el formulario de edición
  DONE - Validación en edición: No permitir nombres duplicados (excepto el propio)
  - Permisos: Solo admins pueden editar

  5. Gestión de Estado de Clubes
  DONE - Desactivar club: Cambiar de ACTIVE a INACTIVE
  DONE - Activar club: Cambiar de INACTIVE a ACTIVE
  - Estado MAINTENANCE: Poder cambiar a/desde mantenimiento
  DONE - Validación de torneos: No permitir desactivar si tiene torneos activos
  - Permisos: Solo admins pueden cambiar estados

  6. Gestión de Canchas del Club
  - Ver canchas: Lista de canchas del club con filtros
  DONE - Crear cancha: Formulario completo con todas las características
  DONE - Editar cancha: Modificar información y características
  DONE - Desactivar cancha: Cambiar estado a UNAVAILABLE
  DONE - Reactivar cancha: Cambiar de UNAVAILABLE a AVAILABLE
  - Validación: No eliminar canchas con partidos programados

  7. Características de Canchas
  DONE - Básicas: Iluminación, Techo
  DONE - Nuevas: Juego Exterior, Cristal Panorámico, Pared de Concreto, Red a 4mts
  - Iconos: Verificar que todos los iconos se muestran correctamente
  - Badges: Colores y etiquetas apropiadas para cada característica
  - Filtros: Filtrar canchas por superficie y características

  8. Integración con Torneos
  - Crear torneo: Seleccionar club como sede principal
  - Agregar club auxiliar: Añadir clubes participantes para usar sus canchas
  - Conteos correctos: Verificar estadísticas después de crear/editar torneos
  - Estados de torneo: Cambios de estado reflejados en conteos de clubes

  9. Permisos y Seguridad
  - Usuario no logueado: Acceso denegado a todas las funciones
  - Usuario regular: Solo visualización, sin edición
  - Admin: Acceso completo a todas las funciones
  - Validación server-side: Verificar que validaciones funcionan en el backend

  10. Casos Edge
  - Club sin canchas: Debe mostrar "0 canchas"
  - Club sin torneos: Debe mostrar solo canchas, sin torneos
  - Torneo cancelado: No debe contar en estadísticas
  - Club inactivo: Verificar comportamiento en listados y selecciones
  - Nombres con caracteres especiales: Acentos, espacios, etc.

  11. Performance y UX
  - Carga rápida: Lista de clubes se carga en tiempo razonable
  - Estados de carga: Spinners y feedback visual
  - Mensajes de éxito: Confirmaciones después de acciones
  - Mensajes de error: Errores claros y comprensibles
  - Navegación: Botones de volver, cancelar, guardar

  12. Responsive y Móvil
  - Vista móvil: Tabla responsive, filtros accesibles
  - Formularios móviles: Campos y botones fáciles de usar
  - Navegación móvil: Menús y acciones accesibles