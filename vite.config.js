import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve the Vercel API handlers (api/*.ts) during `vite dev`, so the local
// front-end can read the Neon database. In production Vercel runs these files.
function apiDevMiddleware() {
  return {
    name: "api-dev-middleware",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const rawName = req.url.split("?")[0].replace("/api/", "") || "index";

        // Regroupement des API pour réduire le nombre de fonctions serverless
        // (plan Hobby Vercel: max 12). auth/me/admin sont des routers uniques
        // qui reçoivent le sous-chemin via __path en query.
        const groupMap = { auth: "auth", me: "me", admin: "admin" };
        let moduleName = rawName;
        let extraPath = "";
        const firstSegment = rawName.split("/")[0];
        if (groupMap[firstSegment]) {
          moduleName = groupMap[firstSegment];
          extraPath = rawName.slice(firstSegment.length + 1);
        }

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

        // Vercel fournit req.body (JSON), req.query et req.cookies au handler :
        // le middleware de dev reproduit ce contrat.
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw && (req.headers["content-type"] || "").includes("application/json")) {
          try {
            req.body = JSON.parse(raw);
          } catch {
            req.body = raw;
          }
        }
        const requestUrl = new URL(req.url, "http://localhost");
        const query = Object.fromEntries(requestUrl.searchParams);
        if (extraPath) query.__path = extraPath;
        req.query = query;
        req.cookies = Object.fromEntries(
          (req.headers.cookie || "")
            .split(";")
            .map((part) => {
              const idx = part.indexOf("=");
              return idx === -1 ? null : [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1))];
            })
            .filter(Boolean)
        );

        try {
          const mod = await server.ssrLoadModule(`/api/${moduleName}.ts`);
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

function cleanUrlsMiddleware() {
  return {
    name: "clean-urls",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/admin") req.url = "/admin.html";
        else if (req.url === "/dashboard") req.url = "/dashboard.html";
        else if (req.url === "/account") req.url = "/account.html";
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [apiDevMiddleware(), cleanUrlsMiddleware()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        account: resolve(__dirname, "account.html"),
      },
    },
  },
});
