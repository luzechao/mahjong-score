# Agari Web

A web-based Riichi Mahjong calculator powered by the [Agari](https://github.com/agari-industries/agari) scoring engine via WebAssembly.

## Features

- 🀄 **Interactive Tile Selection** - Click tiles to build your hand with a visual palette
- 📊 **Real-time Shanten** - See shanten updates as you build your hand
- 🎯 **Complete Scoring** - Calculate han, fu, and payment with full yaku breakdown
- 🎨 **Beautiful UI** - SVG-rendered tiles with smooth animations
- 🌐 **Languages** - English, Japanese, and Simplified Chinese
- ⚡ **Instant Calculation** - All processing done client-side via WebAssembly
- 📱 **Responsive Design** - Works on desktop and mobile
- 📷 **Photo Recognition** - Scan a concealed hand or one meld locally, then review and correct the tiles before applying them

### Photo recognition

Use **Scan hand** to replace the concealed hand, or select a meld type and use
**Scan meld** to fill that meld's builder. Photograph the relevant tiles
face-up, review every detection, and manually add missing tiles or correct
mistakes. Select the winning tile, meld type, and game context yourself.
Recognition can miss or misidentify tiles; do not rely on it without review.

The browser processes photos locally. The first use downloads the model and
LiteRT runtime; this app does not currently guarantee offline availability.
Camera capture requires browser/device support and should be served over HTTPS.

The bundled `mahjong_yolo.tflite` was extracted from the
[Mahjong Calculator Android v1.0 demo](https://github.com/linkoon2019/Mahjong_Caculator_YOLO_Android/releases/tag/v1.0.0).
Its project README describes the project as MIT-licensed; check the model,
training data, and upstream YOLO licensing before redistributing it.
The upstream computer-vision project's license notice is included in
`public/mahjong-model-license.txt`.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (for building WASM)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the WASM module (from the repo root):
   ```bash
   wasm-pack build crates/agari-wasm --target web --out-dir ../../web/src/lib/wasm
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for static hosting.
Run the recognition and scan-validation tests with
`node --test src/lib/scanValidation.test.mjs` (Node.js with TypeScript stripping).

## Project Structure

```
web/
├── public/
│   └── favicon.svg       # Site favicon
├── src/
│   ├── lib/
│   │   ├── components/   # Svelte components
│   │   │   ├── Tile.svelte           # SVG tile renderer
│   │   │   ├── TilePalette.svelte    # Tile selection grid
│   │   │   ├── HandDisplay.svelte    # Hand visualization
│   │   │   ├── ContextOptions.svelte # Game options
│   │   │   └── ScoreResult.svelte    # Score display
│   │   ├── wasm/         # WASM bindings (generated)
│   │   └── agari.ts      # TypeScript API wrapper
│   ├── App.svelte        # Main application
│   ├── app.css           # Global styles
│   └── main.ts           # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Tech Stack

- **[Svelte 5](https://svelte.dev/)** - UI framework with runes
- **[Vite](https://vitejs.dev/)** - Build tool
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/)** - Rust-JS interop

## Deployment

The site can be deployed to any static hosting service:

- **GitHub Pages** - Deploy with the included GitHub Actions workflow
- **Vercel** - Connect your repo for automatic deployments
- **Netlify** - Drag and drop the `dist/` folder

The GitHub Actions workflow deploys to GitHub Pages from `main`. Configure
the Pages source as **GitHub Actions**. The workflow sets the Vite base path
to the repository name for project sites. For other subpath deployments, set
`VITE_BASE_PATH` to the desired path (including leading and trailing slashes)
when building.

## License

MIT - Same as the main Agari project