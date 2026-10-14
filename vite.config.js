import { defineConfig } from "vite";

// Serve the Vercel API handlers (api/*.ts) during `vite dev`, so the local
// front-end can read the Neon database. In production Vercel runs these files.
function apiDevMiddleware() {
  return {
    name: "api-dev-middleware",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const name = req.url.split("?")[0].replace("/api/", "") || "index";

        // Vercel-style response helpers (res.status(...).json(...)).
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          if (!res.getHeader("Content-Type")) {
            res.setHeader("Content-Type", "application/json");
          }
          res.end(JSON.stringify(data));
          return res;
        };

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          if (typeof mod.default !== "function") {
            res.statusCode = 404;
            return res.end("Not found");
          }
          await mod.default(req, res);
        } catch (error) {
          console.error("[api-dev]", error);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal error", detail: String(error) }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiDevMiddleware()],
});
