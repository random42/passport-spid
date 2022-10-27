import { SAML, SamlConfig } from '@node-saml/node-saml';
import { signAuthnRequestPost } from '@node-saml/node-saml/lib/saml-post-signing';
import { SpidRequest } from './request';
import fs from 'fs-extra';
import { SamlSpidProfile, SpidConfig } from './types';
import { SpidResponse } from './response';

export class SpidSAML extends SAML {
  constructor(samlConfig: SamlConfig, private spidConfig: SpidConfig) {
    super(samlConfig);
  }

  protected async generateAuthorizeRequestAsync(
    isPassive: boolean,
    isHttpPostBinding: boolean,
    host: string,
  ): Promise<string> {
    // cannot use super because these are instance functions
    let xml = await super.generateAuthorizeRequestAsync(
      isPassive,
      isHttpPostBinding,
      host,
    );
    const req = new SpidRequest(xml);
    const id = req.id;
    req.generate(this.options);
    if (this.options.authnRequestBinding === 'HTTP-POST') {
      // re-sign request
      req.load(signAuthnRequestPost(req.xml(), this.options as any));
      // req.renameNamespace('', 'ds', 'samlp:AuthnRequest.Signature');
      // fs.writeJSONSync('./var/req.json', req.get(), { spaces: 2 });
    }
    xml = req.xml();
    fs.writeFileSync('./var/req.xml', xml);
    const { cache } = this.spidConfig;
    await cache.set(id, xml);
    const timeoutMs =
      this.options.requestIdExpirationPeriodMs ?? 1000 * 60 * 60 * 15;
    if (cache.expire) {
      await cache.expire(id, timeoutMs);
    } else {
      setTimeout(() => {
        cache.delete(id);
      }, timeoutMs);
    }
    return xml;
  }

  protected async processValidlySignedAssertionAsync(
    xml: string,
    samlResponseXml: string,
    inResponseTo: string,
  ): Promise<{ profile: SamlSpidProfile; loggedOut: boolean }> {
    if (!inResponseTo) {
      throw new Error(`Missing InResponseTo`);
    }
    const { cache } = this.spidConfig;
    const reqXml = await cache.get(inResponseTo);
    if (!reqXml) {
      throw new Error(`Missing request for ${inResponseTo} response`);
    }
    const req = new SpidRequest(reqXml);
    const res = new SpidResponse(samlResponseXml);
    await cache.delete(inResponseTo);
    const { profile, loggedOut } =
      await super.processValidlySignedAssertionAsync(
        xml,
        samlResponseXml,
        inResponseTo,
      );
    res.validate(req, this.spidConfig, this.options);
    const p = profile as SamlSpidProfile;
    p.getSamlRequestXml = () => reqXml;
    return { profile: p, loggedOut };
  }
}
