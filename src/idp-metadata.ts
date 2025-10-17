import assert from 'node:assert';
import { X509Certificate } from 'node:crypto';
import { NS } from './const';
import type { IDPConfig } from './types';
import { parseDom } from './xml';

// Gets first (valid if possible) signing certificate
const getIdpCertificate = (idp: Element): string | null => {
  const idpDescriptor = Array.from(
    idp.getElementsByTagNameNS(NS.SAML_METADATA, 'IDPSSODescriptor'),
  )[0];

  if (!idpDescriptor) return null;

  const keyDescriptors = Array.from(
    idpDescriptor.getElementsByTagNameNS(NS.SAML_METADATA, 'KeyDescriptor'),
  );
  // Look for KeyDescriptor with use="signing" or without use attribute (means both)
  const signingDescriptorCollection = keyDescriptors.filter(
    (kd) => kd.getAttribute('use') === 'signing' || !kd.getAttribute('use'),
  );

  const certificates: string[] = [];

  Array.from(signingDescriptorCollection).forEach((kd) => {
    const certificateCollection = kd.getElementsByTagNameNS(
      NS.SIG,
      'X509Certificate',
    );
    Array.from(certificateCollection || []).forEach((el) => {
      const textContent = el.textContent;
      if (textContent) {
        const sanitized = textContent.replace(/\s+/g, '');
        if (sanitized) certificates.push(sanitized);
      }
    });
  });

  const now = new Date();
  const validCert = certificates.find((certificate) => {
    const pemBody = certificate.match(/.{1,64}/g)?.join('\n') ?? certificate;
    const pemCert = `-----BEGIN CERTIFICATE-----\n${pemBody}\n-----END CERTIFICATE-----`;

    try {
      const parsed = new X509Certificate(pemCert);
      const notBefore = new Date(parsed.validFrom);
      const notAfter = new Date(parsed.validTo);
      return notBefore <= now && now <= notAfter;
    } catch {
      return false;
    }
  });

  return validCert ?? certificates[0] ?? null;
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

  return idps.map((idp): IDPConfig => {
    const getLocation = (tag: string) =>
      Array.from(idp.getElementsByTagNameNS(NS.SAML_METADATA, tag))
        .find((x) => x.getAttribute('Binding') === binding)
        ?.getAttribute('Location');

    const idpCert = getIdpCertificate(idp);
    const entityId = idp.getAttribute('entityID');
    const entryPoint = getLocation('SingleSignOnService');
    const logoutUrl = getLocation('SingleLogoutService');

    assert(entityId, 'IDP metadata entry missing entityID');
    assert(idpCert, `IDP metadata for ${entityId} missing X509Certificate`);
    assert(
      entryPoint,
      `IDP metadata for ${entityId} missing SingleSignOnService with binding ${binding}`,
    );
    assert(
      logoutUrl,
      `IDP metadata for ${entityId} missing SingleLogoutService with binding ${binding}`,
    );

    return {
      entityId,
      idpCert,
      entryPoint,
      logoutUrl,
    };
  });
};
