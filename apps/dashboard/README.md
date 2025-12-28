# Unit09 Dashboard

A minimal dashboard for the Unit09 project. It provides a visual overview of
repositories observed by Unit09, generated modules, fork variants, and global
metrics.

The dashboard is built with Next.js and consumes the HTTP API exposed by the
`@unit09/api` service.

## Development

```bash
npm install
npm run dev
```

The dashboard expects the API to be reachable at `http://localhost:8080/api` by
default. You can override this using:

- `NEXT_PUBLIC_UNIT09_API_BASE_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`

## Pages

- `/` — high-level overview, cards plus activity chart
- `/repos` — list of observed repositories
- `/modules` — gallery of generated modules
- `/forks` — explorer for Unit09 forks
- `/stats` — focused metrics view
```

