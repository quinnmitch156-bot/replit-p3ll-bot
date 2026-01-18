export interface XboxProfile {
  xid: string;
  gamertag: string;
  gamerScore: string;
  displayPicRaw: string;
  // Add more fields as needed based on xbl.io response
}

export class XboxService {
  private apiKey: string;
  private baseUrl = 'https://xbl.io/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchGamertag(gamertag: string): Promise<XboxProfile | null> {
    try {
      // Note: Endpoint might vary based on xbl.io specific documentation
      const response = await fetch(`${this.baseUrl}/friends/search?gt=${encodeURIComponent(gamertag)}`, {
        headers: { 'X-Authorization': this.apiKey }
      });

      if (!response.ok) return null;

      const data = await response.json();
      // Adjust parsing based on actual XBL.io response structure
      if (data && data.profileUsers && data.profileUsers.length > 0) {
        const user = data.profileUsers[0];
        return {
          xid: user.id,
          gamertag: user.settings.find((s: any) => s.id === 'Gamertag')?.value || gamertag,
          gamerScore: user.settings.find((s: any) => s.id === 'Gamerscore')?.value || '0',
          displayPicRaw: user.settings.find((s: any) => s.id === 'GameDisplayPicRaw')?.value || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Xbox Lookup Error:', error);
      return null;
    }
  }
}

export const xboxService = new XboxService(process.env.XBL_TOKEN || '');
