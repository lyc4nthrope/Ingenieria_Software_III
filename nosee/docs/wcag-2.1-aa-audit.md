# Revisión WCAG 2.1 nivel AA (estado actual del proyecto)

> Alcance: revisión manual del frontend en `src/` + evidencias de estilos globales. Esta matriz marca el estado por criterio y evidencia en código.

## 1. Perceptible

| Criterio | Estado | Evidencia / nota |
|---|---|---|
| 1.1.1 Contenido no textual (A) | Parcial | Existen `alt` en avatar y algunos componentes; falta confirmar cobertura total de imágenes dinámicas. |
| 1.2.x Multimedia (A/AA) | No evaluado | No se detectó manejo específico de subtítulos o audiodescripción en el código revisado. |
| 1.3.1 Info y relaciones (A) | Parcial | Uso de elementos semánticos (`main`, `nav`) y etiquetas en formularios; requiere auditoría completa por pantalla. |
| 1.3.2 Secuencia con significado (A) | Cumple (aparente) | Estructura React mantiene orden lógico en DOM en vistas principales. |
| 1.3.3 Características sensoriales (A) | No evaluado | No hay guía explícita para evitar instrucciones sólo por color/posición. |
| 1.3.4 Orientación (AA) | Parcial | Layout responsive, pero no hay política explícita de no bloqueo por orientación en todas las vistas. |
| 1.3.5 Identificar propósito de campos (AA) | Parcial | Formularios existen; falta validación de `autocomplete` en todos los inputs. |
| 1.4.1 Uso del color (A) | Parcial | Tema depende de color; faltan validaciones de que no sea el único medio en todo flujo. |
| 1.4.2 Control de audio (A) | No evaluado | Sin evidencia de autoplay de audio. |
| 1.4.3 Contraste mínimo (AA) | Parcial | Tokens de color definidos; no se validó ratio por componente. Se agrega modo alto contraste. |
| 1.4.4 Redimensionar texto (AA) | Mejorado | Se implementó menú para aumentar/reducir tamaño de texto sin zoom del navegador. |
| 1.4.5 Texto como imagen (AA) | Cumple (aparente) | No se observaron textos críticos como imagen en el código revisado. |
| 1.4.10 Reflow (AA) | Parcial | Diseño responsive en varias áreas; falta prueba completa a 320px en todas las rutas. |
| 1.4.11 Contraste no textual (AA) | Parcial | Hay `:focus-visible`; falta medición de contraste de bordes/iconos por componente. |
| 1.4.12 Espaciado de texto (AA) | Parcial | No hay control específico global; el nuevo menú prepara ajustes de legibilidad. |
| 1.4.13 Contenido en hover/focus (AA) | No evaluado | No se auditó exhaustivamente tooltips/menus complejos. |

## 2. Operable

| Criterio | Estado | Evidencia / nota |
|---|---|---|
| 2.1.1 Teclado (A) | Parcial | Navegación principal accesible; falta verificar todos los widgets personalizados. |
| 2.1.2 Sin trampas de teclado (A) | Cumple (aparente) | No se observaron traps intencionales en revisión rápida. |
| 2.1.4 Atajos con teclas (A) | No evaluado | No hay inventario de atajos del sistema. |
| 2.2.1 Tiempo ajustable (A) | No evaluado | No se auditó expiración de sesiones/tiempos. |
| 2.2.2 Pausar, detener, ocultar (A) | Mejorado | Se agregó opción “Detener animaciones”. |
| 2.3.1 Umbral de tres destellos (A) | No evaluado | No se detectaron animaciones de alto riesgo, pero falta test formal. |
| 2.4.1 Evitar bloques (A) | Cumple | Existe `skip-link` hacia `#main-content`. |
| 2.4.2 Titulado de página (A) | No evaluado | No se observó estrategia de `document.title` por ruta. |
| 2.4.3 Orden del foco (A) | Parcial | Parece consistente; requiere recorrido por todas las vistas. |
| 2.4.4 Propósito de enlaces (A) | Parcial | Enlaces principales claros; falta revisión global de enlaces contextuales. |
| 2.4.5 Múltiples vías (AA) | Parcial | Hay navegación principal, pero no hay mapa del sitio/buscador global. |
| 2.4.6 Encabezados y etiquetas (AA) | Parcial | Hay encabezados; faltan validaciones estructurales en todas las páginas. |
| 2.4.7 Foco visible (AA) | Cumple | Definido `:focus-visible` global. |
| 2.5.3 Etiqueta en nombre (A) | Parcial | No auditado en cada control. |

## 3. Comprensible

| Criterio | Estado | Evidencia / nota |
|---|---|---|
| 3.1.1 Idioma de la página (A) | No evaluado | Revisar atributo `lang` en `index.html`. |
| 3.2.1 Al foco (A) | Parcial | No se detectaron cambios de contexto automáticos masivos. |
| 3.2.2 En entrada (A) | Parcial | Falta validación en formularios complejos. |
| 3.2.3 Navegación consistente (AA) | Parcial | Navbar consistente en rutas comunes. |
| 3.2.4 Identificación consistente (AA) | Parcial | Falta inventario total de componentes repetidos. |
| 3.3.1 Identificación de errores (A) | Parcial | Hay manejo de errores pero no auditado en todos los formularios. |
| 3.3.2 Etiquetas/instrucciones (A) | Parcial | Parcialmente presente en auth/stores/publications. |
| 3.3.3 Sugerencias de error (AA) | Parcial | Depende de cada formulario; falta revisión unificada. |
| 3.3.4 Prevención de errores (AA) | No evaluado | No se identificó patrón global para acciones irreversibles. |

## 4. Robusto

| Criterio | Estado | Evidencia / nota |
|---|---|---|
| 4.1.1 Parsing (A) | Cumple (aparente) | JSX compilado por Vite; sin evidencia de marcado inválido sistemático. |
| 4.1.2 Nombre, función, valor (A) | Parcial | Controles principales con texto/aria en varios puntos; falta barrido completo. |
| 4.1.3 Mensajes de estado (AA) | Parcial | Spinners y errores visibles; falta garantizar `aria-live` en todos los estados dinámicos. |

## Mejora implementada en esta iteración

Se agregó un **menú de accesibilidad** flotante con:

- Aumentar/reducir tamaño de texto.
- Modo alto contraste y contraste inteligente.
- Detener animaciones/transiciones.
- Resaltado de enlaces.
- Fuente legible (apto para dislexia).
- Ocultar imágenes, cursor grande, altura de línea, alineación de texto y marcado visual de estructura de página.
- Lectura de página con `speechSynthesis` y región `aria-live` para avisos.
- Persistencia de preferencias en `localStorage` y atajo `Ctrl+U` para abrir/cerrar menú.

> Nota: esta mejora ayuda a cumplir varios criterios, pero **no reemplaza** una auditoría formal completa con tooling (axe/Lighthouse), contraste por componente, y pruebas manuales con teclado/lector de pantalla en cada flujo.
