import { XML } from './xml';
import { ISSUER_FORMAT, NS } from './const';
import { SamlOptions } from '@node-saml/node-saml/lib';

export class SpidRequest extends XML {
  protected get request() {
    return this.getElement('AuthnRequest', NS.SAML_PROTOCOL);
  }

  get id(): string {
    return this.request.getAttribute('ID');
  }

  get issueInstant(): Date {
    return new Date(this.request.getAttribute('IssueInstant'));
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
