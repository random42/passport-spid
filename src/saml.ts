import { SAML, SamlConfig } from '@node-saml/node-saml';
import { SpidRequest } from './request';
import { SamlSpidProfile, SpidConfig } from './types';

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
    const xml = await super.generateAuthorizeRequestAsync(
      isPassive,
      isHttpPostBinding,
      host,
    );
    const req = new SpidRequest(xml);
    const id = req.getId();
    const final = req.build(this.spidConfig);
    const { cache } = this.spidConfig;
    await cache.set(id, final);
    const timeoutMs =
      this.options.requestIdExpirationPeriodMs ?? 1000 * 60 * 60 * 15;
    if (cache.expire) {
      await cache.expire(id, timeoutMs);
    } else {
      setTimeout(() => {
        cache.delete(id);
      }, timeoutMs);
    }
    return final;
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
    await cache.delete(inResponseTo);
    const { profile, loggedOut } =
      await super.processValidlySignedAssertionAsync(
        xml,
        samlResponseXml,
        inResponseTo,
      );
    const p = profile as SamlSpidProfile;
    p.getSamlRequestXml = () => reqXml;
    return { profile: p, loggedOut };
  }
}
