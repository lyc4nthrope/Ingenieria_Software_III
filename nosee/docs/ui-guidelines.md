# UI Guidelines

## Regla principal

En este proyecto la convención visual es:

**Tailwind CSS primero → Stitch después**

Eso significa:

- la implementación base de la UI se hace con **Tailwind**
- el refinamiento visual o iteraciones de diseño se hacen después con **Stitch**

## Cómo estilizar

### Sí hacer

- usar `className` con utilidades Tailwind
- reutilizar los tokens ya definidos en `src/index.css`
- mantener consistencia con el design system existente
- migrar gradualmente estilos inline a Tailwind cuando se toque una vista

### No hacer

- no hardcodear colores (`#fff`, `#000`, etc.) sin necesidad
- no introducir otro sistema de componentes visuales como base
- no duplicar tokens visuales ya existentes
- no preferir `style={{}}` si puede resolverse con Tailwind

## Tokens disponibles en Tailwind

Estos tokens salen del design system actual y están expuestos mediante `@theme inline`:

### Colores

- `bg-app-bg`
- `bg-app-surface`
- `bg-app-elevated`
- `bg-app-hover`
- `text-app-text`
- `text-app-text-secondary`
- `text-app-text-muted`
- `text-app-accent`
- `bg-app-accent-soft`
- `border-app-border`
- `border-app-border-soft`

### Radios

- `rounded-app-sm`
- `rounded-app-md`
- `rounded-app-lg`
- `rounded-app-xl`

### Sombras

- `shadow-app-sm`
- `shadow-app-md`
- `shadow-app-lg`

## Patrón recomendado

### Preferido

```jsx
<div className="bg-app-elevated text-app-text rounded-app-lg border border-app-border p-4 shadow-app-md">
  Contenido
</div>
```

### Evitar

```jsx
<div
  style={{
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    borderRadius: "16px",
  }}
>
  Contenido
</div>
```

## Instrucción sugerida para Claude

Podés pegarle esto:

> Usa Tailwind CSS como base de estilos en este proyecto. No hardcodees colores, radios, sombras ni tipografía. Reutiliza los tokens definidos en `src/index.css` y expuestos vía Tailwind (`bg-app-elevated`, `text-app-text`, `border-app-border`, etc.). Prefiere `className` con utilidades Tailwind sobre `style={{}}` o CSS nuevo. Después del layout base, Stitch puede usarse para refinamiento visual.
