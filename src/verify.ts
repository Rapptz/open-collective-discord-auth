"use strict";

const ENCODER = new TextEncoder();

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

function b64urlsafe_encode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlsafe_decode(input: string): string {
  return atob(input.replace(/-/g, "+").replace(/_/g, "/"));
}

export function randomNonce(bytes: number = 16): string {
  return b64urlsafe_encode(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))
  );
}

/**
 * Signs a payload with the application's secret key and returns a token that can be verified later.
 *
 * This is similar to a JWT, mostly a reimplementation to save on file size.
 *
 * The token format is: `<base64 encoded payload>.<base64 encoded signature>`. The signature is
 * the HMACSHA256 of the payload with the secret key.
 *
 * @param payload The payload to sign with information.
 * @param expires When the signature expires in milliseconds from `Date.now`. Defaults to 15 minutes.
 * @returns A base64 encoded JWT-like string.
 */
export async function sign(payload: object, expires: number = 900000): Promise<string> {
  const key = await getSecretKey();
  const data = JSON.stringify({ ...payload, exp: Date.now() + expires });
  const signature = await crypto.subtle.sign("HMAC", key, ENCODER.encode(data));
  return (
    b64urlsafe_encode(data) +
    "." +
    b64urlsafe_encode(String.fromCharCode(...new Uint8Array(signature)))
  );
}

/**
 * Returns the signed payload of a token if it's valid.
 *
 * @param token The token to verify and validate.
 * @returns The object that was signed or null if the token is invalid.
 */
export async function verify<T>(token: string): Promise<T | null> {
  const key = await getSecretKey();
  const split = token.split(".");
  if (split.length !== 2) {
    return null;
  }

  const [data, signature] = split;
  const payload = JSON.parse(b64urlsafe_decode(data));

  if (payload.exp < Date.now()) {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(b64urlsafe_decode(signature), (c) => c.charCodeAt(0)),
    ENCODER.encode(b64urlsafe_decode(data))
  );
  return valid ? payload : null;
}

function getNonceFromCookie(cookie: string | null): string | null {
  if (cookie === null) {
    return null;
  }

  const target = cookie.split("; ").find((c) => c.startsWith("nonce="));
  if (target === undefined) {
    return null;
  }
  const [_, value] = target.split("=");
  return value;
}

export interface StatefulPayload {
  nonce: string;
}

/**
 * Similar to `verify` except it also validates the state parameter of an OAuth request.
 *
 * @param state The state parameter of an OAuth request.
 * @param request The request being sent, must have a nonce cookie set.
 * @returns The validated payload or null if the state is invalid.
 */
export async function validateRequestState<T extends StatefulPayload>(
  state: string,
  request: Request
): Promise<T | null> {
  const nonce = getNonceFromCookie(request.headers.get("Cookie"));
  if (nonce === null) {
    return null;
  }

  const payload = await verify<T>(state);
  if (payload === null) {
    return null;
  }

  return payload.nonce === nonce ? payload : null;
}
