# Cave Bellevin demo

A commercetools demo of the **retailer opt-in model** and the **Stores concept on the storefront**,
for a single French liquor banner: **Cave Bellevin**, under the franchisor **Groupe Vinéa**.

See [CLAUDE.md](CLAUDE.md) for the locked naming, golden rules and build order.

## Setup

1. **Create the commercetools project** (Merchant Center — there is no API for this):
   - region **EU**: `europe-west1.gcp` or `eu-central-1.aws`
   - project key `cave-bellevin-demo`
   - languages `en` (+ `fr-FR`), currency `EUR`, country `FR`
2. **Create an API client**: Settings → Developer settings → Create new API client, scope
   `manage_project`. Copy the credentials **before closing the dialog** — they are shown once.
3. **Fill in the credentials** in two places (both gitignored):
   - `.env.local` — `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, and `SESSION_SECRET`
     (`openssl rand -base64 32`)
   - `.mcp.json` — `<CTP_CLIENT_ID>` / `<CTP_CLIENT_SECRET>`, then restart Claude Code so the
     Commerce MCP picks them up
4. Verify: `curl -s -u "$CTP_CLIENT_ID:$CTP_CLIENT_SECRET" -d grant_type=client_credentials "$CTP_AUTH_URL/oauth/token"`

Adjust `CTP_AUTH_URL` / `CTP_API_URL` in both files if you picked `eu-central-1.aws`.
