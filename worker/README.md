# The "say it" collector

A small Cloudflare Worker that receives what people type into the "or say it" box, so the app can learn to understand more of it. What it keeps and what it doesn't is at the top of `say-log.js`. The free Cloudflare plan is far more than this needs.

## Set it up (once, about ten minutes)

You need a free Cloudflare account. Run these from the `worker/` folder.

1. Sign in: `npx wrangler login`
2. Create the database: `npx wrangler d1 create do-something-says`
   It prints a `database_id`. Paste it into `wrangler.toml` in place of `PASTE-THE-DATABASE-ID-HERE`.
3. Create the table: `npx wrangler d1 execute do-something-says --remote --file schema.sql`
4. Choose an export token (any long random string, for example from `openssl rand -hex 24`) and store it: `npx wrangler secret put EXPORT_TOKEN`
5. Deploy: `npx wrangler deploy`
   It prints the Worker's address, like `https://do-something-say-log.<your-name>.workers.dev`.
6. Tell the site where to send. In the GitHub repository: Settings → Secrets and variables → Actions → Variables → New repository variable. Name `SAY_LOG_URL`, value the address from step 5 with `/say` on the end. The next deploy turns logging on. Deleting the variable turns it off.

If the site moves to another address, add it to `ALLOWED_ORIGINS` in `wrangler.toml` and deploy again.

## Read what's been typed

```sh
SAY_EXPORT_URL=https://do-something-say-log.<your-name>.workers.dev/export SAY_EXPORT_TOKEN=<the token> npm run says
```

That prints the report described in the main README under "What people type". To look at the rows directly: `npx wrangler d1 execute do-something-says --remote --command "SELECT * FROM says ORDER BY id DESC LIMIT 50"`.

## Throw it all away

`npx wrangler d1 execute do-something-says --remote --command "DELETE FROM says"` empties the table. `npx wrangler delete` removes the Worker.
