import { IDPConfig } from './types';
import { parseDom } from './xml';
import { NS } from './const';

export const getIdentityProviders = (
  xml: string,
  httpPost: boolean,
): IDPConfig[] => {
  const dom = parseDom(xml);
  const idps = Array.from(
    dom.getElementsByTagNameNS(NS.SAML_METADATA, 'EntityDescriptor'),
  );
  const binding =
    'urn:oasis:names:tc:SAML:2.0:bindings:' +
    (httpPost ? 'HTTP-POST' : 'HTTP-Redirect');

  return idps.map((idp) => {
    const getLocation = (tag: string) =>
      Array.from(idp.getElementsByTagNameNS(NS.SAML_METADATA, tag))
        .find((x) => x.getAttribute('Binding') === binding)
        ?.getAttribute('Location');

    // Get certificate from IDPSSODescriptor > KeyDescriptor with use="signing"
    // According to SAML2 spec, the signing certificate should be in KeyDescriptor[use="signing"]
    // within IDPSSODescriptor, not from the metadata signature
    const idpDescriptor = Array.from(
      idp.getElementsByTagNameNS(NS.SAML_METADATA, 'IDPSSODescriptor'),
    )[0];

    let cert: string | null | undefined;
    if (idpDescriptor) {
      const keyDescriptors = Array.from(
        idpDescriptor.getElementsByTagNameNS(NS.SAML_METADATA, 'KeyDescriptor'),
      );
      // Look for KeyDescriptor with use="signing" or without use attribute (means both)
      const signingDescriptor = keyDescriptors.find(
        (kd) => kd.getAttribute('use') === 'signing' || !kd.getAttribute('use'),
      );
      cert = signingDescriptor
        ?.getElementsByTagNameNS(NS.SIG, 'X509Certificate')
        .item(0)?.textContent;
    }

    return {
      entityId: idp.getAttribute('entityID'),
      cert,
      entryPoint: getLocation('SingleSignOnService'),
      logoutUrl: getLocation('SingleLogoutService'),
    };
  });
};
