import { XML } from './xml';
import { ISSUER_FORMAT } from './const';
import { SamlOptions } from '@node-saml/node-saml/lib';

export class SpidRequest extends XML {
  get id(): string {
    return this.get('samlp:AuthnRequest.@.ID');
  }

  get issueInstant(): Date {
    return new Date(this.get('samlp:AuthnRequest.@.IssueInstant'));
  }

  generate(options: SamlOptions) {
    this.set('samlp:AuthnRequest.saml:Issuer.@.Format', ISSUER_FORMAT);
    this.set('samlp:AuthnRequest.saml:Issuer.@.NameQualifier', options.issuer);
    this.unset('samlp:AuthnRequest.samlp:NameIDPolicy.@.AllowCreate');
    this.unset('samlp:AuthnRequest.Signature');
  }
}
