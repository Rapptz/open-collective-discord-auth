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

interface OpenCollectiveMetadataQueryResultAccount {
  memberOf: {
    nodes: {
      totalDonations: {
        value: number;
      };
      account: {};
      role: string;
    }[];
  };
  transactions: {
    nodes: {
      account: OpenCollectiveUser;
      netAmountInHostCurrency: {
        value: number;
      };
      createdAt: string;
    }[];
  };
}

interface OpenCollectiveMetadataQueryResult {
  data: {
    account: OpenCollectiveMetadataQueryResultAccount & {
      organizations: {
        nodes: {
          account: OpenCollectiveMetadataQueryResultAccount;
        }[];
      };
    };
  };
}

export interface MetadataResult {
  metadata: Metadata;
  user?: OpenCollectiveUser;
}

export async function getOpenCollectiveMetadata(
  access_token: string,
  account_id: string
): Promise<MetadataResult> {
  const res = await fetch("https://opencollective.com/api/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      query: String.raw`
        fragment AccountParts on Account {
          memberOf (account: {slug: $slug}, limit: 1) {
            nodes {
              totalDonations {
                value
              }
              role
            }
          }
          transactions(fromAccount: {slug: $slug}, limit: 1, type: DEBIT) {
            nodes {
              account { id name slug }
              netAmountInHostCurrency {
                value
              }
              createdAt
            }
          }
        }
        query metadata($slug: String, $account_id: String) {
          account (id: $account_id) {
            ...AccountParts
            organizations: memberOf (accountType: [COLLECTIVE, ORGANIZATION], limit: 1) {
              nodes {
                account {
                  ...AccountParts
                }
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
  const accounts = [json.data, ...json.data.account.organizations.nodes];
  let result: MetadataResult = { metadata };
  for (const { account } of accounts) {
    if (account.memberOf.nodes.length == 0) {
      continue;
    }
    const node = account.memberOf.nodes[0];
    metadata.total_donated ??= 0;
    metadata.total_donated += Math.ceil(node.totalDonations.value);
    metadata.is_backer =
      metadata.is_backer ||
      node.role === "BACKER" ||
      node.role === "ADMIN" ||
      node.role === "CONTRIBUTOR" ||
      node.role === "MEMBER"
        ? 1
        : 0;
    if (account.transactions.nodes.length == 0) {
      continue;
    }
    const transaction = account.transactions.nodes[0];
    result.user = transaction.account;
    if (!metadata.last_donation || transaction.createdAt > metadata.last_donation) {
      metadata.last_donation = transaction.createdAt;
      metadata.last_donation_amount = Math.ceil(-transaction.netAmountInHostCurrency.value);
    }
  }
  return result;
}
