export interface FortniteStats {
  account: {
    id: string;
    name: string;
  };
  global: {
    battle_pass: {
      level: number;
      progress: number;
    };
    all: {
      matchesplayed: number;
      winrate: number;
      minutesplayed: number;
      kd: number;
      score: number;
      kills: number;
      wins: number;
      top3: number;
      top5: number;
      top6: number;
      top10: number;
      top12: number;
      top25: number;
      lastmodified: number;
    };
  };
}

export class FortniteService {
  private apiKey: string;
  private baseUrl = 'https://fortniteapi.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async lookup(username: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/lookup?username=${encodeURIComponent(username)}`, {
        headers: { 'Authorization': this.apiKey }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.result ? data.account_id : null;
    } catch (error) {
      console.error('Fortnite Lookup Error:', error);
      return null;
    }
  }

  async getStats(accountId: string): Promise<FortniteStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/stats?account=${accountId}`, {
        headers: { 'Authorization': this.apiKey }
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result ? data : null;
    } catch (error) {
      console.error('Fortnite Stats Error:', error);
      return null;
    }
  }
}

export const fortniteService = new FortniteService(process.env.FORTNITE_API_IO_KEY || '');
