import type { SamlOptions } from '@node-saml/node-saml/lib';
import { ISSUER_FORMAT, NS } from './const';
import { XML } from './xml';

export class SpidRequest extends XML {
  protected get request() {
    return this.getElement('AuthnRequest', NS.SAML_PROTOCOL);
  }

  get id(): string {
    const id = this.request.getAttribute('ID');
    if (!id) throw new Error('Missing ID attribute in AuthnRequest');
    return id;
  }

  get issueInstant(): Date {
    const instant = this.request.getAttribute('IssueInstant');
    if (!instant)
      throw new Error('Missing IssueInstant attribute in AuthnRequest');
    return new Date(instant);
  }

  generate(options: SamlOptions) {
    const issuer = this.getElement('Issuer');
    const nameIdPolicy = this.getElement('NameIDPolicy');
    issuer.setAttribute('Format', ISSUER_FORMAT);
    issuer.setAttribute('NameQualifier', options.issuer);
    nameIdPolicy.removeAttribute('AllowCreate');
    const sig = this.getElement('Signature');
    if (sig) this.dom.removeChild(this.getElement('Signature'));
    return this;
  }
}
