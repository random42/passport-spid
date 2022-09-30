import { Request } from 'express';
import { SamlConfig, Profile } from '@node-saml/passport-saml';
import * as passport from 'passport';
import { SPID_LEVELS, SPID_FORCED_SAML_CONFIG } from './const';

export type SpidLevel = keyof typeof SPID_LEVELS;

export interface SpidProfile {
  spidCode: string;
  email: string;
  digitalAddress: string;
  fiscalNumber: string;
  name: string;
  familyName: string;
  mobilePhone: string;
  gender: string;
  dateOfBirth: Date;
  placeOfBirth: string;
  address: string;
  companyName: string;
  idCard: string;
  ivaCode: string;
  registeredOffice: string;
}

export type SpidAttribute = keyof SpidProfile;

export interface IDPConfig
  extends Required<Pick<SamlConfig, 'cert' | 'entryPoint' | 'logoutUrl'>> {
  entityId: string;
}

export interface ContactPerson {
  email: string;
  telephone?: string;
  VATNumber?: string;
  fiscalCode?: string;
  IPACode?: string;
}

export interface BillingContactPerson {
  fiscalCode?: string;
  VAT?: {
    countryId?: string;
    code?: string;
    name?: string;
  };
  personalData: {
    fullName: string;
    title?: string;
    EORICode?: string;
  };
  headquarters: {
    address: string;
    streetNumber?: string;
    postalCode: string;
    city: string;
    state?: string;
    country: string;
  };
  email: string;
  company?: string;
  thirdPartyIntermediary?: string;
}

export interface ServiceProviderOrganization {
  url: string;
  displayName: string;
  name: string;
}

export interface AttributeConsumingService {
  name?: string;
  attributes: ReadonlyArray<SpidAttribute>;
}

export interface CommonServiceProviderConfig {
  type: 'public' | 'private';
  entityId: string;
  publicCert: string;
  acs: AttributeConsumingService[];
  organization: {
    it: ServiceProviderOrganization;
    [lang: string]: ServiceProviderOrganization;
  };
  contactPerson: ContactPerson;
  billingContactPerson?: BillingContactPerson;
}

export interface PrivateServiceProviderConfig
  extends CommonServiceProviderConfig {
  type: 'private';
  billingContactPerson: BillingContactPerson;
}

export interface PublicContactPerson extends ContactPerson {
  IPACode: string;
}

export interface PublicServiceProviderConfig
  extends CommonServiceProviderConfig {
  type: 'public';
  contactPerson: PublicContactPerson;
}

export type ServiceProviderConfig =
  | PrivateServiceProviderConfig
  | PublicServiceProviderConfig;

export type SignatureAlgorithm = 'sha256' | 'sha512';

export type ForcedSamlConfig = keyof typeof SPID_FORCED_SAML_CONFIG;
export type DynamicSamlConfig = 'cert' | 'entryPoint' | 'logoutUrl' | 'issuer';
export type OmitSamlConfig = ForcedSamlConfig | DynamicSamlConfig;

export interface StrategyOptions {
  name?: string;
  passReqToCallback?: boolean;
}

export interface SpidSamlConfig extends Omit<SamlConfig, OmitSamlConfig> {
  privateKey: string | Buffer;
  authnContext: SpidLevel[];
  signatureAlgorithm: SignatureAlgorithm;
  logoutCallbackUrl: string;
  requestIdExpirationPeriodMs?: number;
}

export interface Cache {
  get(key: string): Promise<string | undefined> | string | undefined;
  set(key: string, value: string);
  delete(key: string);
  /**
   * Expire function should delete the key after passed milliseconds
   * by default setTimeout will be used, but you can provide a custom function
   * for example redis PEXPIRE/EXPIRE command
   */
  expire?(key: string, ms: number);
}

export interface SpidConfig extends StrategyOptions {
  saml: SpidSamlConfig;
  spid: {
    serviceProvider: ServiceProviderConfig;
    getIDPRegistryMetadata: () => string | Promise<string>;
    getIDPEntityIdFromRequest: (req: Request) => string | Promise<string>;
  };
  cache: Cache;
}

export interface SamlSpidProfile extends Profile {
  getSamlRequestXml(): string;
  attributes: Partial<SpidProfile>;
}
