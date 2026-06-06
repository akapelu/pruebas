# Dead Grid: Asalto Táctico

Juego táctico web creado con React, TypeScript, Vite y CSS.

## Probar en local

No abras el `index.html` de la raíz haciendo doble click. Ese archivo es para Vite y se verá en blanco fuera del servidor de desarrollo.

Usa:

```bash
npm install
npm run dev
```

Luego abre la URL que imprime Vite, normalmente `http://localhost:5173`.

## Publicar en GitHub Pages

Este repo incluye `.github/workflows/pages.yml`. Para publicarlo:

1. Sube todo el proyecto a GitHub, incluyendo la carpeta `.github`.
2. En GitHub ve a `Settings > Pages`.
3. En `Build and deployment`, elige `GitHub Actions`.
4. Haz push a la rama `main`.
5. Espera a que termine la Action `Deploy GitHub Pages`.

GitHub construirá el juego con `npm run build` y publicará la carpeta `dist`.

## Publicar manualmente

También puedes generar la versión estática con:

```bash
npm run build
```

Sube el contenido de `dist/` a Netlify, Vercel, Cloudflare Pages o cualquier hosting estático.

## Cómo se juega

Recluta unidades, elige mapa y destruye la base enemiga antes de que caiga la tuya.

- Arrastra una unidad a una casilla azul para mover.
- Arrastra una unidad sobre un enemigo para atacar.
- Si el enemigo está lejos, el juego intenta crear automáticamente una orden de mover y atacar.
- Pulsa `Habilidad` para usar la habilidad de la unidad.
- Las unidades sin orden esperan automáticamente cuando pulsas `Listo`.

## Editar unidades

Las unidades están en `src/data/units.ts`.

## Editar mapas

Los mapas están en `src/data/maps.ts`.

Símbolos:

- `N`: normal
- `W`: muro
- `C`: cobertura
- `D`: terreno difícil
- `G`: hierba alta
