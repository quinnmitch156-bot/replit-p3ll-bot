// Per-request Epic auth-code exchange (transient — NOT the bot's own account).
// A user supplies a fresh Epic authorization code; we exchange it on the fly.
//   account-info → launcher token (account public service)
//   ban-date / support-us → Fortnite PC JWT (game service)

const LAUNCHER_CLIENT_ID = process.env.EPIC_CLIENT_ID ?? '34a02cf8f4414e29b15921876da36f9a';
const LAUNCHER_CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET ?? 'daafbccc737745039dffe53d94fc76cf';
const FN_CLIENT_ID = 'ec684b8c687f479fadea3cb2ad83f5c6';
const FN_CLIENT_SECRET = 'e1f31c211f28413186262d37a13fc84d';

const EPIC_TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
const EPIC_EXCHANGE_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange';

export interface EpicToken {
  access_token: string;
  account_id: string;
  displayName: string;
}

// authorization_code → Launcher access token (account public service scope).
export async function getTokenFromAuthCode(authCode: string): Promise<EpicToken> {
  const basic = Buffer.from(`${LAUNCHER_CLIENT_ID}:${LAUNCHER_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(EPIC_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: authCode }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.errorMessage === 'string' ? data.errorMessage : 'Epic Games auth failed');
  }
  return data as unknown as EpicToken;
}

// authorization_code → Launcher token → exchange → Fortnite PC JWT (game service scope).
export async function getFortniteToken(authCode: string): Promise<EpicToken> {
  const launcherToken = await getTokenFromAuthCode(authCode);

  const exchangeRes = await fetch(EPIC_EXCHANGE_URL, {
    headers: { Authorization: `Bearer ${launcherToken.access_token}` },
  });
  const exchangeData = (await exchangeRes.json()) as Record<string, unknown>;
  if (!exchangeRes.ok) {
    throw new Error(typeof exchangeData.errorMessage === 'string' ? exchangeData.errorMessage : 'Failed to get exchange code');
  }

  const fnBasic = Buffer.from(`${FN_CLIENT_ID}:${FN_CLIENT_SECRET}`).toString('base64');
  const fnRes = await fetch(EPIC_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${fnBasic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'exchange_code', exchange_code: exchangeData.code as string }),
  });
  const fnData = (await fnRes.json()) as Record<string, unknown>;
  if (!fnRes.ok) {
    throw new Error(typeof fnData.errorMessage === 'string' ? fnData.errorMessage : 'Fortnite token exchange failed');
  }
  return fnData as unknown as EpicToken;
}

export function isEpicAuthError(msg: string): boolean {
  const l = msg.toLowerCase();
  return l.includes('oauth') || l.includes('invalid') || l.includes('expired') || l.includes('not found');
}
