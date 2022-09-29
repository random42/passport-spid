import { load } from 'cheerio';
import { SpidConfig } from './types';
import fs from 'fs-extra';
import { SignedXml } from 'xml-crypto';
import * as XML from './xml';

const { e, attributes: attr, text } = XML;

export class SpidRequest extends XML.XMLCheerio {
  constructor(xml: string) {
    super(xml);
  }

  getId(): string {
    return this.$(e('samlp:AuthnRequest')).attr('ID');
  }

  getIssueInstant(): Date {
    return new Date(this.$(e('samlp:AuthnRequest')).attr('IssueInstant'));
  }

  private sign(xml: string, config: SpidConfig) {
    const { saml } = config;
    const { privateKey, signatureAlgorithm } = saml;
    // const cert = spid.serviceProvider.publicCert;
    const sig = new SignedXml();
    sig.signingKey = privateKey;
    // sig.keyInfoProvider = {
    //   file: '',
    //   getKey: () => Buffer.from(privateKey),
    //   getKeyInfo: () =>
    //     `<X509Data><X509Certificate>${cert}</X509Certificate></X509Data>`,
    // };
    sig.signatureAlgorithm = `http://www.w3.org/2001/04/xmldsig-more#rsa-${signatureAlgorithm}`;
    sig.addReference(
      `//*[local-name(.)='AuthnRequest']`,
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      `http://www.w3.org/2001/04/xmlenc#${signatureAlgorithm}`,
    );
    sig.computeSignature(xml, {
      location: { reference: '', action: 'append' },
    });
    return sig.getSignedXml();
  }

  build(config: SpidConfig) {
    this.$(e('saml:Issuer'))
      .attr('Format', 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity')
      .attr('NameQualifier', config.spid.serviceProvider.entityId);
    this.$(e('samlp:NameIDPolicy')).removeAttr('AllowCreate');
    let r = this.$.xml();
    if (config.saml.authnRequestBinding === 'HTTP-POST') {
      r = this.sign(r, config);
    }
    return r;
  }
}
