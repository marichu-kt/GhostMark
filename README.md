# GhostMark

<p align="center">
  <img src="./public/brand/ghostmark-logo.png" alt="GhostMark document ghost logo" width="112" />
</p>

<p align="center">
  <strong>Private PDF watermarking in your browser.</strong>
</p>

GhostMark adds professional watermark layers to PDF files locally in your browser. Your PDF is not uploaded.

```mermaid
flowchart LR
    A[Import PDF] --> B[Add watermark layers]
    B --> C[Preview locally]
    C --> D[Export PDF]
```

## Features

| Feature | Status |
| --- | --- |
| Text watermark | Ready |
| Image watermark | Ready |
| Pattern watermark | Ready |
| Professional seal | Ready |
| Multi-layer editing | Ready |
| Local processing | Ready |
| No upload | Ready |

## How It Works

1. Import a PDF.
2. Add one or more watermark layers.
3. Preview locally.
4. Export a new PDF.

## Privacy

GhostMark has no backend, database, analytics, cookies, telemetry, accounts, upload endpoint, or cloud sync. Files stay in browser memory while you work.

Hosted GitHub Pages may still create provider-level access logs. For sensitive documents, use the offline build in an isolated environment. GhostMark is not a certified classified-document handling system.

## Run Locally

```bash
npm install
npm run dev
npm run build
```

## Notes

- Preview is visual; export is authoritative.
- Very large PDFs can be slower.
- Vite is configured for GitHub Pages with `base: "/GhostMark/"`.

## License

MIT. See [LICENSE](LICENSE).
