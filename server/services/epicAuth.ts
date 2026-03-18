// Epic Games OAuth service — auto-refresh using refresh_token (lasts 30 days)
// Priority: refresh_token > device_auth > static EPIC_AUTH bearer

// Epic Games Launcher client
const LAUNCHER_ID = '34a02cf8f4414e29b15921876da36f9a';
const LAUNCHER_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const LAUNCHER_BASIC = Buffer.from(`${LAUNCHER_ID}:${LAUNCHER_SECRET}`).toString('base64');

// Fortnite PC client (fallback for device_auth grant if needed)
const FN_ID = 'ec684b8c687f479fadea3cb2ad83f5c6';
const FN_SECRET = 'e1f31c211f28413186262d37a13fc84d';
const FN_BASIC = Buffer.from(`${FN_ID}:${FN_SECRET}`).toString('base64');

export { LAUNCHER_BASIC as BASIC_AUTH };

const TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getEpicAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  // Priority 1: Use refresh_token (lasts 30 days, simplest approach)
  const refreshToken = process.env.EPIC_REFRESH_TOKEN;
  if (refreshToken) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${LAUNCHER_BASIC}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      });

      if (res.ok) {
        const data = await res.json();
        cachedToken = data.access_token;
        tokenExpiresAt = now + (data.expires_in * 1000);
        // Update the stored refresh token if a new one was issued
        if (data.refresh_token && data.refresh_token !== refreshToken) {
          process.env.EPIC_REFRESH_TOKEN = data.refresh_token;
          console.log('[EpicAuth] Refresh token rotated — update EPIC_REFRESH_TOKEN secret with new value:', data.refresh_token);
        }
        console.log('[EpicAuth] Token refreshed via refresh_token, expires in', data.expires_in, 'seconds');
        return cachedToken;
      } else {
        const err = await res.text();
        console.error('[EpicAuth] Refresh token failed:', err);
      }
    } catch (e) {
      console.error('[EpicAuth] Refresh token error:', e);
    }
  }

  // Priority 2: Device Auth (permanent, if configured)
  const accountId = process.env.EPIC_ACCOUNT_ID;
  const deviceId = process.env.EPIC_DEVICE_ID;
  const deviceSecret = process.env.EPIC_DEVICE_SECRET;

  if (accountId && deviceId && deviceSecret) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${FN_BASIC}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'device_auth',
          account_id: accountId,
          device_id: deviceId,
          secret: deviceSecret
        }).toString()
      });

      if (res.ok) {
        const data = await res.json();
        cachedToken = data.access_token;
        tokenExpiresAt = now + (data.expires_in * 1000);
        console.log('[EpicAuth] Token refreshed via Device Auth, expires in', data.expires_in, 'seconds');
        return cachedToken;
      } else {
        const err = await res.text();
        console.error('[EpicAuth] Device Auth failed:', err);
      }
    } catch (e) {
      console.error('[EpicAuth] Device Auth error:', e);
    }
  }

  // Priority 3: Static EPIC_AUTH bearer token (expires every 8h, manual)
  if (process.env.EPIC_AUTH) {
    console.log('[EpicAuth] Using static EPIC_AUTH token (will expire in ~8h)');
    return process.env.EPIC_AUTH;
  }

  return null;
}
