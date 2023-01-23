import { Router } from "itty-router";
import { htmlResponse, SUCCESS_JSON_INFO } from "./responses";
import {
  getOpenCollectiveAccessToken,
  getOpenCollectiveLoginUrl,
  getOpenCollectiveMetadata,
  getOpenCollectiveUser,
  Metadata,
  MetadataResult,
  OpenCollectiveMeQueryResult,
  OpenCollectiveUser,
} from "./open-collective";
import { randomNonce, sign, validateRequestState } from "./verify";
import * as discord from "./discord";

/**
 * The way this program works is through a multiple redirect system.
 *
 * The flow is as follows:
 *
 * 1. The user goes /linked-role
 * 2. The user is redirected to Open Collective's OAuth2 URL
 * 3. The user is redirected to /open-collective/redirect
 * 4. The user is redirected to Discord's OAuth2 URL
 * 5. The user is redirected to /discord/redirect
 * 6. An HTML page is shown to the user. Simultaneously their
 *    metadata is updated and a webhook is sent to Discord with information.
 *
 * This works through using a JWT-like token encoding the state as through the various redirects.
 */

interface IttyRequestsExtras {
  params: {
    [key: string]: string | undefined;
  };
  query: {
    [key: string]: string | undefined;
  };
}

export interface IttyRequest extends Request, IttyRequestsExtras {}

const router = Router();

async function postInformationToDiscord(
  userId: string,
  tokens: discord.OAuth2TokenResponse,
  oc: OpenCollectiveUser
): Promise<void> {
  const payload = {
    embeds: [
      {
        type: "rich",
        title: userId,
        fields: [
          { name: "id", value: oc.id, inline: true },
          { name: "name", value: oc.name, inline: true },
          { name: "slug", value: oc.slug, inline: true },
          { name: "access_token", value: tokens.access_token, inline: true },
          { name: "refresh_token", value: tokens.refresh_token, inline: true },
          { name: "expires_in", value: tokens.expires_in, inline: true },
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

/* this is the entry point, i.e. before logging in to anything but starts the entire flow. */
router.get("/linked-role", async (req: IttyRequest) => {
  const nonce = randomNonce();
  const url = await getOpenCollectiveLoginUrl(nonce);
  const cookie = `nonce=${nonce}; Path=/; Max-Age=90000; Secure; HttpOnly; SameSite=Lax`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": cookie,
    },
  });
});

interface OpenCollectiveState {
  nonce: string;
  oc: OpenCollectiveUser;
  metadata: Metadata;
}

/* user comes to this after logging in to Open Collective but before logging in to Discord */
router.get("/open-collective/redirect", async (req: IttyRequest) => {
  const { code, state } = req.query;
  if (code === undefined || state === undefined) {
    return htmlResponse("Missing code and state parameters", false);
  }

  const validated = await validateRequestState<OpenCollectiveState>(state, req);
  if (validated === null) {
    return htmlResponse("Invalid request", false);
  }

  let access_token: string;
  let user: OpenCollectiveMeQueryResult;
  let result: MetadataResult;
  try {
    access_token = await getOpenCollectiveAccessToken(code);
    user = await getOpenCollectiveUser(access_token);
    result = await getOpenCollectiveMetadata(access_token, user.data.me.id);
  } catch (e: any) {
    return htmlResponse(e.toString(), false);
  }

  validated.oc = result.user || user.data.me;
  validated.metadata = result.metadata;
  const signed = await sign(validated);
  const redirect = discord.getOAuthUrl(signed);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect,
    },
  });
});

/* user comes to this after logging in to Discord and Open Collective, i.e. flow is complete */
router.get("/discord/redirect", async (req: IttyRequest) => {
  const { code, state } = req.query;
  if (code === undefined || state === undefined) {
    return htmlResponse("Missing code and state parameters", false);
  }

  const validated = await validateRequestState<OpenCollectiveState>(state, req);
  if (validated === null) {
    return htmlResponse("Invalid request", false);
  }

  try {
    let tokens = await discord.getOAuth2Tokens(code);
    let user = await discord.getUser(tokens.access_token);

    if (DISCORD_WEBHOOK_URL.length > 0) {
      await postInformationToDiscord(user.id, tokens, validated.oc);
    }
    await discord.postMetadata(
      tokens.access_token,
      validated.metadata,
      validated.oc.name
    );
  } catch (e: any) {
    return htmlResponse(e.toString(), false);
  }

  return htmlResponse("Success", true);
});

// these routes are just fallbacks in case the browser loads these
router.get("/success", () => htmlResponse("Success", true));
router.get("/error", () => htmlResponse("Invalid request", false));

router.all("*", () => new Response("Not Found.", { status: 404 }));

addEventListener("fetch", (event) => {
  event.respondWith(router.handle(event.request));
});
