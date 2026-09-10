import { config } from '../config.js';
import { BoundingBox, SatelliteObservation } from '../types.js';
import { INITIAL_OBSERVATIONS } from '../db/presetsData.js';

export interface CopernicusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class CopernicusService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  public getStatus(): 'AUTHENTICATED' | 'NOT CONFIGURED' | 'ERROR' {
    if (!config.copernicusClientId || !config.copernicusClientSecret) {
      return 'NOT CONFIGURED';
    }
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return 'AUTHENTICATED';
    }
    return 'NOT CONFIGURED';
  }

  public async authenticate(): Promise<boolean> {
    if (!config.copernicusClientId || !config.copernicusClientSecret) {
      return false;
    }

    try {
      const authEndpoint = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', config.copernicusClientId);
      params.append('client_secret', config.copernicusClientSecret);

      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        console.error('Copernicus auth failed:', response.statusText);
        return false;
      }

      const data = await response.json() as CopernicusTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      return true;
    } catch (err) {
      console.error('Copernicus auth error:', err);
      return false;
    }
  }

  public async searchScenes(bounds: BoundingBox, startDate?: string, endDate?: string): Promise<{ scenes: SatelliteObservation[]; isDemo: boolean; message: string }> {
    const isConfigured = Boolean(config.copernicusClientId && config.copernicusClientSecret);

    if (isConfigured) {
      const authed = await this.authenticate();
      if (authed && this.accessToken) {
        try {
          const catalogUrl = 'https://sh.dataspace.copernicus.eu/catalog/v1/search';
          const queryPayload = {
            collections: ['sentinel-1-grd'],
            bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
            datetime: `${startDate || '2024-01-01T00:00:00Z'}/${endDate || new Date().toISOString()}`,
            limit: 5,
            query: {
              'sar:instrument_mode': { eq: 'IW' },
              'polarization:values': { contains: 'VV' }
            }
          };

          const searchRes = await fetch(catalogUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryPayload)
          });

          if (searchRes.ok) {
            const data: any = await searchRes.json();
            const scenes: SatelliteObservation[] = (data.features || []).map((f: any) => ({
              scene_id: f.id,
              mission: 'Sentinel-1 (Copernicus CDSE)',
              sensor: 'C-SAR',
              mode: f.properties?.['sar:instrument_mode'] || 'IW',
              polarization: (f.properties?.['polarization:values'] || ['VV', 'VH']).join(' / '),
              orbit_direction: f.properties?.['sat:orbit_state']?.toUpperCase() || 'DESCENDING',
              acquisition_timestamp: f.properties?.datetime || f.properties?.start_datetime,
              aoi_name: 'Custom Bounding Box',
              bounds,
              cloud_cover_percent: 0.0,
              is_demo: false,
              notes: 'Live acquisition retrieved from Copernicus Data Space Ecosystem API.'
            }));

            if (scenes.length > 0) {
              return {
                scenes,
                isDemo: false,
                message: 'Live satellite observations successfully queried from Copernicus Data Space Ecosystem.'
              };
            }
          }
        } catch (searchErr) {
          console.error('CDSE catalog query failed, falling back to demo observation:', searchErr);
        }
      }
    }

    // Honest Fallback to Demo Data
    return {
      scenes: [
        INITIAL_OBSERVATIONS['emilia-romagna'],
        INITIAL_OBSERVATIONS['bengaluru'],
        INITIAL_OBSERVATIONS['mumbai']
      ],
      isDemo: true,
      message: 'DEMO DATA ACTIVE: Copernicus API credentials not configured or live scene unavailable. Operating on calibrated historical Sentinel-1 GRD SAR data.'
    };
  }

  public getLatestObservation(presetId: string): SatelliteObservation {
    const found = INITIAL_OBSERVATIONS[presetId];
    if (found) return found;
    return INITIAL_OBSERVATIONS['emilia-romagna'];
  }
}

export const copernicusService = new CopernicusService();