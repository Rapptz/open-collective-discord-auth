import { sign } from "./verify";

/**
 * Returns the Open Collective login URL.
 *
 * The nonce *must* be stored in cookies.
 *
 * @param nonce The nonce to validate the signatures with.
 * @returns The open collective login URL.
 */
export async function getOpenCollectiveLoginUrl(nonce: string): Promise<string> {
  const state = await sign({ nonce });
  const url = new URL("https://opencollective.com/oauth/authorize");
  url.searchParams.append("client_id", OPEN_COLLECTIVE_CLIENT_ID);
  url.searchParams.append("redirect_uri", OPEN_COLLECTIVE_REDIRECT_URL);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", "account");
  url.searchParams.append("state", state);
  return url.toString();
}

export interface OpenCollectiveMeQueryResult {
  data: {
    me: OpenCollectiveUser;
  };
}

export interface OpenCollectiveUser {
  id: string;
  name: string;
  slug: string;
}

export async function getOpenCollectiveAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", OPEN_COLLECTIVE_CLIENT_ID);
  params.append("client_secret", OPEN_COLLECTIVE_CLIENT_SECRET);
  params.append("code", code);
  params.append("redirect_uri", OPEN_COLLECTIVE_REDIRECT_URL);

  let res = await fetch("https://opencollective.com/oauth/token", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    throw new Error(`Request to Open Collective failed with status ${res.status}`);
  }

  const json: { access_token: string } = await res.json();
  return json.access_token;
}

export async function getOpenCollectiveUser(
  access_token: string
): Promise<OpenCollectiveMeQueryResult> {
  const res = await fetch("https://opencollective.com/api/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      query: "{ me { id slug name } }",
    }),
  });
  return await res.json();
}

export interface Metadata {
  total_donated?: number;
  last_donation?: string;
  last_donation_amount?: number;
  // Discord requires 0=false, 1=true
  is_backer: number;
}

interface OpenCollectiveMetadataQueryResult {
  data: {
    account: {
      memberOf: {
        nodes: {
          totalDonations: {
            value: number;
          };
          role: string;
        }[];
      };
    };
    collective: {
      transactions: {
        nodes: {
          amountInHostCurrency: {
            value: number;
          };
          createdAt: string;
        }[];
      };
    };
  };
}

export async function getOpenCollectiveMetadata(
  access_token: string,
  account_id: string
): Promise<Metadata> {
  const res = await fetch("https://opencollective.com/api/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      query: String.raw`
        query metadata($slug: String, $account_id: String) {
          account (id: $account_id) {
            memberOf (account: {slug: $slug}, limit: 1) {
              nodes {
                totalDonations {
                  value
                }
                role
              }
            }
          }
          collective(slug: $slug) {
            transactions(fromAccount: {id: $account_id}, limit: 1, type: CREDIT) {
              nodes {
                amountInHostCurrency {
                  value
                }
                createdAt
              }
            }
          }
        }`,
      variables: {
        slug: OPEN_COLLECTIVE_SLUG,
        account_id,
      },
    }),
  });
  const json: OpenCollectiveMetadataQueryResult = await res.json();
  let metadata: Metadata = { is_backer: 0 };
  if (json.data.account.memberOf.nodes.length > 0) {
    const node = json.data.account.memberOf.nodes[0];
    metadata.total_donated = Math.ceil(node.totalDonations.value);
    metadata.is_backer =
      node.role === "BACKER" ||
      node.role === "ADMIN" ||
      node.role === "CONTRIBUTOR" ||
      node.role === "MEMBER"
        ? 1
        : 0;
  }
  if (json.data.collective.transactions.nodes.length > 0) {
    const node = json.data.collective.transactions.nodes[0];
    metadata.last_donation = node.createdAt;
    metadata.last_donation_amount = Math.ceil(node.amountInHostCurrency.value);
  }
  return metadata;
}
