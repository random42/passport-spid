import { ServiceProviderOrganization, SpidConfig } from './types';
import * as XML from './xml';
import { NS } from './const';
import { sign } from './sign';

export class SPMetadata extends XML.XML {
  constructor(xml: string, private config: SpidConfig) {
    super(xml);
  }

  private sign() {
    const { spid, saml } = this.config;
    const { privateKey, signatureAlgorithm } = saml;
    const cert = spid.serviceProvider.certificate;
    return sign(this.xml(), {
      signatureAlgorithm,
      privateKey,
      certificate: cert,
      action: 'prepend',
      nodeName: 'EntityDescriptor',
    });
  }

  private getAttributeConsumingServices() {
    const { acs } = this.config.spid.serviceProvider;
    return {
      AttributeConsumingService: acs.map((s, i) => ({
        '@': {
          index: i,
        },
        ServiceName: {
          '#': s.name,
          '@': { 'xml:lang': 'it' },
        },
        RequestedAttribute: s.attributes.map((a) => ({
          '@': {
            Name: a,
          },
        })),
      })),
    };
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
      Organization: {
        OrganizationName: orgKey('name'),
        OrganizationDisplayName: orgKey('displayName'),
        OrganizationURL: orgKey('url'),
      },
      ContactPerson: [
        {
          '@': {
            contactType: 'other',
          },
          Extensions: {
            'spid:VATNumber': cp.VATNumber,
            'spid:IPACode': cp.IPACode,
            'spid:FiscalCode': cp.fiscalCode,
            ...(isPublic ? { 'spid:Public': {} } : { 'spid:Private': {} }),
          },
          Company: org.it.name,
          EmailAddress: cp.email,
          ...(cp.telephone ? { TelephoneNumber: cp.telephone } : null),
        },
        bcp && {
          '@': {
            contactType: 'billing',
          },
          Extensions: {
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
          ...(bcp.company ? { Company: bcp.company } : null),
          EmailAddress: bcp.email,
        },
      ].filter((x) => x),
    };
    return tree;
  }

  generate() {
    this.getElement('EntityDescriptor').setAttribute('xmlns:spid', NS.SPID);
    this.getElement('AssertionConsumerService').setAttribute('index', '0');
    const acs = XML.nodesFromObject(this.getAttributeConsumingServices());
    const spidInfo = XML.nodesFromObject(this.getSpidInfo());
    acs.forEach((x) => this.getElement('SPSSODescriptor').appendChild(x));
    spidInfo.forEach((x) => this.getElement('EntityDescriptor').appendChild(x));
    return this.sign();
  }
}
