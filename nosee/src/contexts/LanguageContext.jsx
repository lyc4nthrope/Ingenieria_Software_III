import { createContext, useContext, useEffect, useState } from "react";

const LANG_KEY = "nosee-accessibility-lang";

const SUPPORTED_LANGS = ["es-MX", "en-US"];

function readStoredLang() {
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return raw && SUPPORTED_LANGS.includes(raw) ? raw : "es-MX";
  } catch {
    return "es-MX";
  }
}

// ── Traducciones completas ────────────────────────────────────────────────────
export const TRANSLATIONS = {
  "es-MX": {
    // ── Menú de accesibilidad ─────────────────────────────────────────────────
    a11y: {
      speechLang: "es-MX",
      triggerTitle: "Abrir menú de accesibilidad (Ctrl+U)",
      triggerLabel: "Abrir menú de accesibilidad",
      panelLabel: "Menú de accesibilidad",
      title: "Menú De Accesibilidad (CTRL+U)",
      closeLabel: "Cerrar menú",
      langButtonLabel: "🇨🇴 Español (Colombia) ▸",
      widgetLabel: "XL Widget de gran tamaño",
      fontSizeLabel: (pct) => `Tamaño actual de texto: ${pct}`,
      toolsLabel: "Herramientas de accesibilidad",
      prefsLabel: "Preferencias principales",
      decreaseText: "Reducir texto",
      stopReadingLabel: "Detener lectura",
      resetLabel: "Restablecer ajustes",
      features: {
        readPage: "Leer página",
        highContrast: "Contraste +",
        smartContrast: "Contraste inteligente",
        highlightLinks: "Resaltar enlaces",
        biggerText: "Agrandar texto",
        textSpacing: "Espaciado de texto",
        pauseAnimations: "Detener animaciones",
        hideImages: "Ocultar imágenes",
        readableFont: "Apto para dislexia",
        cursor: "Cursor",
        info: "Información",
        pageStructure: "Estructura de la página",
        lineHeight: "Altura de la línea",
        textAlignLeft: "Texto alineado",
        lightMode: "Modo día",
        nightMode: "Modo noche",
      },
      announces: {
        notAvailable: "La lectura en voz no está disponible en este navegador.",
        noContent: "No hay contenido disponible para leer.",
        reading: "Leyendo contenido de la página.",
        stopped: "Lectura detenida.",
        reset: "Ajustes de accesibilidad restablecidos.",
      },
      infoPanel: {
        title: "Acerca de este menú",
        description:
          "Este menú cumple con las pautas WCAG 2.1 nivel AA. Permite ajustar la apariencia y comportamiento de la página para mejorar tu experiencia de navegación.",
        shortcutsTitle: "Atajos de teclado",
        shortcuts: [
          { keys: "Ctrl + U", action: "Abrir / cerrar este menú" },
          { keys: "Escape", action: "Cerrar el menú" },
        ],
        featuresTitle: "Funciones disponibles",
        features: [
          "Contraste alto e inteligente",
          "Escalado de texto (90 % – 160 %)",
          "Espaciado y altura de línea",
          "Fuente apta para dislexia",
          "Resaltar enlaces",
          "Ocultar imágenes",
          "Detener animaciones",
          "Cursor ampliado",
          "Estructura de la página",
          "Lectura en voz alta",
          "Modo día / noche",
        ],
        closeInfo: "Cerrar información",
      },
    },

    // ── Navegación ────────────────────────────────────────────────────────────
    nav: {
      label: "Navegación principal",
      home: "Inicio",
      products: "Productos",
      stores: "Tiendas",
      panelAdmin: "Panel Admin",
      moderation: "Moderación",
      myOrders: "Mis Pedidos",
      login: "Iniciar sesión",
      register: "Registrarse",
      myProfile: "Mi perfil",
      logout: "Cerrar sesión",
    },

    // ── Página principal ──────────────────────────────────────────────────────
    home: {
      title: "Bienvenidos a NØSEE, plataforma colaborativa.",
      subtitle: "No sabes donde es más barato, te mostramos donde no ves.",
      loginCta: "Inicia sesión para crear y votar publicaciones.",
      loading: "Cargando publicaciones...",
      noPublications:
        "Aún no hay publicaciones. Cuando un usuario cree una, aparecerá aquí.",
      validate: "✓ Validar",
      validated: "✓ Validado",
      report: "🚩 Reportar",
      viewMore: "Ver más",
      deleteBtn: "🗑 Eliminar",
      loginToVote: "Inicia sesión para votar",
      loginToReport: "Inicia sesión para reportar",
      removeValidation: "Quitar validación",
      validatePrice: "Validar precio",
      validateLabel: (name) => `Validar precio de ${name}`,
      removeValidationLabel: (name) => `Quitar validación de ${name}`,
      reportLabel: (name) => `Reportar ${name}`,
      deleteLabel: (name) => `Eliminar publicación ${name}`,
      detailLabel: (name) => `Ver detalle de ${name}`,
      noDescription: "Sin descripción",
      product: "Producto",
      store: "Tienda",
      sending: "Enviando...",
      close: "Cerrar",
      price: "Precio:",
      storeLabel: "Tienda:",
      description: "Descripción:",
      reportPublication: "Reportar publicación",
      reportDescription: "Selecciona un motivo para reportar la publicación.",
      reportReason: "Motivo del reporte",
      selectReason: "Seleccionar motivo...",
      fakePrice: "Precio falso",
      wrongPhoto: "Foto incorrecta",
      spam: "Spam",
      offensive: "Contenido ofensivo",
      cancel: "Cancelar",
      confirmDelete: "¿Eliminar esta publicación?",
      closeDetail: "Cerrar detalle de publicación",
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    loginPage: {
      title: "Bienvenido de nuevo",
      subtitle: "Compara precios con tu comunidad",
    },
    loginForm: {
      googleLogin: "Continuar con Google",
      orEmail: "o con email",
      resendConfirmation: "Reenviar email de confirmación",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tucorreo@ejemplo.com",
      passwordLabel: "Contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      loginButton: "Iniciar sesión",
      loggingIn: "Iniciando sesión...",
      noAccount: "¿No tienes cuenta?",
      registerFree: "Regístrate gratis",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
      emailRequired: "El email es requerido",
      emailInvalid: "Email inválido",
      passwordRequired: "La contraseña es requerida",
    },

    // ── Registro ──────────────────────────────────────────────────────────────
    registerPage: {
      title: "Crea tu cuenta",
      subtitle: "Únete y empieza a comparar precios",
      verifyTitle: "Verifica tu email",
      verifySent: "Enviamos un enlace de confirmación a:",
      verifyInstruction:
        "Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.",
      emailResent: "✓ Email reenviado. Revisa tu bandeja.",
      resendEmail: "¿No llegó? Reenviar email",
      resending: "Reenviando...",
    },
    registerForm: {
      googleRegister: "Registrarme con Google",
      orForm: "o completa el formulario",
      fullNameLabel: "Nombre completo",
      fullNamePlaceholder: "Tu nombre y apellido",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tucorreo@ejemplo.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Mínimo 8 caracteres",
      confirmPasswordLabel: "Confirmar contraseña",
      confirmPasswordPlaceholder: "Repite tu contraseña",
      terms: "Al registrarte aceptas los",
      termsLink: "Términos de uso",
      and: "y la",
      privacyLink: "Política de privacidad",
      createAccount: "Crear cuenta",
      creatingAccount: "Creando cuenta...",
      hasAccount: "¿Ya tienes cuenta?",
      loginLink: "Inicia sesión",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
      fullNameRequired: "El nombre es requerido",
      emailRequired: "El email es requerido",
      emailInvalid: "Email inválido",
      passwordRequired: "La contraseña es requerida",
      passwordWeak: "La contraseña no cumple los requisitos",
      confirmRequired: "Confirma tu contraseña",
      passwordMismatch: "Las contraseñas no coinciden",
      passwordRules: ["Al menos 8 caracteres", "Una letra mayúscula", "Un número"],
      strongPassword: "Contraseña segura",
      mediumPassword: "Contraseña media",
      weakPassword: "Contraseña débil",
    },

    // ── Recuperar contraseña ──────────────────────────────────────────────────
    forgotPassword: {
      title: "Recuperar contraseña",
      subtitle: "Te enviaremos un enlace para restablecerla",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tucorreo@ejemplo.com",
      sendButton: "Enviar enlace de recuperación",
      sending: "Enviando enlace...",
      rememberPassword: "¿Recordaste tu contraseña?",
      backToLogin: "Inicia sesión",
      successTitle: "Revisa tu correo",
      successSent: "Enviamos un enlace de recuperación a:",
      successInstruction:
        "Haz clic en el enlace del correo para crear tu nueva contraseña. Si no lo ves, revisa la carpeta de spam.",
      backToLoginLink: "← Volver al inicio de sesión",
      emailRequired: "El email es requerido",
      emailInvalid: "Email inválido",
      serverError: "No se pudo enviar el correo. Intenta más tarde.",
    },

    // ── Perfil ────────────────────────────────────────────────────────────────
    profile: {
      title: "Mi perfil",
      subtitle: "Gestiona tu información personal",
      securityTitle: "Seguridad y sesión",
      changePassword: "Cambiar contraseña",
      logout: "Cerrar sesión",
      dangerZoneTitle: "Zona peligrosa",
      dangerZoneDesc:
        "Puedes desactivar tu cuenta o eliminarla permanentemente. Si tienes publicaciones, te explicaremos qué pasa con ellas antes de confirmar.",
      deleteAccount: "Eliminar cuenta",
      deleteModalTitle: "¿Qué quieres hacer con tu cuenta?",
      deleteModalSubtitle:
        "Tus publicaciones ayudan a la comunidad a encontrar mejores precios.",
      deactivateTitle: "🔒 Desactivar mi cuenta",
      deactivateDesc:
        "Tu cuenta se desactiva y no podrás iniciar sesión. Tus publicaciones permanecerán visibles para seguir ayudando a la comunidad con precios reales.",
      permanentTitle: "🗑 Eliminar cuenta permanentemente",
      permanentDesc:
        "Se eliminan tu cuenta y todos tus datos: publicaciones, votos, tiendas, historial. Esta acción es irreversible.",
      cancel: "Cancelar",
      confirmDeactivateTitle: "Confirmar desactivación",
      confirmDeactivateInfo:
        "ℹ️ Tu cuenta quedará desactivada y no podrás iniciar sesión.",
      confirmDeactivateDetail:
        "Tus publicaciones seguirán visibles para ayudar a la comunidad a comparar precios reales. Nadie sabrá que tu cuenta está desactivada.",
      back: "Atrás",
      confirmDeactivate: "Sí, desactivar mi cuenta",
      processing: "Procesando...",
      permanentModalTitle: "⚠️ Eliminación permanente",
      permanentWarning: "Esta acción no se puede deshacer. Se eliminarán permanentemente:",
      permanentItems: [
        "Tu cuenta y acceso",
        "Todas tus publicaciones de precios",
        "Tus votos y reportes",
        "Tus tiendas creadas y sus evidencias",
        "Tu historial completo",
      ],
      confirmPermanent: "Sí, eliminar todo permanentemente",
      deleting: "Eliminando...",
    },

    // ── App / General ─────────────────────────────────────────────────────────
    app: {
      skipToContent: "Saltar al contenido principal",
      loading: "Iniciando aplicación...",
      loadingPage: "Cargando...",
      notFound: "Página no encontrada",
      backHome: "Volver al inicio",
    },

    // ── Publicaciones ─────────────────────────────────────────────────────────
    publications: {
      title: "Productos",
      subtitle: "Busca y compara los mejores precios de productos en la región. Ayuda a la comunidad compartiendo publicaciones útiles.",
      createBtn: "Crear publicación",
      verifyEmailError: "Debes verificar tu email antes de publicar",
      verifyEmailWarning: "⚠️ Verifica tu email para publicar precios. Revisa tu bandeja de entrada.",
      verifyEmailTitle: "Verifica tu email primero",
      searchPlaceholder: "Buscar producto, tienda o precio...",
      loading: "Cargando publicaciones...",
      loadingDetail: "Cargando detalle...",
      noPublicationsTitle: "No hay publicaciones",
      noPublicationsDesc: "No encontramos publicaciones que coincidan con tus filtros. Intenta con otros términos o",
      beFirst: "sé el primero en publicar",
      loadMore: "Ver más publicaciones",
      errorValidate: "No se pudo validar la publicación",
      errorReport: "No se pudo reportar la publicación",
      errorDelete: "No se pudo eliminar la publicación",
      errorDetail: "No se pudo cargar el detalle de la publicación",
    },

    // ── Tarjeta de publicación ────────────────────────────────────────────────
    publicationCard: {
      unknownProduct: "Producto desconocido",
      noStore: "Sin tienda",
      user: "Usuario",
      validations: "validaciones",
      reports: "reportes",
      validating: "Validando...",
      validate: "✓ Validar",
      report: "⚠ Reportar",
      delete: "🗑 Eliminar",
      deleting: "...",
      viewMore: "Ver más",
      photoExpand: "🔍 Expandir",
      notAvailable: "Publicación no disponible",
      confirmDelete: "¿Eliminar publicación?",
      reportTitle: "Reportar publicación",
      reportTypeLabel: "Tipo de reporte:",
      reportSelect: "Seleccionar...",
      fakePrice: "Precio falso",
      wrongPhoto: "Foto incorrecta",
      spam: "Spam",
      offensive: "Contenido ofensivo",
      cancel: "Cancelar",
      sending: "Enviando...",
      expand: "Expandir",
      collapse: "Contraer",
      closePhotoLabel: "Cerrar foto ampliada",
      validateLabel: (name) => `Validar publicación de ${name}`,
      reportLabel: (name) => `Reportar publicación de ${name}`,
      deleteLabel: (name) => `Eliminar publicación de ${name}`,
      viewMoreLabel: (name) => `Ver más detalles de ${name}`,
      photoExpandLabel: (expanded, name) => `${expanded ? "Contraer" : "Expandir"} foto de ${name}`,
    },

    // ── Filtro de precios ─────────────────────────────────────────────────────
    priceFilter: {
      title: "Filtros",
      product: "🛒 Producto",
      store: "🏪 Tienda",
      productPlaceholder: "Buscar producto...",
      storePlaceholder: "Buscar tienda...",
      minPrice: "💰 Precio mínimo",
      maxPrice: "💰 Precio máximo",
      distance: "📍 Distancia máxima (km)",
      distancePlaceholder: "Sin límite",
      sortBy: "📊 Ordenar por",
      recent: "Más reciente",
      validated: "Más validadas",
      cheapest: "Más barato",
      clearFilters: "🗑 Limpiar filtros",
      activeFilter: "1 filtro activo",
      activeFilters: (n) => `${n} filtros activos`,
      maxLabel: (val) => `Máx $${val}`,
    },

    // ── Crear tienda ──────────────────────────────────────────────────────────
    createStore: {
      title: "🏪 Crear tienda",
      subtitle: "Registra una tienda física o virtual. Para tiendas físicas puedes adjuntar hasta 3 evidencias.",
    },

    // ── Formulario de tienda ──────────────────────────────────────────────────
    storeForm: {
      nameLabel: "Nombre de la tienda",
      namePlaceholder: "Ej: Supermercado Central",
      typeLabel: "Tipo de tienda",
      urlLabel: "URL de la tienda virtual",
      urlPlaceholder: "https://mitienda.com",
      submit: "Crear tienda",
      submitting: "Creando tienda...",
    },

    // ── Tipo de tienda ────────────────────────────────────────────────────────
    storeType: {
      physical: "🏬 Tienda física",
      virtual: "🌐 Tienda virtual",
      ariaLabel: "Tipo de tienda",
    },

    // ── Mapa de tienda ────────────────────────────────────────────────────────
    storeMap: {
      title: "📍 Ubicación del local",
      addressPlaceholder: "Ej: Calle 10 #25-30, Bogotá",
      searchBtn: "Buscar dirección",
      latPlaceholder: "Latitud",
      lonPlaceholder: "Longitud",
      applyBtn: "Aplicar",
      useLocationBtn: "Usar mi ubicación actual",
      gettingLocation: "Obteniendo ubicación…",
      centerMap: "Centrar mapa",
      viewOSM: "Ver punto en OpenStreetMap",
      footer: "Visualizador: Leaflet + OpenStreetMap. Geocodificación: Nominatim (gratis con límites de uso).",
      statusResolving: "Resolviendo dirección...",
      statusAddressUpdated: "Dirección actualizada desde la ubicación seleccionada.",
      statusInvalidCoords: "Ingresa latitud y longitud válidas.",
      statusSearching: "Buscando dirección...",
      statusFound: "Dirección encontrada y ubicación actualizada.",
      statusNoAddress: "Escribe una dirección para buscarla.",
      statusGetting: "Obteniendo ubicación...",
      statusCenterSelect: "Selecciona una ubicación válida para centrar el mapa.",
      statusCentered: "Mapa centrado en la ubicación seleccionada.",
      geoPrefix: "Geo:",
    },

    // ── Evidencias de tienda ──────────────────────────────────────────────────
    storeEvidence: {
      title: "🖼 Evidencias del local",
      limitReached: "Límite alcanzado (máximo 3 imágenes)",
      remove: "Quitar",
      altText: "Evidencia",
    },

    // ── Detalle de publicación ────────────────────────────────────────────────
    publicationDetail: {
      noName: "Producto sin nombre",
      unit: "Unidad:",
      noDescription: "No hay descripción",
      publishedBy: "Publicado por:",
      unknownUser: "Usuario desconocido",
      score: "Puntaje:",
      votes: "Votos:",
      comments: "Comentarios",
      noComments: "Sin comentarios por ahora.",
      storeLocation: "Ubicación de la tienda",
      noCoordinates: "No hay coordenadas disponibles para esta tienda.",
      virtualStoreLink: "Ir al enlace de la tienda virtual",
      mapAria: "Mapa de ubicación de tienda",
      mapError: "Error en el mapa:",
      mapErrorDetails: "Revisa la consola (F12) para más detalles",
    },

    // ── Tiempo relativo ───────────────────────────────────────────────────────
    timeAgo: {
      justNow: "hace unos segundos",
      minutes: (n) => `hace ${n} minuto${n !== 1 ? "s" : ""}`,
      hours: (n) => `hace ${n} hora${n !== 1 ? "s" : ""}`,
      days: (n) => `hace ${n} día${n !== 1 ? "s" : ""}`,
      weeks: (n) => `hace ${n} semana${n !== 1 ? "s" : ""}`,
      months: (n) => `hace ${n} mes${n !== 1 ? "es" : ""}`,
      years: (n) => `hace ${n} año${n !== 1 ? "s" : ""}`,
    },
  },

  // ── INGLÉS ────────────────────────────────────────────────────────────────
  "en-US": {
    // ── Menú de accesibilidad ─────────────────────────────────────────────────
    a11y: {
      speechLang: "en-US",
      triggerTitle: "Open accessibility menu (Ctrl+U)",
      triggerLabel: "Open accessibility menu",
      panelLabel: "Accessibility menu",
      title: "Accessibility Menu (CTRL+U)",
      closeLabel: "Close menu",
      langButtonLabel: "🇺🇸 English (USA) ▸",
      widgetLabel: "XL Large widget",
      fontSizeLabel: (pct) => `Current text size: ${pct}`,
      toolsLabel: "Accessibility tools",
      prefsLabel: "Main preferences",
      decreaseText: "Decrease text",
      stopReadingLabel: "Stop reading",
      resetLabel: "Reset settings",
      features: {
        readPage: "Read page",
        highContrast: "High contrast",
        smartContrast: "Smart contrast",
        highlightLinks: "Highlight links",
        biggerText: "Bigger text",
        textSpacing: "Text spacing",
        pauseAnimations: "Pause animations",
        hideImages: "Hide images",
        readableFont: "Dyslexia friendly",
        cursor: "Cursor",
        info: "Information",
        pageStructure: "Page structure",
        lineHeight: "Line height",
        textAlignLeft: "Align text left",
        lightMode: "Day mode",
        nightMode: "Night mode",
      },
      announces: {
        notAvailable: "Text-to-speech is not available in this browser.",
        noContent: "No content available to read.",
        reading: "Reading page content.",
        stopped: "Reading stopped.",
        reset: "Accessibility settings reset.",
      },
      infoPanel: {
        title: "About this menu",
        description:
          "This menu complies with WCAG 2.1 Level AA guidelines. It lets you adjust the page's appearance and behavior to improve your browsing experience.",
        shortcutsTitle: "Keyboard shortcuts",
        shortcuts: [
          { keys: "Ctrl + U", action: "Open / close this menu" },
          { keys: "Escape", action: "Close the menu" },
        ],
        featuresTitle: "Available features",
        features: [
          "High and smart contrast",
          "Text scaling (90 % – 160 %)",
          "Text spacing and line height",
          "Dyslexia-friendly font",
          "Highlight links",
          "Hide images",
          "Pause animations",
          "Bigger cursor",
          "Page structure outline",
          "Text-to-speech",
          "Day / night mode",
        ],
        closeInfo: "Close information",
      },
    },

    // ── Navegación ────────────────────────────────────────────────────────────
    nav: {
      label: "Main navigation",
      home: "Home",
      products: "Products",
      stores: "Stores",
      panelAdmin: "Admin Panel",
      moderation: "Moderation",
      myOrders: "My Orders",
      login: "Sign in",
      register: "Sign up",
      myProfile: "My profile",
      logout: "Sign out",
    },

    // ── Página principal ──────────────────────────────────────────────────────
    home: {
      title: "Welcome to NØSEE, collaborative platform.",
      subtitle: "You don't know where it's cheaper, we show you where you can't see.",
      loginCta: "Sign in to create and vote on publications.",
      loading: "Loading publications...",
      noPublications:
        "No publications yet. When a user creates one, it will appear here.",
      validate: "✓ Validate",
      validated: "✓ Validated",
      report: "🚩 Report",
      viewMore: "View more",
      deleteBtn: "🗑 Delete",
      loginToVote: "Sign in to vote",
      loginToReport: "Sign in to report",
      removeValidation: "Remove validation",
      validatePrice: "Validate price",
      validateLabel: (name) => `Validate price of ${name}`,
      removeValidationLabel: (name) => `Remove validation of ${name}`,
      reportLabel: (name) => `Report ${name}`,
      deleteLabel: (name) => `Delete publication ${name}`,
      detailLabel: (name) => `View detail of ${name}`,
      noDescription: "No description",
      product: "Product",
      store: "Store",
      sending: "Sending...",
      close: "Close",
      price: "Price:",
      storeLabel: "Store:",
      description: "Description:",
      reportPublication: "Report publication",
      reportDescription: "Select a reason to report the publication.",
      reportReason: "Report reason",
      selectReason: "Select reason...",
      fakePrice: "False price",
      wrongPhoto: "Wrong photo",
      spam: "Spam",
      offensive: "Offensive content",
      cancel: "Cancel",
      confirmDelete: "Delete this publication?",
      closeDetail: "Close publication detail",
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    loginPage: {
      title: "Welcome back",
      subtitle: "Compare prices with your community",
    },
    loginForm: {
      googleLogin: "Continue with Google",
      orEmail: "or with email",
      resendConfirmation: "Resend confirmation email",
      emailLabel: "Email address",
      emailPlaceholder: "youremail@example.com",
      passwordLabel: "Password",
      forgotPassword: "Forgot your password?",
      loginButton: "Sign in",
      loggingIn: "Signing in...",
      noAccount: "Don't have an account?",
      registerFree: "Sign up for free",
      showPassword: "Show password",
      hidePassword: "Hide password",
      emailRequired: "Email is required",
      emailInvalid: "Invalid email",
      passwordRequired: "Password is required",
    },

    // ── Registro ──────────────────────────────────────────────────────────────
    registerPage: {
      title: "Create your account",
      subtitle: "Join and start comparing prices",
      verifyTitle: "Verify your email",
      verifySent: "We sent a confirmation link to:",
      verifyInstruction:
        "Check your inbox and click the link to activate your account.",
      emailResent: "✓ Email resent. Check your inbox.",
      resendEmail: "Didn't receive it? Resend email",
      resending: "Resending...",
    },
    registerForm: {
      googleRegister: "Sign up with Google",
      orForm: "or complete the form",
      fullNameLabel: "Full name",
      fullNamePlaceholder: "Your first and last name",
      emailLabel: "Email address",
      emailPlaceholder: "youremail@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimum 8 characters",
      confirmPasswordLabel: "Confirm password",
      confirmPasswordPlaceholder: "Repeat your password",
      terms: "By signing up you agree to the",
      termsLink: "Terms of use",
      and: "and the",
      privacyLink: "Privacy policy",
      createAccount: "Create account",
      creatingAccount: "Creating account...",
      hasAccount: "Already have an account?",
      loginLink: "Sign in",
      showPassword: "Show password",
      hidePassword: "Hide password",
      fullNameRequired: "Name is required",
      emailRequired: "Email is required",
      emailInvalid: "Invalid email",
      passwordRequired: "Password is required",
      passwordWeak: "Password does not meet requirements",
      confirmRequired: "Confirm your password",
      passwordMismatch: "Passwords do not match",
      passwordRules: ["At least 8 characters", "One uppercase letter", "One number"],
      strongPassword: "Strong password",
      mediumPassword: "Medium password",
      weakPassword: "Weak password",
    },

    // ── Recuperar contraseña ──────────────────────────────────────────────────
    forgotPassword: {
      title: "Recover password",
      subtitle: "We will send you a link to reset it",
      emailLabel: "Email address",
      emailPlaceholder: "youremail@example.com",
      sendButton: "Send recovery link",
      sending: "Sending link...",
      rememberPassword: "Remember your password?",
      backToLogin: "Sign in",
      successTitle: "Check your email",
      successSent: "We sent a recovery link to:",
      successInstruction:
        "Click the link in the email to create your new password. If you don't see it, check your spam folder.",
      backToLoginLink: "← Back to sign in",
      emailRequired: "Email is required",
      emailInvalid: "Invalid email",
      serverError: "Could not send the email. Please try again later.",
    },

    // ── Perfil ────────────────────────────────────────────────────────────────
    profile: {
      title: "My profile",
      subtitle: "Manage your personal information",
      securityTitle: "Security & session",
      changePassword: "Change password",
      logout: "Sign out",
      dangerZoneTitle: "Danger zone",
      dangerZoneDesc:
        "You can deactivate your account or delete it permanently. If you have publications, we will explain what happens to them before confirming.",
      deleteAccount: "Delete account",
      deleteModalTitle: "What do you want to do with your account?",
      deleteModalSubtitle:
        "Your publications help the community find better prices.",
      deactivateTitle: "🔒 Deactivate my account",
      deactivateDesc:
        "Your account is deactivated and you won't be able to sign in. Your publications will remain visible to continue helping the community with real prices.",
      permanentTitle: "🗑 Delete account permanently",
      permanentDesc:
        "Your account and all your data are deleted: publications, votes, stores, history. This action is irreversible.",
      cancel: "Cancel",
      confirmDeactivateTitle: "Confirm deactivation",
      confirmDeactivateInfo:
        "ℹ️ Your account will be deactivated and you won't be able to sign in.",
      confirmDeactivateDetail:
        "Your publications will remain visible to help the community compare real prices. No one will know your account is deactivated.",
      back: "Back",
      confirmDeactivate: "Yes, deactivate my account",
      processing: "Processing...",
      permanentModalTitle: "⚠️ Permanent deletion",
      permanentWarning: "This action cannot be undone. The following will be permanently deleted:",
      permanentItems: [
        "Your account and access",
        "All your price publications",
        "Your votes and reports",
        "Your created stores and their evidence",
        "Your complete history",
      ],
      confirmPermanent: "Yes, delete everything permanently",
      deleting: "Deleting...",
    },

    // ── App / General ─────────────────────────────────────────────────────────
    app: {
      skipToContent: "Skip to main content",
      loading: "Starting application...",
      loadingPage: "Loading...",
      notFound: "Page not found",
      backHome: "Back to home",
    },

    // ── Publications ──────────────────────────────────────────────────────────
    publications: {
      title: "Products",
      subtitle: "Search and compare the best product prices in the region. Help the community by sharing useful publications.",
      createBtn: "Create publication",
      verifyEmailError: "You must verify your email before publishing",
      verifyEmailWarning: "⚠️ Verify your email to publish prices. Check your inbox.",
      verifyEmailTitle: "Verify your email first",
      searchPlaceholder: "Search product, store or price...",
      loading: "Loading publications...",
      loadingDetail: "Loading detail...",
      noPublicationsTitle: "No publications",
      noPublicationsDesc: "We found no publications matching your filters. Try other terms or",
      beFirst: "be the first to publish",
      loadMore: "Load more publications",
      errorValidate: "Could not validate the publication",
      errorReport: "Could not report the publication",
      errorDelete: "Could not delete the publication",
      errorDetail: "Could not load the publication detail",
    },

    // ── Publication card ──────────────────────────────────────────────────────
    publicationCard: {
      unknownProduct: "Unknown product",
      noStore: "No store",
      user: "User",
      validations: "validations",
      reports: "reports",
      validating: "Validating...",
      validate: "✓ Validate",
      report: "⚠ Report",
      delete: "🗑 Delete",
      deleting: "...",
      viewMore: "View more",
      photoExpand: "🔍 Expand",
      notAvailable: "Publication not available",
      confirmDelete: "Delete publication?",
      reportTitle: "Report publication",
      reportTypeLabel: "Report type:",
      reportSelect: "Select...",
      fakePrice: "Fake price",
      wrongPhoto: "Wrong photo",
      spam: "Spam",
      offensive: "Offensive content",
      cancel: "Cancel",
      sending: "Sending...",
      expand: "Expand",
      collapse: "Collapse",
      closePhotoLabel: "Close enlarged photo",
      validateLabel: (name) => `Validate publication of ${name}`,
      reportLabel: (name) => `Report publication of ${name}`,
      deleteLabel: (name) => `Delete publication of ${name}`,
      viewMoreLabel: (name) => `View more details of ${name}`,
      photoExpandLabel: (expanded, name) => `${expanded ? "Collapse" : "Expand"} photo of ${name}`,
    },

    // ── Price filter ──────────────────────────────────────────────────────────
    priceFilter: {
      title: "Filters",
      product: "🛒 Product",
      store: "🏪 Store",
      productPlaceholder: "Search product...",
      storePlaceholder: "Search store...",
      minPrice: "💰 Minimum price",
      maxPrice: "💰 Maximum price",
      distance: "📍 Maximum distance (km)",
      distancePlaceholder: "No limit",
      sortBy: "📊 Sort by",
      recent: "Most recent",
      validated: "Most validated",
      cheapest: "Cheapest",
      clearFilters: "🗑 Clear filters",
      activeFilter: "1 active filter",
      activeFilters: (n) => `${n} active filters`,
      maxLabel: (val) => `Max $${val}`,
    },

    // ── Create store ──────────────────────────────────────────────────────────
    createStore: {
      title: "🏪 Create store",
      subtitle: "Register a physical or virtual store. For physical stores you can attach up to 3 evidence files.",
    },

    // ── Store form ────────────────────────────────────────────────────────────
    storeForm: {
      nameLabel: "Store name",
      namePlaceholder: "Ex: Central Supermarket",
      typeLabel: "Store type",
      urlLabel: "Virtual store URL",
      urlPlaceholder: "https://mystore.com",
      submit: "Create store",
      submitting: "Creating store...",
    },

    // ── Store type ────────────────────────────────────────────────────────────
    storeType: {
      physical: "🏬 Physical store",
      virtual: "🌐 Virtual store",
      ariaLabel: "Store type",
    },

    // ── Store map ─────────────────────────────────────────────────────────────
    storeMap: {
      title: "📍 Store location",
      addressPlaceholder: "Ex: 10th Street #25-30, Bogotá",
      searchBtn: "Search address",
      latPlaceholder: "Latitude",
      lonPlaceholder: "Longitude",
      applyBtn: "Apply",
      useLocationBtn: "Use my current location",
      gettingLocation: "Getting location…",
      centerMap: "Center map",
      viewOSM: "View point on OpenStreetMap",
      footer: "Viewer: Leaflet + OpenStreetMap. Geocoding: Nominatim (free with usage limits).",
      statusResolving: "Resolving address...",
      statusAddressUpdated: "Address updated from selected location.",
      statusInvalidCoords: "Enter valid latitude and longitude.",
      statusSearching: "Searching address...",
      statusFound: "Address found and location updated.",
      statusNoAddress: "Write an address to search for it.",
      statusGetting: "Getting location...",
      statusCenterSelect: "Select a valid location to center the map.",
      statusCentered: "Map centered on the selected location.",
      geoPrefix: "Geo:",
    },

    // ── Store evidence ────────────────────────────────────────────────────────
    storeEvidence: {
      title: "🖼 Store evidence",
      limitReached: "Limit reached (maximum 3 images)",
      remove: "Remove",
      altText: "Evidence",
    },

    // ── Publication detail ────────────────────────────────────────────────────
    publicationDetail: {
      noName: "Unnamed product",
      unit: "Unit:",
      noDescription: "No description available",
      publishedBy: "Published by:",
      unknownUser: "Unknown user",
      score: "Score:",
      votes: "Votes:",
      comments: "Comments",
      noComments: "No comments yet.",
      storeLocation: "Store location",
      noCoordinates: "No coordinates available for this store.",
      virtualStoreLink: "Go to the virtual store link",
      mapAria: "Store location map",
      mapError: "Map error:",
      mapErrorDetails: "Check the console (F12) for more details",
    },

    // ── Relative time ─────────────────────────────────────────────────────────
    timeAgo: {
      justNow: "just now",
      minutes: (n) => `${n} minute${n !== 1 ? "s" : ""} ago`,
      hours: (n) => `${n} hour${n !== 1 ? "s" : ""} ago`,
      days: (n) => `${n} day${n !== 1 ? "s" : ""} ago`,
      weeks: (n) => `${n} week${n !== 1 ? "s" : ""} ago`,
      months: (n) => `${n} month${n !== 1 ? "s" : ""} ago`,
      years: (n) => `${n} year${n !== 1 ? "s" : ""} ago`,
    },
  },
};

// ── Contexto ──────────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => readStoredLang());

  const setLang = (code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    setLangState(code);
  };

  // Persist and apply lang to DOM
  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = TRANSLATIONS[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export const LANG_OPTIONS = [
  { code: "es-MX", label: "🇨🇴 Español (Colombia)" },
  { code: "en-US", label: "🇺🇸 English (USA)" },
];
