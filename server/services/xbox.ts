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
        
        try {
          const presenceRes = await fetch(`${this.baseUrl}/presence/${user.id}`, {
            headers: { 'X-Authorization': this.apiKey }
          });
          if (presenceRes.ok) {
            const presenceData = await presenceRes.json();
            presenceState = presenceData.state || 'Offline';
            presenceText = presenceData.lastSeen?.titleName || 'None';
            lastSeen = presenceData.lastSeen?.timestamp || '';
          }
          
          // Fetch profile summary for counts
          const summaryRes = await fetch(`${this.baseUrl}/profile/summary/${user.id}`, {
            headers: { 'X-Authorization': this.apiKey }
          });
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            followingCount = summaryData.following || 0;
            friendsCount = summaryData.followers || 0;
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
          email: user.settings.find((s: any) => s.id === 'AccountEmail')?.value,
          lastPurchaseLocation: user.settings.find((s: any) => s.id === 'PreferredLocation')?.value
        };
      }
      return null;
    } catch (error) {
      console.error('Xbox Lookup Error:', error);
      return null;
    }
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
