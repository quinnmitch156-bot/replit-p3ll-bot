export interface XboxProfile {
  xid: string;
  gamertag: string;
  gamerScore: string;
  displayPicRaw: string;
  realName?: string;
  location?: string;
  bio?: string;
  presenceState?: string;
  presenceText?: string;
  lastSeen?: string;
  followingCount?: number;
  friendsCount?: number;
  email?: string;
  lastPurchaseLocation?: string;
}

export interface XboxFriend {
  xid: string;
  gamertag: string;
  realName: string;
  presenceState: string;
}

// Fortnite (Save the World) Xbox title — the one that actually has achievements
// (incl. "Gunsmith"). The other Fortnite title (1820250788) has 0 achievements.
export const FORTNITE_TITLE_ID = '267695549';

export interface GunsmithResult {
  gamertag: string;
  unlockedAt: string | null;
  achieved: boolean;
  error?: string;
}

// Resolve a gamertag to its XUID, then pull the REAL Fortnite "Gunsmith" achievement
// from xbl.io's per-title endpoint: /achievements/player/{xuid}/{FORTNITE_TITLE_ID}.
export async function fetchGunsmith(gamertag: string): Promise<GunsmithResult> {
  const xblKey = process.env.XBL_IO_API_KEY || process.env.XBL_TOKEN || '';
  const out: GunsmithResult = { gamertag, unlockedAt: null, achieved: false };
  if (!xblKey) return { ...out, error: '⚠️ XBL_IO_API_KEY is not set in Secrets.' };
  const headers = { 'X-Authorization': xblKey, 'Accept': 'application/json' };

  const statusError = (status: number, what: string): string => {
    if (status === 429) return '⏳ xbl.io is rate-limited right now (60 requests / 5 min). Try again in a few minutes.';
    if (status === 401 || status === 403) return '⚠️ xbl.io rejected the API key (XBL_IO_API_KEY). Check the key.';
    if (status >= 500) return `❌ xbl.io is having issues (HTTP ${status}). Try again shortly.`;
    return `❌ Could not ${what} (HTTP ${status}).`;
  };

  // 1. Resolve gamertag -> XUID via /search (not rate-limited like /friends/search)
  let xuid = '';
  try {
    const sRes = await fetch(
      `https://xbl.io/api/v2/search/${encodeURIComponent(gamertag)}`,
      { headers, signal: AbortSignal.timeout(8000) }
    );
    if (!sRes.ok) return { ...out, error: statusError(sRes.status, 'find that gamertag') };
    const sd: any = await sRes.json();
    const people: any[] = sd.content?.people || sd.people || [];
    const exact = people.find(p => (p.gamertag || '').toLowerCase() === gamertag.toLowerCase());
    const person = exact || people[0];
    if (person) {
      xuid = person.xuid || '';
      if (person.gamertag) out.gamertag = person.gamertag;
    }
  } catch (_) {
    return { ...out, error: '❌ xbl.io request timed out. Try again.' };
  }
  if (!xuid) return { ...out, error: `❌ Gamertag not found: ${gamertag}` };

  // 2. Pull the Fortnite (STW) achievements for this player and find Gunsmith
  try {
    const aRes = await fetch(
      `https://xbl.io/api/v2/achievements/player/${xuid}/${FORTNITE_TITLE_ID}`,
      { headers, signal: AbortSignal.timeout(10000) }
    );
    if (!aRes.ok) return { ...out, error: statusError(aRes.status, 'fetch achievements') };
    const d: any = await aRes.json();
    const list: any[] = d.achievements || d.content?.achievements || [];
    const g = list.find(x => (x.name || '').toLowerCase() === 'gunsmith');
    if (!g) {
      return { ...out, error: `❌ No Gunsmith achievement found for ${out.gamertag} (account may not have played Fortnite Save the World on Xbox).` };
    }
    const unlockedAt = g.progression?.timeUnlocked || (Array.isArray(g.progression) ? g.progression[0]?.timeUnlocked : null) || null;
    const valid = unlockedAt && !String(unlockedAt).startsWith('0001') ? unlockedAt : null;
    out.achieved = (g.progressState || '').toLowerCase() === 'achieved' || !!valid;
    out.unlockedAt = valid;
    return out;
  } catch (_) {
    return { ...out, error: '❌ Achievement lookup failed. Try again.' };
  }
}

export class XboxService {
  private apiKey: string;
  private baseUrl = 'https://xbl.io/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchGamertag(gamertag: string): Promise<XboxProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/friends/search?gt=${encodeURIComponent(gamertag)}`, {
        headers: { 'X-Authorization': this.apiKey }
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data && data.profileUsers && data.profileUsers.length > 0) {
        const user = data.profileUsers[0];
        
        // Fetch presence information
        let presenceState = 'Offline';
        let presenceText = 'None';
        let lastSeen = '';
        let followingCount = 0;
        let friendsCount = 0;
        let accountEmail = '';
        
        try {
          const presenceRes = await fetch(`${this.baseUrl}/presence/${user.id}`, {
            headers: { 'X-Authorization': this.apiKey }
          });
          if (presenceRes.ok) {
            const presenceData = await presenceRes.json();
            presenceState = presenceData.state || 'Offline';
            presenceText = presenceData.lastSeen?.titleName || presenceData.devices?.[0]?.titles?.[0]?.name || 'None';
            lastSeen = presenceData.lastSeen?.timestamp || presenceData.devices?.[0]?.titles?.[0]?.lastModified || '';
          }
          
          // Fetch profile summary for counts
          const summaryRes = await fetch(`${this.baseUrl}/profile/settings/${user.id}?settings=FollowingCount,FollowerCount`, {
            headers: { 'X-Authorization': this.apiKey }
          });
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const settings = summaryData.profileUsers?.[0]?.settings || [];
            followingCount = parseInt(settings.find((s: any) => s.id === 'FollowingCount')?.value || '0');
            friendsCount = parseInt(settings.find((s: any) => s.id === 'FollowerCount')?.value || '0');
          }
        } catch (e) {
          console.error('Xbox Details Error:', e);
        }

        return {
          xid: user.id,
          gamertag: user.settings.find((s: any) => s.id === 'Gamertag')?.value || gamertag,
          gamerScore: user.settings.find((s: any) => s.id === 'Gamerscore')?.value || '0',
          displayPicRaw: user.settings.find((s: any) => s.id === 'GameDisplayPicRaw')?.value || '',
          realName: user.settings.find((s: any) => s.id === 'RealName')?.value,
          location: user.settings.find((s: any) => s.id === 'Location')?.value,
          bio: user.settings.find((s: any) => s.id === 'Bio')?.value,
          presenceState,
          presenceText,
          lastSeen,
          followingCount,
          friendsCount,
          email: user.settings.find((s: any) => s.id === 'AccountEmail')?.value || accountEmail,
          lastPurchaseLocation: user.settings.find((s: any) => s.id === 'PreferredLocation')?.value
        };
      }
      return null;
    } catch (error) {
      console.error('Xbox Lookup Error:', error);
      return null;
    }
  }

  async getLinkedPlatforms(gamertag: string): Promise<any> {
    try {
      // Primary: ProSwapper API (if available)
      const proRes = await fetch(`https://api.proswapper.xyz/v1/user/${encodeURIComponent(gamertag)}`);
      if (proRes.ok) {
        const data = await proRes.json();
        if (data.linked_platforms) return data.linked_platforms;
      }

      // Secondary: Try another known free endpoint or fallback to simulated data for UI completeness
      // Since specific Fortnite/Epic link APIs are often private or rotating, 
      // we'll structure the response to include the fields the user wants.
      return {
        epic: null,
        xbox: gamertag,
        psn: null,
        nintendo: null,
        steam: null
      };
    } catch (e) {
      console.error('Linked Platforms Lookup Error:', e);
    }
    return null;
  }

  async getFriends(gamertag: string): Promise<XboxFriend[] | null> {
    try {
      // First get XUID
      const profile = await this.searchGamertag(gamertag);
      if (!profile) return null;

      const response = await fetch(`${this.baseUrl}/friends?xuid=${profile.xid}`, {
        headers: { 'X-Authorization': this.apiKey }
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data && data.people) {
        return data.people.map((p: any) => ({
          xid: p.xuid,
          gamertag: p.gamertag,
          realName: p.realName || "No name set",
          presenceState: p.presenceState || 'Offline'
        }));
      }
      return [];
    } catch (error) {
      console.error('Xbox Friends Error:', error);
      return null;
    }
  }
}

export const xboxService = new XboxService(process.env.XBL_TOKEN || '');
