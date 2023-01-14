import { Metadata } from "./open-collective";

export function getOAuthUrl(
  state: string,
  scope: string = "role_connections.write identify"
): string {
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.append("client_id", DISCORD_CLIENT_ID);
  url.searchParams.append("redirect_uri", DISCORD_REDIRECT_URL);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", scope);
  url.searchParams.append("state", state);
  url.searchParams.append("prompt", "consent");
  return url.toString();
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function getOAuth2Tokens(code: string): Promise<OAuth2TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    redirect_uri: DISCORD_REDIRECT_URL,
  });

  let res = await fetch("https://discord.com/api/v10/oauth2/token", {
    body,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching OAuth2 tokens from Discord: ${res.status}`);
  }

  return await res.json();
}

export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export async function getUser(access_token: string): Promise<User> {
  const res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching user from Discord: ${res.status}`);
  }

  return await res.json();
}

export async function postMetadata(
  access_token: string,
  metadata: Metadata,
  platform_username: string
): Promise<void> {
  const url = `https://discord.com/api/v10/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`;
  const body = {
    platform_name: "Open Collective",
    platform_username,
    metadata,
  };

  const res = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Error posting metadata to Discord: ${res.status}`);
  }
}
