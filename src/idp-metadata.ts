import { IDPConfig } from './types';
import { parseDom } from './xml';
import { NS } from './const';
import { X509Certificate } from 'crypto';

export const getIdpCert = (idp: Element) => {
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

    const certificateCollection = signingDescriptor?.getElementsByTagNameNS(
      NS.SIG,
      'X509Certificate',
    );

    const certificates = Array.from(certificateCollection || []).map(
      (el) => el.textContent,
    );

    console.log('certificates', certificates);

    cert = certificates.find((certificate) => {
      // Find a not expired X509Certificate
      // Convert from base64 to pem format
      const pemCert = `-----BEGIN CERTIFICATE-----\n${certificate
        .match(/.{1,64}/g)
        .join('\n')}\n-----END CERTIFICATE-----`;

      console.log('pemCert', pemCert);
      try {
        const { validTo } = new X509Certificate(pemCert || '');
        console.log('validTo', new Date(validTo));
        console.log('new Date()', new Date());
        return new Date(validTo) > new Date();
      } catch (e) {
        console.log('e', e);
        return false;
      }
    });
    console.log('cert', cert);

    if (!cert)
      cert = idp
        .getElementsByTagNameNS(NS.SIG, 'X509Certificate')
        .item(0)?.textContent;
  }
  console.log(
    'old cert',
    idp.getElementsByTagNameNS(NS.SIG, 'X509Certificate').item(0)?.textContent,
  );
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
