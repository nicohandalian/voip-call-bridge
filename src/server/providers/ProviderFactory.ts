import { VoiceProvider } from './BaseProvider';
import { SinchProvider } from './SinchProvider';
import { InfobipProvider } from './InfobipProvider';
import { TelnyxProvider } from './TelnyxProvider';

export type ProviderType = 'telnyx' | 'sinch' | 'infobip';

export class ProviderFactory {
  static createProvider(type: ProviderType): VoiceProvider {
    switch (type) {
      case 'telnyx':
        return new TelnyxProvider(
          process.env.TELNYX_API_KEY || 'demo',
          process.env.TELNYX_CONNECTION_ID || 'demo'
        );
      
      case 'sinch':
        return new SinchProvider(
          process.env.SINCH_API_KEY || 'demo',
          process.env.SINCH_SERVICE_PLAN_ID || 'demo'
        );
      
      case 'infobip':
        return new InfobipProvider(
          process.env.INFOBIP_API_KEY || 'demo',
          process.env.INFOBIP_BASE_URL || 'https://api.infobip.com'
        );
      
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  static getAvailableProviders(): Array<{ type: ProviderType; name: string; configured: boolean }> {
    return [
      {
        type: 'telnyx',
        name: 'Telnyx',
        configured: !!(process.env.TELNYX_API_KEY && process.env.TELNYX_CONNECTION_ID)
      },
      {
        type: 'sinch',
        name: 'Sinch',
        configured: !!(process.env.SINCH_API_KEY && process.env.SINCH_SERVICE_PLAN_ID)
      },
      {
        type: 'infobip',
        name: 'Infobip',
        configured: !!(process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL)
      }
    ];
  }
}
