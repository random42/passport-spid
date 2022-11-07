import { ValidateInResponseTo } from '@node-saml/node-saml/lib/types';

export const SPID_LEVELS = {
  1: 'https://www.spid.gov.it/SpidL1',
  2: 'https://www.spid.gov.it/SpidL2',
  3: 'https://www.spid.gov.it/SpidL3',
} as const;

export const FORCE_AUTHN_LEVELS: ReadonlyArray<keyof typeof SPID_LEVELS> = [
  2, 3,
];

export const SPID_IDP_IDENTIFIERS = {
  'https://id.lepida.it/idp/shibboleth': 'lepidaid',
  'https://identity.infocert.it': 'infocertid',
  'https://identity.sieltecloud.it': 'sielteid',
  'https://idp.namirialtsp.com/idp': 'namirialid',
  'https://login.id.tim.it/affwebservices/public/saml2sso': 'timid',
  'https://loginspid.aruba.it': 'arubaid',
  'https://posteid.poste.it': 'posteid',
  'https://spid.intesa.it': 'intesaid',
  'https://spid.register.it': 'spiditalia',
} as const;

export const IDENTIFIER_FORMAT =
  'urn:oasis:names:tc:SAML:2.0:nameid-format:transient';
export const ISSUER_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity';
export const SUBJECT_CONFIRMATION_METHOD =
  'urn:oasis:names:tc:SAML:2.0:cm:bearer';

export const SPID_FORCED_SAML_CONFIG = {
  signMetadata: false,
  digestAlgorithm: 'sha512',
  allowCreate: false,
  wantAssertionsSigned: true,
  wantAuthnResponseSigned: true,
  disableRequestedAuthnContext: false,
  validateInResponseTo: ValidateInResponseTo.never,
  identifierFormat: IDENTIFIER_FORMAT,
  passive: false,
  cacheProvider: undefined,
  requestIdExpirationPeriodMs: 15 * 60 * 1000,
  xmlSignatureTransforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/2001/10/xml-exc-c14n#',
  ] as string[],
  acceptedClockSkewMs: 0,
  maxAssertionAgeMs: undefined,
  providerName: undefined,
  disableRequestAcsUrl: false,
  scoping: undefined,
  metadataContactPerson: undefined,
  metadataOrganization: undefined,
  spNameQualifier: undefined,
  samlAuthnRequestExtensions: undefined,
  samlLogoutRequestExtensions: undefined,
  host: undefined,
  path: undefined,
  protocol: undefined,
} as const;

export const NS = {
  SAML_METADATA: 'urn:oasis:names:tc:SAML:2.0:metadata',
  SAML_PROTOCOL: 'urn:oasis:names:tc:SAML:2.0:protocol',
  SAML_ASSERTION: 'urn:oasis:names:tc:SAML:2.0:assertion',
  SIG: 'http://www.w3.org/2000/09/xmldsig#',
  SPID: 'https://spid.gov.it/saml-extensions',
};
