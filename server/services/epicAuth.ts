// Epic Games OAuth service with Device Auth auto-refresh
// Device Auth never expires — gets fresh access tokens automatically 24/7

// Fortnite iOS client credentials (public, well-known)
const EPIC_CLIENT_ID = '3446cd72694c4a4485d81b77adbb2141';
const EPIC_CLIENT_SECRET = '9209d4a5e25a457fb9b07489d313b41a';
const BASIC_AUTH = Buffer.from(`${EPIC_CLIENT_ID}:${EPIC_CLIENT_SECRET}`).toString('base64');

const TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getEpicAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  const accountId = process.env.EPIC_ACCOUNT_ID;
  const deviceId = process.env.EPIC_DEVICE_ID;
  const deviceSecret = process.env.EPIC_DEVICE_SECRET;

  // If device auth credentials are set, use them (permanent, best for 24/7)
  if (accountId && deviceId && deviceSecret) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${BASIC_AUTH}`,
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

  // Fallback: use the manually-set EPIC_AUTH Bearer token
  if (process.env.EPIC_AUTH) {
    console.log('[EpicAuth] Using static EPIC_AUTH token (will expire in ~8h)');
    return process.env.EPIC_AUTH;
  }

  return null;
}

// Helper to create a Device Auth entry for a given access token
// Call this once with a valid access token to get permanent device credentials
export async function createDeviceAuth(accessToken: string, accountId: string): Promise<{
  accountId: string;
  deviceId: string;
  secret: string;
} | null> {
  try {
    const res = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      return {
        accountId: data.accountId,
        deviceId: data.deviceId,
        secret: data.secret
      };
    } else {
      const err = await res.text();
      console.error('[EpicAuth] createDeviceAuth failed:', err);
    }
  } catch (e) {
    console.error('[EpicAuth] createDeviceAuth error:', e);
  }
  return null;
}
