// PlayStation Network service — wraps `psn-api`.
// Auth flow: NPSSO (64-char token) → access code → access/refresh tokens.
// The refresh token (~2 month life) is persisted to disk so restarts and the
// 8h access-token expiry are handled automatically without re-entering NPSSO.

import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  makeUniversalSearch,
  getProfileFromAccountId,
  getBasicPresence,
  getUserRegion,
  getUserFriendsAccountIds,
  getUserTrophyProfileSummary,
  getUserTitles,
} from 'psn-api';
import { readFileSync, writeFileSync } from 'fs';

const REFRESH_TOKEN_FILE = '.psn_refresh_token';

type Authorization = { accessToken: string };

let cachedAuth: { accessToken: string; expiresAt: number } | null = null;

function saveRefreshToken(token: string) {
  try { writeFileSync(REFRESH_TOKEN_FILE, token, 'utf8'); } catch (_) {}
}

function getStoredRefreshToken(): string | null {
  try {
    const fromFile = readFileSync(REFRESH_TOKEN_FILE, 'utf8').trim();
    if (fromFile) return fromFile;
  } catch (_) {}
  return process.env.PSN_REFRESH_TOKEN || null;
}

// Returns a valid access token, refreshing or re-authing as needed.
export async function getPsnAuth(): Promise<Authorization | null> {
  const now = Date.now();
  if (cachedAuth && now < cachedAuth.expiresAt - 60_000) {
    return { accessToken: cachedAuth.accessToken };
  }

  // Priority 1: refresh token (avoids re-using the NPSSO repeatedly)
  const refresh = getStoredRefreshToken();
  if (refresh) {
    try {
      const t = await exchangeRefreshTokenForAuthTokens(refresh);
      cachedAuth = { accessToken: t.accessToken, expiresAt: now + t.expiresIn * 1000 };
      if (t.refreshToken) { saveRefreshToken(t.refreshToken); process.env.PSN_REFRESH_TOKEN = t.refreshToken; }
      console.log('[PSN] Token via refresh_token, expires in', t.expiresIn, 'seconds');
      return { accessToken: t.accessToken };
    } catch (e) {
      console.error('[PSN] Refresh token failed, falling back to NPSSO:', (e as Error).message);
    }
  }

  // Priority 2: NPSSO secret → access code → tokens
  const npsso = (process.env.NPSSO || '').replace(/^["'\s]+|["'\s]+$/g, '');
  if (!npsso) {
    console.error('[PSN] No NPSSO secret configured.');
    return null;
  }
  try {
    const accessCode = await exchangeNpssoForAccessCode(npsso);
    const t = await exchangeAccessCodeForAuthTokens(accessCode);
    cachedAuth = { accessToken: t.accessToken, expiresAt: now + t.expiresIn * 1000 };
    if (t.refreshToken) { saveRefreshToken(t.refreshToken); process.env.PSN_REFRESH_TOKEN = t.refreshToken; }
    console.log('[PSN] Token via NPSSO, expires in', t.expiresIn, 'seconds');
    return { accessToken: t.accessToken };
  } catch (e) {
    console.error('[PSN] NPSSO auth failed:', (e as Error).message);
    return null;
  }
}

export interface PsnTrophyCounts { bronze: number; silver: number; gold: number; platinum: number; total: number }

export interface PsnGame {
  name: string;
  platform: string;
  progress: number;
  earned: { bronze: number; silver: number; gold: number; platinum: number };
}

export interface PsnLookupResult {
  found: boolean;
  error?: string;
  onlineId: string;
  accountId: string;
  avatarUrl: string | null;
  aboutMe: string;
  isPlus: boolean;
  isVerified: boolean;
  country: string;
  region: string;
  onlineStatus: string;
  platform: string;
  lastOnlineDate: string;
  nowPlaying: string;
  trophyLevel: string;
  trophyTier: number | null;
  trophies: PsnTrophyCounts;
  friendCount: number;
  friendNames: string[];
  devices: string[];
  topGames: PsnGame[];
}

function emptyResult(extra: Partial<PsnLookupResult>): PsnLookupResult {
  return {
    found: false,
    onlineId: '', accountId: '', avatarUrl: null, aboutMe: '',
    isPlus: false, isVerified: false, country: '', region: '',
    onlineStatus: 'Unknown', platform: 'N/A', lastOnlineDate: 'N/A', nowPlaying: 'N/A',
    trophyLevel: 'N/A', trophyTier: null,
    trophies: { bronze: 0, silver: 0, gold: 0, platinum: 0, total: 0 },
    friendCount: 0, friendNames: [], devices: [], topGames: [],
    ...extra,
  };
}

// Normalize raw platform strings (e.g. "PS4,PSVITA") into clean device labels.
function normalizeDevices(raw: string[]): string[] {
  const map: Record<string, string> = {
    PS5: 'PS5', PS4: 'PS4', PS3: 'PS3',
    PSVITA: 'PS Vita', 'PS VITA': 'PS Vita', VITA: 'PS Vita',
    PSP: 'PSP', PSPC: 'PC',
  };
  const order = ['PS5', 'PS4', 'PS3', 'PS Vita', 'PSP', 'PC'];
  const set = new Set<string>();
  for (const item of raw) {
    if (!item) continue;
    for (const part of String(item).split(',')) {
      const key = part.trim().toUpperCase();
      if (map[key]) set.add(map[key]);
    }
  }
  return order.filter((d) => set.has(d));
}

// Resolve a PSN gamertag (Online ID) to a full profile bundle.
export async function lookupPsnProfile(gamertag: string): Promise<PsnLookupResult> {
  const auth = await getPsnAuth();
  if (!auth) {
    return emptyResult({ error: 'PSN auth is not configured. Add the `NPSSO` secret (see /setup steps).' });
  }

  // ── Resolve gamertag → accountId via universal search ──
  let accountId = '';
  let onlineId = gamertag;
  let country = '';
  let avatarUrl: string | null = null;
  let isVerified = false;
  let isPlus = false;
  try {
    const search = await makeUniversalSearch(auth, gamertag, 'SocialAllAccounts');
    const results = search?.domainResponses?.[0]?.results || [];
    const exact = results.find(
      (r: any) => r?.socialMetadata?.onlineId?.toLowerCase() === gamertag.toLowerCase()
    );
    const r: any = exact || results[0];
    if (!r?.socialMetadata?.accountId) {
      return emptyResult({ error: `No PSN account found for "${gamertag}".` });
    }
    const m = r.socialMetadata;
    accountId = m.accountId;
    onlineId = m.onlineId || gamertag;
    country = m.country || '';
    avatarUrl = m.avatarUrl || null;
    isVerified = !!m.isOfficiallyVerified;
    isPlus = !!m.isPsPlus;
  } catch (e) {
    return emptyResult({ error: `PSN lookup failed: ${(e as Error).message}` });
  }

  // ── Gather everything else in parallel (each piece is best-effort) ──
  const [profileR, presenceR, regionR, friendsR, summaryR, titlesR] = await Promise.allSettled([
    getProfileFromAccountId(auth, accountId),
    getBasicPresence(auth, accountId),
    getUserRegion(auth, accountId),
    getUserFriendsAccountIds(auth, accountId, { limit: 20 }),
    getUserTrophyProfileSummary(auth, accountId),
    getUserTitles(auth, accountId),
  ]);

  const result = emptyResult({ found: true, onlineId, accountId, country, isVerified, isPlus });
  if (avatarUrl) result.avatarUrl = avatarUrl;

  // Profile (about me, avatar, plus)
  if (profileR.status === 'fulfilled' && profileR.value) {
    const p: any = profileR.value;
    result.aboutMe = p.aboutMe || '';
    if (typeof p.isPlus === 'boolean') result.isPlus = p.isPlus;
    const avatars: any[] = p.avatars || [];
    const best = avatars.find((a) => a.size === 'xl') || avatars.find((a) => a.size === 'l') || avatars[0];
    if (best?.url) result.avatarUrl = best.url;
  }

  // Presence (online status + now playing)
  const platformsSeen: string[] = [];
  if (presenceR.status === 'fulfilled' && presenceR.value) {
    const bp: any = (presenceR.value as any).basicPresence || {};
    const info = bp.primaryPlatformInfo || {};
    result.onlineStatus = (info.onlineStatus || bp.availability === 'availableToPlay' ? 'online' : info.onlineStatus) || 'offline';
    if (info.onlineStatus) result.onlineStatus = info.onlineStatus;
    result.platform = info.platform || 'N/A';
    result.lastOnlineDate = info.lastOnlineDate || bp.lastAvailableDate || 'N/A';
    if (info.platform) platformsSeen.push(info.platform);
    const games: any[] = bp.gameTitleInfoList || [];
    if (games.length > 0) result.nowPlaying = games[0].titleName || 'N/A';
  }

  // Region
  if (regionR.status === 'fulfilled' && regionR.value) {
    const rg: any = regionR.value;
    result.region = rg.name || rg.code || '';
  }
  if (!result.region && country) result.region = country;

  // Trophy summary
  if (summaryR.status === 'fulfilled' && summaryR.value) {
    const s: any = summaryR.value;
    result.trophyLevel = String(s.trophyLevel ?? 'N/A');
    result.trophyTier = typeof s.tier === 'number' ? s.tier : null;
    const et = s.earnedTrophies || {};
    result.trophies = {
      bronze: et.bronze || 0, silver: et.silver || 0, gold: et.gold || 0, platinum: et.platinum || 0,
      total: (et.bronze || 0) + (et.silver || 0) + (et.gold || 0) + (et.platinum || 0),
    };
  }

  // Titles → recent games + platforms played on
  if (titlesR.status === 'fulfilled' && titlesR.value) {
    const titles: any[] = (titlesR.value as any).trophyTitles || [];
    for (const t of titles) if (t.trophyTitlePlatform) platformsSeen.push(t.trophyTitlePlatform);
    const sorted = [...titles].sort((a, b) =>
      String(b.lastUpdatedDateTime || '').localeCompare(String(a.lastUpdatedDateTime || ''))
    );
    result.topGames = sorted.slice(0, 8).map((t: any) => ({
      name: t.trophyTitleName || 'Unknown',
      platform: t.trophyTitlePlatform || '',
      progress: t.progress || 0,
      earned: {
        bronze: t.earnedTrophies?.bronze || 0,
        silver: t.earnedTrophies?.silver || 0,
        gold: t.earnedTrophies?.gold || 0,
        platinum: t.earnedTrophies?.platinum || 0,
      },
    }));
  }

  // Devices — inferred from the platforms seen in presence + earned trophy titles.
  // (Sony does not expose another user's explicit device list.)
  result.devices = normalizeDevices(platformsSeen);

  // Friends — count + resolve a handful of names
  if (friendsR.status === 'fulfilled' && friendsR.value) {
    const fr: any = friendsR.value;
    result.friendCount = fr.totalItemCount ?? (fr.friends?.length || 0);
    const ids: string[] = (fr.friends || []).slice(0, 12);
    const resolved = await Promise.allSettled(ids.map((id) => getProfileFromAccountId(auth, id)));
    result.friendNames = resolved
      .map((r) => (r.status === 'fulfilled' ? (r.value as any)?.onlineId : null))
      .filter((n): n is string => !!n);
  }

  return result;
}
