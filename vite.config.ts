import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Runs the Vercel functions from /api inside `vite dev`, so the whole app works locally.
 * Without DATABASE_URL it uses PGlite (Postgres compiled to WASM) stored in ./.data.
 * Production never loads this: Vercel serves /api itself.
 */
function devApi(): Plugin {
  return {
    name: 'skillswap-dev-api',
    apply: 'serve',
    async configureServer(server) {
      if (!process.env.DATABASE_URL) {
        const { PGlite } = await import('@electric-sql/pglite')
        const { mkdirSync } = await import('node:fs')
        mkdirSync('./.data', { recursive: true }) // PGlite creates its own folder but not the parent
        const pg = new PGlite('./.data/pglite')
        ;(globalThis as Record<string, unknown>).__SSK_DEV_QUERY__ = async (text: string, params: unknown[] = []) =>
          (await pg.query(text, params)).rows
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        if (!url.pathname.startsWith('/api/')) return next()
        const name = url.pathname.slice('/api/'.length)
        if (!/^[a-z]+$/.test(name)) {
          res.statusCode = 404
          return res.end()
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
          const response = await handler(
            new Request(url, {
              method: req.method,
              headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          next(err)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
})
