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

// Exchange a Launcher access token into a Fortnite PC JWT via exchange_code
async function launcherToFortniteJWT(launcherToken: string): Promise<string | null> {
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
      headers: { 'Authorization': `Basic ${FN_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
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

export async function getEpicAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still valid (5-min buffer)
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  // Priority 1: refresh_token flow → Launcher token → Fortnite JWT
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

  // Priority 2: Device Auth → Fortnite JWT directly
  const accountId = process.env.EPIC_ACCOUNT_ID;
  const deviceId = process.env.EPIC_DEVICE_ID;
  const deviceSecret = process.env.EPIC_DEVICE_SECRET;

  if (accountId && deviceId && deviceSecret) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${FN_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' },
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
