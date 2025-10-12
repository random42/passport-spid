import { callbackify } from 'node:util';
import {
  AbstractStrategy,
  MultiSamlStrategy,
  type SamlConfig,
} from '@node-saml/passport-saml';
import type {
  AuthenticateOptions,
  RequestWithUser,
} from '@node-saml/passport-saml/lib/types';
import type { Request } from 'express';
import {
  FORCE_AUTHN_LEVELS,
  SPID_FORCED_SAML_CONFIG,
  SPID_LEVELS,
} from './const';
import { getIdentityProviders } from './idp-metadata';
import { SpidSAML } from './saml';
import { SPMetadata } from './sp-metadata';
import type { IDPConfig, SamlSpidProfile, SpidConfig } from './types';

export type VerifiedCallback = (
  err: Error | null,
  user?: Record<string, unknown>,
  info?: Record<string, unknown>,
) => void;

export type VerifyWithRequest = (
  req: Request,
  profile: SamlSpidProfile | null | undefined,
  done: VerifiedCallback,
) => void;

export type VerifyWithoutRequest = (
  profile: SamlSpidProfile | null | undefined,
  done: VerifiedCallback,
) => void;

const cleanPem = (cert: string) =>
  cert
    .replace(/.*BEGIN.*\r?\n?/, '')
    .replace(/.*END.*\r?\n?/, '')
    .replace(/\r?\n/g, '');

export class SpidStrategy extends MultiSamlStrategy {
  private idps!: IDPConfig[];
  private _spidConfig: SpidConfig;

  constructor(
    config: SpidConfig,
    signonVerify: VerifyWithRequest,
    logoutVerify: VerifyWithRequest,
  );
  constructor(
    config: SpidConfig,
    signonVerify: VerifyWithoutRequest,
    logoutVerify: VerifyWithoutRequest,
  );

  constructor(config: SpidConfig, signonVerify, logoutVerify) {
    super(
      {
        getSamlOptions: callbackify((req) => this._getSpidSamlOptions(req)),
      },
      signonVerify,
      logoutVerify,
    );
    config.spid.serviceProvider.certificate = cleanPem(
      config.spid.serviceProvider.certificate,
    );
    this._spidConfig = config;
    this.name = config.name || 'spid';
    this._loadIDPS();
  }

  protected getSpidConfig(): SpidConfig {
    return this._spidConfig;
  }

  authenticate(req: Request, options: AuthenticateOptions): void {
    this._getSpidSamlOptions(req)
      .then((config) => {
        const saml = new SpidSAML(config, this.getSpidConfig());
        const strategy = Object.assign({}, this, { _saml: saml });
        Object.setPrototypeOf(strategy, this);
        return AbstractStrategy.prototype.authenticate.call(
          strategy,
          req as unknown as RequestWithUser,
          options,
        );
      })
      .catch((err) => this.error(err));
  }

  public getIDPS() {
    return this.idps;
  }

  private _loadIDPS() {
    const config: SpidConfig = this.getSpidConfig();
    const xml = config.spid.IDPRegistryMetadata;
    this.idps = getIdentityProviders(
      xml,
      config.saml.authnRequestBinding === 'HTTP-POST',
    );
    if (this.idps.length === 0) {
      throw new Error('No identity provider found');
    }
  }

  async _getSpidSamlOptions(req: Request): Promise<SamlConfig> {
    const config = this.getSpidConfig();
    const { saml, spid } = config;
    const idps = this.idps;
    const { getIDPEntityIdFromRequest } = config.spid;
    const entityId = await getIDPEntityIdFromRequest(req);
    let idp = idps.find((x) => x.entityId === entityId);
    if (!idp && entityId) {
      throw new Error(`Provider '${entityId}' not found`);
    }
    idp ??= idps[0]; // default for metadata generation
    const { authnContext } = config.spid;

    // idpCert is required in node-saml v5
    if (!idp.idpCert) {
      throw new Error(`IDP certificate not found for '${idp.entityId}'`);
    }

    return {
      ...saml,
      additionalParams: saml.additionalParams ?? { RelayState: 'RelayState' },
      authnContext: [SPID_LEVELS[config.spid.authnContext]],
      forceAuthn: FORCE_AUTHN_LEVELS.includes(authnContext),
      issuer: spid.serviceProvider.entityId,
      idpIssuer: idp.entityId,
      entryPoint: idp.entryPoint,
      logoutUrl: idp.logoutUrl,
      idpCert: idp.idpCert,

      skipRequestCompression: saml.authnRequestBinding === 'HTTP-POST',
      ...SPID_FORCED_SAML_CONFIG,
    };
  }

  async generateSpidServiceProviderMetadata() {
    const config = this.getSpidConfig();
    const { certificate } = config.spid.serviceProvider;
    return new Promise<string>((res, rej) => {
      super.generateServiceProviderMetadata(
        {} as any,
        null,
        certificate,
        (err, xml) => {
          if (err) rej(err);
          else if (xml) res(new SPMetadata(xml, config).generate());
          else rej(new Error('Failed to generate SP metadata'));
        },
      );
    });
  }
}
