import { load } from 'cheerio';
import { IDPConfig } from './types';
import * as XML from './xml';

const { e, attributes: attr, text } = XML;
const ENTITY_DESCRIPTOR = 'md:EntityDescriptor';

export class IDPMetadata extends XML.XMLCheerio {
  getEntities() {
    return this.$(`${e(ENTITY_DESCRIPTOR)}`);
  }

  getEntity(id: string) {
    return this.$(`${e(ENTITY_DESCRIPTOR)}[${e('entityID')}=${e(id)}]`);
  }

  getEntitiesConfig(httpPost?: boolean): IDPConfig[] {
    return this.getEntities()
      .map(function () {
        const $ = load(this, { xml: true });
        const binding =
          'urn:oasis:names:tc:SAML:2.0:bindings:' +
          (httpPost ? 'HTTP-POST' : 'HTTP-Redirect');
        const cert = $(e('md:IDPSSODescriptor'))
          .find(e('ds:X509Certificate'))
          .map(function () {
            return load(this).text();
          })
          .toArray();
        return {
          entityId: $(e(ENTITY_DESCRIPTOR)).attr('entityID'),
          cert: cert,
          entryPoint: $(
            `${e('md:SingleSignOnService')}[Binding=${e(binding)}]`,
          ).attr('Location'),
          logoutUrl: $(
            `${e('md:SingleLogoutService')}[Binding=${e(binding)}]`,
          ).attr('Location'),
        };
      })
      .toArray();
  }
}
