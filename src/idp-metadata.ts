import fs from 'fs';
import { IDPConfig } from './types';
import get from 'lodash.get';
import { parse } from './xml';

export const getIdentityProviders = (
  xml: string,
  httpPost: boolean,
): IDPConfig[] => {
  const x = parse(xml);
  const binding =
    'urn:oasis:names:tc:SAML:2.0:bindings:' +
    (httpPost ? 'HTTP-POST' : 'HTTP-Redirect');
  const idps = x['md:EntitiesDescriptor']
    ? x['md:EntitiesDescriptor']?.['md:EntityDescriptor']
    : [x['md:EntityDescriptor']];
  return idps.map((idp = {}): IDPConfig => {
    const findBinding = (s) => get(s, '@.Binding') === binding;
    const login = get(idp, 'md:IDPSSODescriptor.md:SingleSignOnService').find(
      findBinding,
    );
    const logout = get(idp, 'md:IDPSSODescriptor.md:SingleLogoutService').find(
      findBinding,
    );
    let keys: any[] = get(idp, 'md:IDPSSODescriptor.md:KeyDescriptor');
    keys = Array.isArray(keys) ? keys : [keys];
    return {
      entityId: get(idp, '@.entityID'),
      cert: keys.map((k) =>
        get(k, 'ds:KeyInfo.ds:X509Data.ds:X509Certificate'),
      ),
      entryPoint: get(login, '@.Location'),
      logoutUrl: get(logout, '@.Location'),
    };
  });
};
