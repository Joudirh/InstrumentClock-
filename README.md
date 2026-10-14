# InstrumentClock-
Trading Sessions Hub : Application web permettant de visualiser, pour différents instruments financiers (Forex, Indices, Matières premières, Actions, Cryptomonnaies)

## Stack
- Front statique Vite (vanilla ES modules) dans `index.html`, `js/`, `css/`, `public/`.
- Backend TypeScript : Prisma 7 + Neon Postgres, Neon Object Storage (S3) via `@aws-sdk/client-s3`, fonctions serverless Vercel dans `api/`.

## Développement
```bash
npm install            # génère le client Prisma (postinstall)
cp .env.example .env   # renseigner DATABASE_URL, DIRECT_URL, AWS_*
npm run dev            # front sur http://localhost:5173
npm run db:migrate     # appliquer/créer les migrations Neon
npm run db:seed        # remplir la base depuis js/data.js
npm run db:studio      # explorer la base (lent au démarrage)
npm run assets:upload  # envoyer public/assets/* vers le bucket S3
```

## Déploiement (Vercel + Neon + GitHub)
- Renseigner `DATABASE_URL` (pooled), `DIRECT_URL` (unpooled) et les variables `AWS_*` dans le projet Vercel.
- `vercel.json` exécute `prisma generate && prisma migrate deploy && vite build`.
