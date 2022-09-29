import {
  AbstractStrategy,
  MultiSamlStrategy,
  SamlConfig,
  Strategy,
} from '@node-saml/passport-saml';
import { Request } from 'express';
import { callbackify } from 'util';
import { IDPMetadata } from './idp-metadata';
import { SPMetadata } from './sp-metadata';
import {
  IDPConfig,
  SamlSpidProfile,
  SpidConfig,
  SpidLevel,
  SpidProfile,
} from './types';
import {
  SPID_LEVELS,
  SPID_FORCED_SAML_CONFIG,
  FORCE_AUTHN_LEVELS,
} from './const';
import {
  AuthenticateOptions,
  RequestWithUser,
} from '@node-saml/passport-saml/lib/types';
import { SpidSAML } from './saml';

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
  private _spidIDPSConfig: IDPConfig[];
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
    this._spidConfig = config;
    this.name = config.name || 'spid';
  }

  protected getSpidConfig(): SpidConfig {
    return this._spidConfig;
  }

  async init() {
    await this._loadIDPSConfig();
  }

  authenticate(req: RequestWithUser, options: AuthenticateOptions): void {
    this._getSpidSamlOptions(req)
      .then((config) => {
        const saml = new SpidSAML(config, this.getSpidConfig());
        const strategy = Object.assign({}, this, { _saml: saml });
        Object.setPrototypeOf(strategy, this);
        return AbstractStrategy.prototype.authenticate.call(
          strategy,
          req,
          options,
        );
      })
      .catch((err) => this.error(err));
  }

  public getIDPSConfig() {
    return this._spidIDPSConfig;
  }

  private async _loadIDPSConfig() {
    const config: SpidConfig = this.getSpidConfig();
    const xml = await config.spid.getIDPRegistryMetadata();
    const meta = new IDPMetadata(xml);
    this._spidIDPSConfig = meta.getEntitiesConfig();
    if (this._spidIDPSConfig.length === 0) {
      throw new Error('No identity provider found');
    }
  }

  async _getSpidSamlOptions(req: Request): Promise<SamlConfig> {
    const config = this.getSpidConfig();
    const { saml, spid } = config;
    const idps = this.getIDPSConfig();
    const { getIDPEntityIdFromRequest } = config.spid;
    const entityId = await getIDPEntityIdFromRequest(req);
    let idp = idps.find((x) => x.entityId === entityId);
    if (!idp && entityId) {
      throw new Error(`Provider '${entityId}' not found`);
    }
    idp ??= idps[0]; // default for metadata generation
    const authnContext = saml.authnContext.map((s) => SPID_LEVELS[s]);
    return Object.assign(
      {},
      saml,
      {
        additionalParams: {
          RelayState: 'RelayState',
        },
        authnContext,
        forceAuthn: saml.authnContext.some((c) =>
          FORCE_AUTHN_LEVELS.includes(c),
        ),
        passReqToCallback: config.passReqToCallback,
        issuer: spid.serviceProvider.entityId,
        idpIssuer: idp.entityId,
        entryPoint: idp.entryPoint,
        logoutUrl: idp.logoutUrl,
        cert: idp.cert,
      },
      SPID_FORCED_SAML_CONFIG,
    );
  }

  async generateSpidServiceProviderMetadata() {
    const config = this.getSpidConfig();
    return new Promise((res, rej) => {
      super.generateServiceProviderMetadata(
        {} as any,
        null,
        cleanPem(config.spid.serviceProvider.publicCert),
        (err, xml) => {
          if (err) rej(err);
          else
            new SPMetadata(xml, config)
              .build()
              .then((result) => res(result))
              .catch((err) => rej(err));
        },
      );
    });
  }
}
