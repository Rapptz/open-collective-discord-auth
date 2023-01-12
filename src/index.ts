import { Router } from "itty-router";

const encoder = new TextEncoder();

async function getSecretKey(): Promise<CryptoKey> {
  const secret = Uint8Array.from(atob(SECRET_KEY), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

const SUCCESS_JSON_INFO = {
  status: 200,
  headers: {
    "Content-Type": "application/json",
  },
};

const ERROR_JSON_INFO = {
  status: 400,
  headers: {
    "Content-Type": "application/json",
  },
};

const REDIRECT_URL = "https://open-collective-auth.rapptz.workers.dev/auth/callback";

const STATIC_HTML_TEMPLATE = String.raw`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Collective Discord Integration</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 16px;
      margin: 0;
    }
    main {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 3px;
      box-shadow: 0 1px 1px rgba(0,0,0,.04);
      margin: 50px auto;
      max-width: 600px;
      padding: 30px;
      text-align: center;
    }
    p {
      margin: 0 0 4px;
    }
    button {
      background: #4372d0;
      border: 1px solid #3366cc;
      border-radius: 3px;
      box-shadow: 0 1px 1px rgba(0,0,0,.04);
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      padding: 10px 20px;
    }
    button:hover {
      background: #527ed4;
    }
    .title {
      margin-bottom: 0px;
      font-size: 20px;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
    }
    .notification {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <main>
    {{svg}}
    <div class="notification">
      <p class="title">{{title}}</p>
      <span class="subtitle">You can now safely close this window.</span>
    </div>
    <button onclick="window.close()">Close</button>
  </main>
  <script>
    window.history.replaceState(null, null, "{{url}}");
  </script>
</body>
</html>
`;

const SUCCESS_SVG = `<svg fill="#66cc33" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 26 26" width="96px" height="96px"><path d="M 13 1 C 6.382813 1 1 6.382813 1 13 C 1 19.617188 6.382813 25 13 25 C 19.617188 25 25 19.617188 25 13 C 25 6.382813 19.617188 1 13 1 Z M 13 3 C 18.535156 3 23 7.464844 23 13 C 23 18.535156 18.535156 23 13 23 C 7.464844 23 3 18.535156 3 13 C 3 7.464844 7.464844 3 13 3 Z M 17.1875 7.0625 C 17.039063 7.085938 16.914063 7.164063 16.8125 7.3125 L 11.90625 14.59375 L 9.59375 12.3125 C 9.394531 12.011719 9.011719 11.988281 8.8125 12.1875 L 7.90625 13.09375 C 7.707031 13.394531 7.707031 13.800781 7.90625 14 L 11.40625 17.5 C 11.605469 17.601563 11.886719 17.8125 12.1875 17.8125 C 12.386719 17.8125 12.707031 17.707031 12.90625 17.40625 L 18.90625 8.59375 C 19.105469 8.292969 18.992188 8.011719 18.59375 7.8125 L 17.59375 7.09375 C 17.492188 7.042969 17.335938 7.039063 17.1875 7.0625 Z"/></svg>`;
const ERROR_SVG = `<svg fill="#cc3366" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="96px" height="96px"><path d="M 16 3 C 8.832031 3 3 8.832031 3 16 C 3 23.167969 8.832031 29 16 29 C 23.167969 29 29 23.167969 29 16 C 29 8.832031 23.167969 3 16 3 Z M 16 5 C 22.085938 5 27 9.914063 27 16 C 27 22.085938 22.085938 27 16 27 C 9.914063 27 5 22.085938 5 16 C 5 9.914063 9.914063 5 16 5 Z M 12.21875 10.78125 L 10.78125 12.21875 L 14.5625 16 L 10.78125 19.78125 L 12.21875 21.21875 L 16 17.4375 L 19.78125 21.21875 L 21.21875 19.78125 L 17.4375 16 L 21.21875 12.21875 L 19.78125 10.78125 L 16 14.5625 Z"/></svg>`;

function htmlResponse(message: string, success: boolean): Response {
  const svg = success ? SUCCESS_SVG : ERROR_SVG;
  const url = success ? "/success" : "/error";
  const html = STATIC_HTML_TEMPLATE.replace("{{title}}", message)
    .replace("{{svg}}", svg)
    .replace("{{url}}", url);

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

interface IttyRequestsExtras {
  params: {
    [key: string]: string | undefined;
  };
  query: {
    [key: string]: string | undefined;
  };
}

export interface IttyRequest extends Request, IttyRequestsExtras {}

interface URLRequest {
  /**
   * The user ID to request an OAuth2 URL for.
   */
  user_id: string;
  /**
   * The random nonce string to prevent the signature from being reused.
   */
  nonce: string;
  /**
   * The base64 HMAC signature of the payload using our shared SECRET_KEY.
   *
   * Note that the signature is from `{user_id}.{nonce}`.
   */
  signature: string;
}

interface OpenCollectiveMeQueryResult {
  data: {
    me: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

const router = Router();

const USER_ID_REGEX = /[0-9]{15,21}/;

function randomNonce(bytes: number = 16): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))));
}

/**
 * Converts a Discord user ID string into a base64 encoded HMAC string using the secret key.
 *
 * This state is a base64 encoded string of <user_id>.<nonce>.<timestamp>.<signature>.
 *
 * @param userId The user ID to turn into OAuth2 state
 */
async function createStateForUser(userId: string): Promise<string> {
  const key = await getSecretKey();
  const nonce = randomNonce();
  const timestamp = Date.now();
  const message = `${userId}.${nonce}.${timestamp}`;
  const hmac = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const signature = String.fromCharCode(...new Uint8Array(hmac));
  return btoa(`${message}.${signature}`);
}

async function postInformationToDiscord(
  userId: string,
  user: OpenCollectiveMeQueryResult
): Promise<void> {
  const payload = {
    embeds: [
      {
        type: "rich",
        title: userId,
        fields: [
          { name: "id", value: user.data.me.id, inline: true },
          { name: "name", value: user.data.me.name, inline: true },
          { name: "slug", value: user.data.me.slug, inline: true },
        ],
        color: 0x66cc33,
      },
    ],
  };

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

router.post("/auth/url", async (req: IttyRequest) => {
  const data: URLRequest = await req.json();
  if (
    data.nonce === undefined ||
    data.user_id === undefined ||
    data.signature === undefined
  ) {
    return new Response(JSON.stringify({ error: "Invalid request" }), ERROR_JSON_INFO);
  }

  const key = await getSecretKey();
  const message = `${data.user_id}.${data.nonce}`;
  const signature = Uint8Array.from(atob(data.signature), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(message)
  );

  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), ERROR_JSON_INFO);
  }

  if (!USER_ID_REGEX.test(data.user_id)) {
    return new Response(
      JSON.stringify({
        error: "Invalid user ID provided",
      }),
      ERROR_JSON_INFO
    );
  }

  const state = await createStateForUser(data.user_id);
  const url = new URL("https://opencollective.com/oauth/authorize");
  url.searchParams.append("client_id", OPEN_COLLECTIVE_CLIENT_ID);
  url.searchParams.append("redirect_uri", REDIRECT_URL);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", "account");
  url.searchParams.append("state", state);

  return new Response(
    JSON.stringify({
      url,
      user_id: data.user_id,
    }),
    SUCCESS_JSON_INFO
  );
});

router.get("/auth/callback", async (req: IttyRequest) => {
  const { code, state } = req.query;
  if (code === undefined || state === undefined) {
    return htmlResponse("Invalid request", false);
  }

  const key = await getSecretKey();
  const [userId, nonce, timestamp, signature] = atob(state).split(".");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(signature, (c) => c.charCodeAt(0)),
    encoder.encode(`${userId}.${nonce}.${timestamp}`)
  );

  if (!valid) {
    return htmlResponse("Invalid signature", false);
  }

  const now = Date.now();
  const tokenExpiredAt = parseInt(timestamp, 10) + 15 * 60 * 1000; // 90 seconds from when issued
  if (now >= tokenExpiredAt) {
    return htmlResponse("Token expired", false);
  }

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", OPEN_COLLECTIVE_CLIENT_ID);
  params.append("client_secret", OPEN_COLLECTIVE_CLIENT_SECRET);
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URL);

  let res = await fetch("https://opencollective.com/oauth/token", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    return htmlResponse(
      `Request to Open Collective failed with status ${res.status}`,
      false
    );
  }

  const json: { access_token: string } = await res.json();

  res = await fetch("https://opencollective.com/api/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${json.access_token}`,
    },
    body: JSON.stringify({
      query: "{ me { id slug name } }",
    }),
  });
  const user: OpenCollectiveMeQueryResult = await res.json();

  try {
    await postInformationToDiscord(userId, user);
  } catch (e) {
    return htmlResponse(`Unknown error posting to Discord: ${e}`, false);
  }

  return htmlResponse("Success", true);
});

addEventListener("fetch", (event) => {
  event.respondWith(router.handle(event.request));
});
