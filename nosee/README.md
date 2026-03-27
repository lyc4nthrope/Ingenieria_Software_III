# NØSEE

Aplicación web construida con React + Vite.

## UI stack oficial

- **Tailwind CSS** es la base para implementar interfaces nuevas o refactors visuales.
- **Stitch** se usa después para refinamiento visual/post-diseño.
- El proyecto mantiene su **design system** mediante variables CSS en `src/index.css`.
- Esas variables ya están expuestas a Tailwind con `@theme inline`.

## Instrucciones para agentes (Codex / Claude)

Si trabajás en UI dentro de este repo:

1. Usá **Tailwind CSS** como primera opción.
2. **No hardcodees** colores, radios, sombras o tipografía.
3. Reutilizá los tokens existentes desde Tailwind, por ejemplo:
   - `bg-app-bg`
   - `bg-app-surface`
   - `bg-app-elevated`
   - `text-app-text`
   - `text-app-text-secondary`
   - `border-app-border`
   - `rounded-app-md`
   - `shadow-app-md`
4. Preferí `className` con utilidades Tailwind sobre `style={{}}`.
5. Evitá crear CSS nuevo salvo que sea realmente necesario.
6. Después de implementar la base con Tailwind, se puede usar **Stitch** para pulir la UI.

## Documento de referencia

- Ver `docs/ui-guidelines.md`

## Comandos

```bash
npm install
npm run dev
npm run build
```
