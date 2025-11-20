// src/app/data/nav.js
export const NAV = [
  // ============================================
  // SUPER ADMIN - Configuración del sistema
  // ============================================
  { 
    label: "Roles", 
    path: "roles", 
    roles: [
      "Desarrollador Junior", 
      "Desarrollador de software"
    ]
  },
  { 
    label: "Usuarios", 
    path: "usuarios", 
    roles: [
      "Desarrollador Junior", 
      "Desarrollador de software"
    ]
  },
  { 
    label: "Estados", 
    path: "estados", 
    roles: [
      "Desarrollador Junior", 
      "Desarrollador de software"
    ]
  },

  // ============================================
  // ADMIN - Métricas y análisis
  // ============================================
  { 
    label: "Métricas", 
    path: "metricas", 
    roles: [
      "Analista comercial", 
      "recursos_humanos", 
      "Directora administrativa",
      "Gerente administrativo", 
      "Gerente comercial", 
      "Analista de Talento Humano",
      "Desarrollador Junior", 
      "Desarrollador de software",

      "Lider redes", 
      "Lider talento humano", 
    ]
  },

  // ============================================
  // LÍDERES - Gestión de equipos
  // ============================================
  { 
    label: "Asignar", 
    path: "asignar", 
    description: "Panel de control en tiempo real, asignación de horarios y solicitudes",
    roles: [
      "Lider administrativo", 
      "Lider comercial", 
      "Lider de cartera",
      "Lider de control interno", 
      "Lider de creditos", 
      "Lider logistico",
      "Lider redes", 
      "Lider talento humano", 
      "Lider desarrollo digital",
      "Socio", 
      "líder de productos",
      "Desarrollador Junior", 
      "Desarrollador de software"
    ]
  },
  { 
    label: "Asesores", 
    path: "asesores", 
    description: "Gestión de asesores y métricas del equipo",
    roles: [
      "Lider administrativo", 
      "Lider comercial", 
      "Lider de cartera",
      "Lider de control interno", 
      "Lider de creditos", 
      "Lider logistico",
      "Lider redes", 
      "Lider talento humano", 
      "Lider desarrollo digital",
      "Socio", 
      "líder de productos",
      "Desarrollador Junior", 
      "Desarrollador de software"
    ]
  },

  // ============================================
  // GENERAL - Acceso para todos
  // ============================================
  { 
    label: "Dashboard", 
    path: "dashboard", 
    description: "Panel principal con información general",
    roles: ["*"] // Todos los usuarios
  },
  
  // ============================================
  // TRABAJADORES - Control personal
  // ============================================
  { 
    label: "Marcador", 
    path: "marcador", 
    description: "Marcar entrada/salida, breaks y almuerzos",
    roles: [
      // Aprendices y auxiliares
      "Aprendiz sena",
      "Auxiliar administrativo",
      "Auxiliar contable",
      "Auxiliar de logistica",
      "Auxiliar de talento humano",
      "Auxiliar de cartera",
      "Aux control interno",
      "Axuliar SST seguridad y salud en el trabajo",
      "Auxiliar de Diseño Grafico",
      "Auxiliar de Programacion",
      
      // Asesores
      "Asesor comercial",
      "Asesor de redes",
      "Asesor Externo",
      "Asesor Freelance",
      "Asesor comercial Aliado",
      "Asesor Freelance Home Office",
      
      // Gestores
      "Gestor comercial",
      "Gestor creditos",
      
      // Supervisores y coordinadores
      "Supervisor de zona",
      "Coordinador de Zona",
      
      // Aliados
      "Aliado Comercial",
      
      // Staff especializado
      "Contadora",
      
      // Desarrollo
      "Desarrollador Junior",
      "Desarrollador de software"
    ]
  },
  { 
    label: "Horarios", 
    path: "horarios", 
    description: "Historial personal de asistencia y estadísticas",
    roles: [
      // Aprendices y auxiliares
      "Aprendiz sena",
      "Auxiliar administrativo",
      "Auxiliar contable",
      "Auxiliar de logistica",
      "Auxiliar de talento humano",
      "Auxiliar de cartera",
      "Aux control interno",
      "Axuliar SST seguridad y salud en el trabajo",
      "Auxiliar de Diseño Grafico",
      "Auxiliar de Programacion",
      
      // Asesores
      "Asesor comercial",
      "Asesor de redes",
      "Asesor Externo",
      "Asesor Freelance",
      "Asesor comercial Aliado",
      "Asesor Freelance Home Office",
      
      // Gestores
      "Gestor comercial",
      "Gestor creditos",
      
      // Supervisores y coordinadores
      "Supervisor de zona",
      "Coordinador de Zona",
      
      // Aliados
      "Aliado Comercial",
      
      // Staff especializado
      "Contadora",
      
      // Desarrollo
      "Desarrollador Junior",
      "Desarrollador de software"
    ]
  },
];

// ============================================
// UTILIDADES PARA NAVEGACIÓN
// ============================================

/**
 * Obtiene las rutas disponibles para un rol específico
 * @param {string} userRole - Rol del usuario
 * @returns {Array} - Array de objetos de navegación
 */
export function getNavForRole(userRole) {
  return NAV.filter(item => {
    // Si el item permite todos los roles (*)
    if (item.roles.includes("*")) return true;
    // Si el rol del usuario está en la lista
    return item.roles.includes(userRole);
  });
}

/**
 * Verifica si un usuario tiene acceso a una ruta
 * @param {string} path - Ruta a verificar
 * @param {string} userRole - Rol del usuario
 * @returns {boolean}
 */
export function hasAccessToRoute(path, userRole) {
  const route = NAV.find(item => item.path === path);
  if (!route) return false;
  if (route.roles.includes("*")) return true;
  return route.roles.includes(userRole);
}

/**
 * Obtiene información de una ruta específica
 * @param {string} path - Ruta
 * @returns {Object|null}
 */
export function getRouteInfo(path) {
  return NAV.find(item => item.path === path) || null;
}

// ============================================
// GRUPOS DE ROLES (para facilitar gestión)
// ============================================

export const ROLE_GROUPS = {
  SUPER_ADMIN: [
    "Desarrollador Junior",
    "Desarrollador de software"
  ],
  
  ADMIN: [
    "Analista comercial",
    "recursos_humanos",
    "Directora administrativa",
    "Gerente administrativo",
    "Gerente comercial",
    "Analista de Talento Humano"
  ],
  
  LIDERES: [
    "Lider administrativo",
    "Lider comercial",
    "Lider de cartera",
    "Lider de control interno",
    "Lider de creditos",
    "Lider logistico",
    "Lider redes",
    "Lider talento humano",
    "Lider desarrollo digital",
    "Socio",
    "líder de productos"
  ],
  
  ASESORES: [
    "Asesor comercial",
    "Asesor de redes",
    "Asesor Externo",
    "Asesor Freelance",
    "Asesor comercial Aliado",
    "Asesor Freelance Home Office"
  ],
  
  AUXILIARES: [
    "Aprendiz sena",
    "Auxiliar administrativo",
    "Auxiliar contable",
    "Auxiliar de logistica",
    "Auxiliar de talento humano",
    "Auxiliar de cartera",
    "Aux control interno",
    "Axuliar SST seguridad y salud en el trabajo",
    "Auxiliar de Diseño Grafico",
    "Auxiliar de Programacion"
  ],
  
  GESTORES: [
    "Gestor comercial",
    "Gestor creditos"
  ],
  
  SUPERVISORES: [
    "Supervisor de zona",
    "Coordinador de Zona"
  ]
};

/**
 * Verifica si un rol pertenece a un grupo
 * @param {string} role - Rol del usuario
 * @param {string} group - Nombre del grupo (ej: 'LIDERES')
 * @returns {boolean}
 */
export function isInRoleGroup(role, group) {
  return ROLE_GROUPS[group]?.includes(role) || false;
}

/**
 * Obtiene el grupo de un rol
 * @param {string} role - Rol del usuario
 * @returns {string|null}
 */
export function getRoleGroup(role) {
  for (const [groupName, roles] of Object.entries(ROLE_GROUPS)) {
    if (roles.includes(role)) return groupName;
  }
  return null;
}