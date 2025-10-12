import { SignedXml } from 'xml-crypto';

const authnRequestXPath =
  '/*[local-name(.)="AuthnRequest" and namespace-uri(.)="urn:oasis:names:tc:SAML:2.0:protocol"]';
const issuerXPath =
  '/*[local-name(.)="Issuer" and namespace-uri(.)="urn:oasis:names:tc:SAML:2.0:assertion"]';

export const signAuthRequest = (
  xml: string,
  options: {
    privateKey: string | Buffer;
    signatureAlgorithm: string;
    nodeName: string;
    certificate?: string;
    action?: 'prepend' | 'append' | 'after';
  },
) => {
  const {
    privateKey,
    signatureAlgorithm,
    nodeName,
    certificate,
    action = 'after',
  } = options;
  const sig = new SignedXml({
    privateKey,
    publicCert: certificate,
    signatureAlgorithm: `http://www.w3.org/2001/04/xmldsig-more#rsa-${signatureAlgorithm}`,
  });

  if (certificate) {
    sig.getKeyInfoContent = () =>
      `<X509Data><X509Certificate>${certificate}</X509Certificate></X509Data>`;
  }

  sig.addReference({
    xpath: `//*[local-name(.)='${nodeName}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: `http://www.w3.org/2001/04/xmlenc#${signatureAlgorithm}`,
  });
  sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
  sig.computeSignature(xml, {
    location: { reference: authnRequestXPath + issuerXPath, action },
  });
  return sig.getSignedXml();
};
