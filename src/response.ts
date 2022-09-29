import * as XML from './xml';

const { e, attributes: attr, text } = XML;

export class SpidResponse extends XML.XMLCheerio {
  constructor(xml: string) {
    super(xml);
  }

  getId(): string {
    return this.$(e('samlp:Response')).attr('ID');
  }

  getInResponseTo(): string {
    return this.$(e('samlp:Response')).attr('InResponseTo');
  }

  getIssueInstant(): Date {
    return new Date(this.$(e('samlp:Response')).attr('IssueInstant'));
  }

  getIssuer(): string {
    return this.$(e('saml:Issuer')).text();
  }
}
