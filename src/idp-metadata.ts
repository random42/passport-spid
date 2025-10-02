import { IDPConfig } from './types';
import { parseDom } from './xml';
import { NS } from './const';
import { X509Certificate } from 'crypto';

export const getIdpCert = (idp: any) => {
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
    const certificates = signingDescriptor
      ?.getElementsByTagNameNS(NS.SIG, 'X509Certificate')
      .map((x) => x.textContent);

    cert = certificates.find((certificate) => {
      // Find a not expired X509Certificate
      const { validTo } = new X509Certificate(certificate || '');
      return new Date(validTo) > new Date();
    });
  }
  return cert;
};

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

    // Find a not expired X509Certificate in a keyDescriptor use="signing"

    return {
      entityId: idp.getAttribute('entityID'),
      cert: getIdpCert(idp),
      entryPoint: getLocation('SingleSignOnService'),
      logoutUrl: getLocation('SingleLogoutService'),
    };
  });
};
