import { ServiceProviderOrganization, SpidConfig } from './types';
import * as XML from './xml';
import { SPID_SAML_EXTENSION } from './const';
import { sign } from './sign';

export class SPMetadata extends XML.XML {
  constructor(xml: string, private config: SpidConfig) {
    super(xml);
  }

  private sign() {
    const { spid, saml } = this.config;
    const { privateKey, signatureAlgorithm } = saml;
    const cert = spid.serviceProvider.publicCert;
    this.load(
      sign(this.xml(), {
        signatureAlgorithm,
        privateKey,
        certificate: cert,
        action: 'prepend',
        nodeName: 'EntityDescriptor',
      }),
    );
    return this;
  }

  private getAttributeConsumingServices() {
    const { acs } = this.config.spid.serviceProvider;
    return acs.map((s, i) => ({
      '@': {
        index: i,
      },
      'md:ServiceName': {
        '#': s.name,
        '@': { 'xml:lang': 'it' },
      },
      'md:RequestedAttribute': s.attributes.map((a) => ({
        '@': {
          Name: a,
        },
      })),
    }));
  }

  private getSpidInfo() {
    const { serviceProvider } = this.config.spid;
    const {
      organization: org,
      contactPerson: cp,
      billingContactPerson: bcp,
    } = serviceProvider;
    const isPublic = serviceProvider.type === 'public';
    const orgKey = (key: keyof ServiceProviderOrganization) =>
      Object.entries(org)
        .map(([lang, o]) => {
          if (o[key]) {
            return {
              '#': o[key],
              '@': {
                'xml:lang': lang,
              },
            };
          } else return undefined;
        })
        .filter((x) => x);
    const tree = {
      'md:Organization': {
        'md:OrganizationName': orgKey('name'),
        'md:OrganizationDisplayName': orgKey('displayName'),
        'md:OrganizationURL': orgKey('url'),
      },
      'md:ContactPerson': [
        {
          '@': {
            contactType: 'other',
          },
          'md:Extensions': {
            'spid:VATNumber': cp.VATNumber,
            'spid:IPACode': cp.IPACode,
            'spid:FiscalCode': cp.fiscalCode,
            ...(isPublic ? { 'spid:Public': {} } : { 'spid:Private': {} }),
          },
          'md:Company': org.it.name,
          'md:EmailAddress': cp.email,
          ...(cp.telephone ? { 'md:TelephoneNumber': cp.telephone } : null),
        },
        bcp && {
          '@': {
            contactType: 'billing',
          },
          'md:Extensions': {
            '@': {
              'xmlns:fpa': 'https://spid.gov.it/invoicing-extensions',
            },
            'fpa:CessionarioCommittente': {
              'fpa:DatiAnagrafici': {
                ...(bcp.VAT
                  ? {
                      'fpa:IdFiscaleIVA': {
                        'fpa:IdPaese': bcp.VAT.countryId,
                        'fpa:IdCodice': bcp.VAT.code,
                      },
                    }
                  : null),
                ...(bcp.fiscalCode
                  ? {
                      'fpa:CodiceFiscale': bcp.fiscalCode,
                    }
                  : null),
                'fpa:Anagrafica': {
                  'fpa:Denominazione': bcp.personalData.fullName,
                  ...(bcp.personalData.title
                    ? { 'fpa:Titolo': bcp.personalData.title }
                    : null),
                  ...(bcp.personalData.EORICode
                    ? { 'fpa:CodiceEORI': bcp.personalData.EORICode }
                    : null),
                },
              },
              'fpa:Sede': {
                'fpa:Indirizzo': bcp.headquarters.address,
                ...(bcp.headquarters.streetNumber
                  ? { 'fpa:NumeroCivico': bcp.headquarters.streetNumber }
                  : null),
                'fpa:CAP': bcp.headquarters.postalCode,
                'fpa:Comune': bcp.headquarters.city,
                ...(bcp.headquarters.state
                  ? { 'fpa:Provincia': bcp.headquarters.state }
                  : null),
                'fpa:Nazione': bcp.headquarters.country,
              },
            },
            ...(bcp.thirdPartyIntermediary
              ? {
                  'fpa:TerzoIntermediarioSoggettoEmittente':
                    bcp.thirdPartyIntermediary,
                }
              : null),
          },
          ...(bcp.company ? { 'md:Company': bcp.company } : null),
          'md:EmailAddress': bcp.email,
        },
      ].filter((x) => x),
    };
    return tree;
  }

  private setNamespaces() {
    this.renameNamespace('', 'md', 'EntityDescriptor');
    this.set('md:EntityDescriptor.@.xmlns:spid', SPID_SAML_EXTENSION);
  }

  generate() {
    this.setNamespaces();
    this.set(
      'md:EntityDescriptor.md:SPSSODescriptor.md:AssertionConsumerService.@.index',
      '0',
    );
    this.set(
      'md:EntityDescriptor.md:SPSSODescriptor.md:AttributeConsumingService',
      this.getAttributeConsumingServices(),
    );
    Object.assign(this.get('md:EntityDescriptor'), this.getSpidInfo());
    return this.sign();
  }
}
