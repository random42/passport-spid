import { SAML, type SamlConfig } from '@node-saml/node-saml';
import { SpidRequest } from './request';
import { SpidResponse } from './response';
// import { signAuthnRequestPost } from '@node-saml/node-saml/lib/saml-post-signing';
import { signAuthRequest } from './signAuthRequest';
import type { SamlSpidProfile, SpidConfig } from './types';

type CacheData = {
  reqXml: string;
  idpIssuer: string | undefined;
};

export class SpidSAML extends SAML {
  constructor(
    samlConfig: SamlConfig,
    private spidConfig: SpidConfig,
  ) {
    super(samlConfig);
  }

  protected async generateAuthorizeRequestAsync(
    isPassive: boolean,
    isHttpPostBinding: boolean,
  ): Promise<string> {
    // cannot use super because these are instance functions
    let xml = await super.generateAuthorizeRequestAsync(
      isPassive,
      isHttpPostBinding,
    );
    const req = new SpidRequest(xml);
    const id = req.id;

    xml = req.generate(this.options).xml();
    if (this.options.authnRequestBinding === 'HTTP-POST') {
      // re-sign request
      //xml = signAuthnRequestPost(xml, this.options as any);

      const { spid, saml } = this.spidConfig;
      const { privateKey, signatureAlgorithm } = saml;
      const cert = spid.serviceProvider.certificate;
      xml = signAuthRequest(xml, {
        signatureAlgorithm: signatureAlgorithm,
        privateKey,
        certificate: cert,
        action: 'after',
        nodeName: 'AuthnRequest',
      });
    }
    const { cache } = this.spidConfig;
    const cacheData: CacheData = {
      reqXml: xml,
      idpIssuer: this.options.idpIssuer,
    };
    await cache.set(id, JSON.stringify(cacheData));
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
    const cacheDataJSON = await cache.get(inResponseTo);
    if (!cacheDataJSON) {
      throw new Error(
        `No cached request found for InResponseTo: ${inResponseTo}`,
      );
    }
    const cacheData = JSON.parse(cacheDataJSON) as CacheData;
    const { reqXml } = cacheData;
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
    const idpIssuer = cacheData.idpIssuer;
    if (!idpIssuer) {
      throw new Error('Missing idpIssuer in cached request data');
    }
    res.validate(req, this.spidConfig, this.options, idpIssuer);
    const p = profile as SamlSpidProfile;
    p.getSamlRequestXml = () => reqXml;
    return { profile: p, loggedOut };
  }
}
