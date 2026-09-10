/**
 * مرکز ثبت و دریافت آداپتورهای انتشار چندکاناله (Provider Registry & Factory)
 */

import { PublicationProvider, PublicationProviderAdapter, PublicationChannelConfig } from '../publicationTypes';
import { EitaaProvider } from './eitaaProvider';
import { BaleProvider } from './baleProvider';
import { TelegramProvider } from './telegramProvider';
import { InstagramProvider } from './instagramProvider';
import { WebsiteProvider } from './websiteProvider';

export function getPublicationProvider(
  provider: PublicationProvider,
  config: PublicationChannelConfig = {}
): PublicationProviderAdapter {
  switch (provider) {
    case 'eitaa':
      return new EitaaProvider(config);
    case 'bale':
      return new BaleProvider(config);
    case 'telegram':
      return new TelegramProvider(config);
    case 'instagram':
      return new InstagramProvider(config);
    case 'website':
      return new WebsiteProvider(config);
    default:
      throw new Error(`درگاه انتشار ناشناخته: ${provider}`);
  }
}
