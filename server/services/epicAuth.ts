// Epic Games OAuth service
// Flow: refresh_token → Launcher access token → exchange_code → Fortnite PC JWT (eg1~...)
// The Fortnite PC JWT is required for game service endpoints (externalAuths, stats, friends, etc.)

import { readFileSync, writeFileSync } from 'fs';

const LAUNCHER_ID = '34a02cf8f4414e29b15921876da36f9a';
const LAUNCHER_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const LAUNCHER_BASIC = Buffer.from(`${LAUNCHER_ID}:${LAUNCHER_SECRET}`).toString('base64');

// Fortnite PC client — returns eg1~ JWT tokens required by game endpoints
const FN_ID = 'ec684b8c687f479fadea3cb2ad83f5c6';
const FN_SECRET = 'e1f31c211f28413186262d37a13fc84d';
const FN_BASIC = Buffer.from(`${FN_ID}:${FN_SECRET}`).toString('base64');

// Fortnite Android client — current working client that holds the
// `deviceAuths CREATE` scope (the iOS client was disabled by Epic). Device
// auth is created with, and consumed with, this client.
const ANDROID_ID = '3f69e56c7649492c8cc29f1af08a8a12';
const ANDROID_SECRET = 'b51ee9cb12234f50a69efa67ef53812e';
const ANDROID_BASIC = Buffer.from(`${ANDROID_ID}:${ANDROID_SECRET}`).toString('base64');

export { LAUNCHER_BASIC as BASIC_AUTH };

const TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
const EXCHANGE_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange';
const REFRESH_TOKEN_FILE = '.epic_refresh_token';

// Persist the latest refresh token to disk so restarts always have the newest one
function saveRefreshToken(token: string) {
  try {
    writeFileSync(REFRESH_TOKEN_FILE, token, 'utf8');
  } catch (_) {}
}

// Read the most up-to-date refresh token: disk file takes priority over secret
function getStoredRefreshToken(): string | null {
  try {
    const fromFile = readFileSync(REFRESH_TOKEN_FILE, 'utf8').trim();
    if (fromFile) return fromFile;
  } catch (_) {}
  return process.env.EPIC_REFRESH_TOKEN || null;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// Exchange a Launcher access token into a Fortnite client JWT via exchange_code.
// Defaults to the PC client; pass ANDROID_BASIC to get an Android-client token.
async function launcherToFortniteJWT(launcherToken: string, clientBasic: string = FN_BASIC): Promise<string | null> {
  try {
    // Step 1: Get exchange code from Launcher token
    const exRes = await fetch(EXCHANGE_URL, {
      headers: { 'Authorization': `Bearer ${launcherToken}` }
    });
    if (!exRes.ok) {
      console.error('[EpicAuth] Failed to get exchange code:', await exRes.text());
      return null;
    }
    const exCode = (await exRes.json()).code;
    if (!exCode) return null;

    // Step 2: Re-exchange with Fortnite PC client → proper eg1~ JWT
    const fnRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${clientBasic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=exchange_code&exchange_code=${encodeURIComponent(exCode)}`
    });
    if (!fnRes.ok) {
      console.error('[EpicAuth] Fortnite exchange failed:', await fnRes.text());
      return null;
    }
    const fnData = await fnRes.json();
    return fnData.access_token || null;
  } catch (e) {
    console.error('[EpicAuth] launcherToFortniteJWT error:', e);
    return null;
  }
}

// Exchange a one-time auth code into PERMANENT device-auth credentials.
// Device auth does NOT rotate (unlike refresh tokens) and can be used by
// multiple instances (dev + production) at once without invalidation.
// Returns { accountId, deviceId, secret, displayName } or { error }.
export async function createDeviceAuth(
  authCode: string
): Promise<{ accountId: string; deviceId: string; secret: string; displayName: string } | { error: string }> {
  // Step 1: auth code -> Launcher access token
  let launcherToken = '';
  let accountId = '';
  let displayName = 'Unknown';
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${LAUNCHER_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&code=${encodeURIComponent(authCode)}`,
    });
    const text = await res.text();
    if (!res.ok) {
      let reason = `HTTP ${res.status}`;
      try { const e = JSON.parse(text); reason = e.errorMessage || e.error_description || e.message || reason; } catch (_) {}
      return { error: `Auth code exchange failed: ${reason}` };
    }
    const data = JSON.parse(text);
    launcherToken = data.access_token;
    accountId = data.account_id;
    displayName = data.displayName || 'Unknown';
    if (!launcherToken || !accountId) return { error: 'No access_token / account_id in Epic response.' };
  } catch (e) {
    return { error: `Token request error: ${(e as Error).message}` };
  }

  // Step 2: promote to a Fortnite Android JWT — only the Android client holds the
  // `deviceAuths CREATE` scope, and it's the client used to consume it later.
  const androidToken = await launcherToFortniteJWT(launcherToken, ANDROID_BASIC);
  if (!androidToken) return { error: 'Failed to obtain Fortnite Android token for device auth creation.' };
  const accessToken = androidToken;

  // Step 3: create the device auth on the account
  try {
    const res = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: '{}' }
    );
    const text = await res.text();
    if (!res.ok) {
      let reason = `HTTP ${res.status}`;
      try { const e = JSON.parse(text); reason = e.errorMessage || e.error_description || e.message || reason; } catch (_) {}
      return { error: `Device auth creation failed: ${reason}` };
    }
    const da = JSON.parse(text);
    if (!da.deviceId || !da.secret || !da.accountId) return { error: 'Device auth response missing fields.' };
    return { accountId: da.accountId, deviceId: da.deviceId, secret: da.secret, displayName };
  } catch (e) {
    return { error: `Device auth request error: ${(e as Error).message}` };
  }
}

export async function getEpicAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still valid (5-min buffer)
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  // Priority 1: Device Auth → Fortnite JWT directly.
  // Preferred because device auth does NOT rotate and works across multiple
  // instances (dev + production) simultaneously without invalidating itself.
  const accountId = process.env.EPIC_ACCOUNT_ID;
  const deviceId = process.env.EPIC_DEVICE_ID;
  const deviceSecret = process.env.EPIC_DEVICE_SECRET;

  if (accountId && deviceId && deviceSecret) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${ANDROID_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'device_auth', account_id: accountId, device_id: deviceId, secret: deviceSecret }).toString()
      });
      if (res.ok) {
        const data = await res.json();
        cachedToken = data.access_token;
        tokenExpiresAt = now + (data.expires_in * 1000);
        console.log('[EpicAuth] Token via Device Auth, expires in', data.expires_in, 'seconds');
        return cachedToken;
      } else {
        console.error('[EpicAuth] Device Auth failed:', await res.text());
      }
    } catch (e) {
      console.error('[EpicAuth] Device Auth error:', e);
    }
  }

  // Priority 2: refresh_token flow → Launcher token → Fortnite JWT.
  // NOTE: Epic rotates (single-use) refresh tokens, so this breaks if more than
  // one instance refreshes the same token. Device auth above is preferred.
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${LAUNCHER_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      });

      if (res.ok) {
        const data = await res.json();
        const launcherToken = data.access_token;

        // Always save the latest refresh token to disk — Epic rotates them
        if (data.refresh_token) {
          saveRefreshToken(data.refresh_token);
          process.env.EPIC_REFRESH_TOKEN = data.refresh_token;
        }

        // Promote to Fortnite PC JWT for full API access
        const fnJWT = await launcherToFortniteJWT(launcherToken);
        if (fnJWT) {
          cachedToken = fnJWT;
          tokenExpiresAt = now + (data.expires_in * 1000);
          console.log('[EpicAuth] Token refreshed via refresh_token → Fortnite JWT, expires in', data.expires_in, 'seconds');
          return cachedToken;
        }

        // Fallback: use Launcher token directly if exchange fails
        cachedToken = launcherToken;
        tokenExpiresAt = now + (data.expires_in * 1000);
        console.log('[EpicAuth] Using Launcher token (Fortnite exchange failed)');
        return cachedToken;
      } else {
        console.error('[EpicAuth] Refresh token failed:', await res.text());
      }
    } catch (e) {
      console.error('[EpicAuth] Refresh token error:', e);
    }
  }

  // Priority 3: Static EPIC_AUTH bearer (expires ~8h, manual)
  if (process.env.EPIC_AUTH) {
    const staticToken = process.env.EPIC_AUTH.replace(/^["'\s]+|["'\s]+$/g, '');
    console.log('[EpicAuth] Using static EPIC_AUTH token');
    return staticToken;
  }

  return null;
}

// ─── Multi-account burner support ──────────────────────────────────────────
// Reads EPIC_ACCOUNT_ID_N / EPIC_DEVICE_ID_N / EPIC_DEVICE_SECRET_N (N = 1,2,3…)
// Used by /friend-bomber to send requests from multiple Epic accounts at once.

const burnerCache = new Map<number, { token: string; accountId: string; exp: number }>();

export function getConfiguredBurners(): number[] {
  const slots: number[] = [];
  for (let i = 1; i <= 50; i++) {
    if (process.env[`EPIC_ACCOUNT_ID_${i}`] && process.env[`EPIC_DEVICE_ID_${i}`] && process.env[`EPIC_DEVICE_SECRET_${i}`]) {
      slots.push(i);
    }
  }
  return slots;
}

export async function getBurnerToken(slot: number): Promise<{ token: string; accountId: string } | null> {
  const now = Date.now();
  const cached = burnerCache.get(slot);
  if (cached && now < cached.exp - 300_000) return { token: cached.token, accountId: cached.accountId };

  const accountId = process.env[`EPIC_ACCOUNT_ID_${slot}`];
  const deviceId = process.env[`EPIC_DEVICE_ID_${slot}`];
  const deviceSecret = process.env[`EPIC_DEVICE_SECRET_${slot}`];
  if (!accountId || !deviceId || !deviceSecret) return null;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${FN_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'device_auth', account_id: accountId, device_id: deviceId, secret: deviceSecret }).toString()
    });
    if (!res.ok) {
      console.error(`[EpicAuth] Burner ${slot} device_auth failed:`, await res.text());
      return null;
    }
    const data = await res.json();
    burnerCache.set(slot, { token: data.access_token, accountId, exp: now + (data.expires_in * 1000) });
    return { token: data.access_token, accountId };
  } catch (e) {
    console.error(`[EpicAuth] Burner ${slot} error:`, e);
    return null;
  }
}
