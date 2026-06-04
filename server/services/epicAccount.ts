import { getEpicAccessToken } from './epicAuth';

export interface OriginalPlatformResult {
  name: string;
  epicDisplayName: string;
  accountId: string;
  originalPlatform: string;
  originalName: boolean | null; // null = indeterminate (can't tell)
  platformsChecked: number;
  error?: string;
}

const TOKEN_EXPIRED_MSG = '⚠️ Epic auth token rejected (expired). Refresh EPIC_AUTH or run /setup_epic.';

// Friendly labels for Epic external-auth platform codes.
const PLATFORM_LABELS: Record<string, string> = {
  xbl: 'XBL',
  psn: 'PSN',
  steam: 'STEAM',
  nintendo: 'NINTENDO',
  github: 'GITHUB',
  google: 'GOOGLE',
  apple: 'APPLE',
};

// Resolve a name (Xbox/PSN gamertag or Epic display name) to an Epic account id.
// Tries the token-free prod.api-fortnite.com console lookups first, then the
// token-gated Epic display-name lookup as a fallback.
async function resolveEpicAccount(
  name: string
): Promise<{ id: string; displayName: string } | { authFailed: true } | null> {
  const prodKey = process.env.PROD_FORTNITE_API_KEY || '';
  if (prodKey) {
    for (const plat of ['xbl', 'psn']) {
      try {
        const r = await fetch(
          `https://prod.api-fortnite.com/api/v1/account/external/${plat}/displayName/${encodeURIComponent(name)}`,
          { headers: { 'x-api-key': prodKey }, signal: AbortSignal.timeout(8000) }
        );
        if (r.ok) {
          const d: any = await r.json();
          const a = Array.isArray(d) ? d[0] : d;
          if (a && a.id) return { id: a.id, displayName: a.displayName || name };
        }
      } catch (_) {}
    }
  }
  const token = await getEpicAccessToken();
  if (token) {
    try {
      const r = await fetch(
        `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/lookup?displayName=${encodeURIComponent(name)}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) {
        const d: any = await r.json();
        if (d && d.id) return { id: d.id, displayName: d.displayName || name };
      } else if (r.status === 401 || r.status === 403) {
        // Token is expired/invalid — surface this instead of "no account found".
        return { authFailed: true };
      }
    } catch (_) {}
  }
  return null;
}

// Determine the platform an Epic account was ORIGINALLY made on, by taking the
// linked external auth with the earliest `dateAdded`. Also reports whether the
// current Epic display name still matches that original platform's name.
export async function fetchOriginalPlatform(name: string): Promise<OriginalPlatformResult> {
  const out: OriginalPlatformResult = {
    name,
    epicDisplayName: name,
    accountId: '',
    originalPlatform: '',
    originalName: null,
    platformsChecked: 0,
  };

  const acc = await resolveEpicAccount(name);
  if (acc && 'authFailed' in acc) return { ...out, error: TOKEN_EXPIRED_MSG };
  if (!acc) return { ...out, error: `❌ No Epic account found for: ${name}` };
  out.accountId = acc.id;
  out.epicDisplayName = acc.displayName;

  const token = await getEpicAccessToken();
  if (!token) {
    return { ...out, error: '⚠️ Epic auth token missing/expired. Put a fresh Bearer in EPIC_AUTH (or run /setup_epic for permanent auth).' };
  }

  let auths: any[] = [];
  try {
    const r = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${acc.id}/externalAuths`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
    );
    if (r.status === 401 || r.status === 403) {
      return { ...out, error: '⚠️ Epic auth token rejected (expired). Refresh EPIC_AUTH or run /setup_epic.' };
    }
    if (!r.ok) return { ...out, error: `❌ Epic externalAuths lookup failed (HTTP ${r.status}).` };
    auths = await r.json();
  } catch (_) {
    return { ...out, error: '❌ Epic request timed out. Try again.' };
  }
  if (!Array.isArray(auths)) auths = [];
  out.platformsChecked = auths.length;

  const dated = auths.filter(a => a && a.dateAdded);
  if (dated.length === 0) {
    // No dated external links → account was created directly on Epic / PC.
    // We can't compare against an original console name, so leave it indeterminate.
    out.originalPlatform = 'EPIC (PC)';
    out.originalName = null;
    return out;
  }

  dated.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
  const earliest = dated[0];
  const t = (earliest.type || '').toLowerCase();
  out.originalPlatform = PLATFORM_LABELS[t] || (earliest.type || 'UNKNOWN').toUpperCase();
  out.originalName = (out.epicDisplayName || '').toLowerCase() === (earliest.externalDisplayName || '').toLowerCase();
  return out;
}
