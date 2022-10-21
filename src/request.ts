import fs from 'fs-extra';
import { XML } from './xml';
import { ISSUER_FORMAT } from './const';
import { sign } from './sign';
import { SamlOptions } from '@node-saml/node-saml/lib';

export class SpidRequest extends XML {
  getId(): string {
    return this.get('samlp:AuthnRequest.@.ID');
  }

  getIssueInstant(): Date {
    return new Date(this.get('samlp:AuthnRequest.@.IssueInstant'));
  }

  generate(options: SamlOptions) {
    this.set('samlp:AuthnRequest.saml:Issuer.@.Format', ISSUER_FORMAT);
    this.set('samlp:AuthnRequest.saml:Issuer.@.NameQualifier', options.issuer);
    this.unset('samlp:AuthnRequest.samlp:NameIDPolicy.@.AllowCreate');
    this.build();
    fs.writeJSONSync('var/req.json', this._, { spaces: 2 });
    if (options.authnRequestBinding === 'HTTP-POST') {
      this.xml = sign(this.xml, {
        privateKey: options.privateKey,
        signatureAlgorithm: options.signatureAlgorithm,
        nodeName: 'AuthnRequest',
      });
    }
    return this;
  }
}
