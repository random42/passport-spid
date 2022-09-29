import { SpidConfig } from './types';
import { SignedXml } from 'xml-crypto';
import * as XML from './xml';

const { e, attributes: attr, text } = XML;

export class SPMetadata extends XML.XMLCheerio {
  constructor(xml: string, private config: SpidConfig) {
    super(xml);
  }

  private sign(xml: string) {
    const { spid, saml } = this.config;
    const { privateKey, signatureAlgorithm } = saml;
    const cert = spid.serviceProvider.publicCert;
    const sig = new SignedXml();
    sig.signingKey = privateKey;
    sig.keyInfoProvider = {
      file: '',
      getKey: () => Buffer.from(privateKey),
      getKeyInfo: () =>
        `<X509Data><X509Certificate>${cert}</X509Certificate></X509Data>`,
    };
    sig.signatureAlgorithm = `http://www.w3.org/2001/04/xmldsig-more#rsa-${signatureAlgorithm}`;
    sig.addReference(
      `//*[local-name(.)='EntityDescriptor']`,
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      `http://www.w3.org/2001/04/xmlenc#${signatureAlgorithm}`,
    );
    sig.computeSignature(xml, {
      location: { reference: '', action: 'prepend' },
    });
    return sig.getSignedXml();
  }

  private getAttributeConsumingServices() {
    const { acs } = this.config.spid.serviceProvider;
    const data = acs.map((s, i) => ({
      'md:AttributeConsumingService': [
        {
          'md:ServiceName': [text(s.name)],
          ...attr({
            'xml:lang': 'it',
          }),
        },
        ...s.attributes.map((a) => ({
          'md:RequestedAttribute': [],
          ...attr({ Name: a }),
        })),
      ],
      ...attr({
        index: i,
      }),
    }));
    return XML.build(XML.cleanBuildObject(data));
  }

  private getSpidInfo() {
    const { serviceProvider } = this.config.spid;
    const {
      organization: org,
      contactPerson: cp,
      billingContactPerson: bcp,
    } = serviceProvider;
    const isPublic = serviceProvider.type === 'public';
    const data = [
      // organization
      {
        'md:Organization': Object.entries(org)
          .map(([lang, o]) =>
            [
              o.name && {
                'md:OrganizationName': [text(o.name)],
              },
              o.displayName && {
                'md:OrganizationDisplayName': [text(o.displayName)],
              },
              {
                'md:OrganizationURL': [text(o.url)],
              },
            ].map((x) => ({
              ...x,
              ...attr({
                'xml:lang': lang,
              }),
            })),
          )
          .flat(),
      },
      // contact person
      {
        'md:ContactPerson': [
          {
            'md:Extensions': [
              cp.VATNumber && {
                'spid:VATNumber': [text(cp.VATNumber)],
              },
              cp.IPACode && {
                'spid:IPACode': [text(cp.IPACode)],
              },
              cp.fiscalCode && {
                'spid:FiscalCode': [text(cp.fiscalCode)],
              },
              isPublic && {
                'spid:Public': [],
              },
              !isPublic && {
                'spid:Private': [],
              },
            ],
          },
          {
            'md:Company': [text(org.it.name)],
          },
          {
            'md:EmailAddress': [text(cp.email)],
          },
          cp.telephone && {
            'md:TelephoneNumber': [text(cp.telephone)],
          },
        ],
        ...attr({
          contactType: 'other',
        }),
      },
      // billing contact person
      bcp && {
        'md:ContactPerson': [
          {
            'md:Extensions': [
              {
                'fpa:CessionarioCommittente': [
                  {
                    'fpa:DatiAnagrafici': [
                      bcp.VAT && {
                        'fpa:IdFiscaleIVA': [
                          {
                            'fpa:IdPaese': [text(bcp.VAT.countryId)],
                            'fpa:IdCodice': [text(bcp.VAT.code)],
                          },
                        ],
                      },
                      bcp.fiscalCode && {
                        'fpa:CodiceFiscale': [text(bcp.fiscalCode)],
                      },
                      {
                        'fpa:Anagrafica': [
                          {
                            'fpa:Denominazione': [
                              text(bcp.personalData.fullName),
                            ],
                          },
                          bcp.personalData.title && {
                            'fpa:Titolo': [text(bcp.personalData.title)],
                          },
                          bcp.personalData.EORICode && {
                            'fpa:CodiceEORI': [text(bcp.personalData.EORICode)],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    'fpa:Sede': [
                      {
                        'fpa:Indirizzo': [text(bcp.headquarters.address)],
                      },
                      bcp.headquarters.streetNumber && {
                        'fpa:NumeroCivico': [
                          text(bcp.headquarters.streetNumber),
                        ],
                      },
                      {
                        'fpa:CAP': [text(bcp.headquarters.postalCode)],
                      },
                      {
                        'fpa:Comune': [text(bcp.headquarters.city)],
                      },
                      bcp.headquarters.state && {
                        'fpa:Provincia': [text(bcp.headquarters.state)],
                      },
                      {
                        'fpa:Nazione': [text(bcp.headquarters.country)],
                      },
                    ],
                  },
                ],
              },
              bcp.thirdPartyIntermediary && {
                'fpa:TerzoIntermediarioSoggettoEmittente': [
                  text(bcp.thirdPartyIntermediary),
                ],
              },
            ],
            ...attr({
              'xmlns:fpa': 'https://spid.gov.it/invoicing-extensions',
            }),
          },
          bcp.company && {
            'md:Company': [text(bcp.company)],
          },
          {
            'md:EmailAddress': [text(bcp.email)],
          },
        ],
        ...attr({
          contactType: 'billing',
        }),
      },
    ];
    return XML.build(XML.cleanBuildObject(data));
  }

  private setMdPrefix() {
    const samlExt = this.$('EntityDescriptor').attr('xmlns');
    const spidExt = 'https://spid.gov.it/saml-extensions';
    this.$('EntityDescriptor').attr('xmlns:md', samlExt).removeAttr('xmlns');
    this.$('EntityDescriptor').attr('xmlns:spid', spidExt);
    this.$.root()
      .find('*')
      .each((i, item) => {
        if (!item.tagName.includes(':')) {
          item.tagName = `md:${item.tagName}`;
        }
      });
  }

  async build() {
    this.setMdPrefix();
    // load spid namespace
    this.$(e(`md:SPSSODescriptor`)).attr('AuthnRequestsSigned', 'true');
    this.$(e(`md:AssertionConsumerService`)).attr('index', '0');
    this.$(e(`md:SPSSODescriptor`)).append(
      this.getAttributeConsumingServices(),
    );
    this.$(e(`md:EntityDescriptor`)).append(this.getSpidInfo());
    return this.sign(this.$.xml());
    // return this.$.xml();
  }
}
