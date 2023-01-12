// secrets added using "wrangler secret put <name>"
declare const OPEN_COLLECTIVE_CLIENT_ID: string;
declare const OPEN_COLLECTIVE_CLIENT_SECRET: string;
declare const DISCORD_WEBHOOK_URL: string;
// This should be a base64 encoded 32 byte random binary string
// You can get this via `base64.b64encode(secrets.token_bytes(32)).decode("ascii")` in Python
declare const SECRET_KEY: string;
