import express from 'express';
import fs from 'fs-extra';
import Redis from 'ioredis';
import passport from 'passport';
import { SpidStrategy, SpidConfig, SamlSpidProfile, Cache } from '../src';

async function run() {
  const app = express();
  const redis = new Redis('redis://redis');
  const idp = 'https://localhost:8443';
  const idpMetadata = (
    await fs.readFile('./path/to/idp-metadata.xml')
  ).toString();
  const sp = 'http://localhost:4000';
  const privateKey = (await fs.readFile('./path/to/key.pem')).toString();
  const spCert = (await fs.readFile('./path/to/crt.pem')).toString();
  const email = 'asd@example.com';
  // you can use a normal Map (not recommended)
  // const cache = new Map();
  const cachePrefix = 'spid_request_';
  const cache: Cache = {
    get(key: string) {
      return redis.get(cachePrefix + key);
    },
    set(key: string, value: string) {
      return redis.set(cachePrefix + key, value);
    },
    delete(key: string) {
      return redis.del(cachePrefix + key);
    },
    expire(key: string, ms: number) {
      return redis.pexpire(cachePrefix + key, ms);
    },
  };
  const config: SpidConfig = {
    saml: {
      authnRequestBinding: 'HTTP-POST', // or HTTP-Redirect
      attributeConsumingServiceIndex: '0', // index of 'acs' array
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      callbackUrl: `${sp}/login/cb`,
      logoutCallbackUrl: `${sp}/logout/cb`,
      racComparison: 'minimum',
      privateKey,
      audience: sp,
    },
    spid: {
      getIDPEntityIdFromRequest: (req) => idp,
      IDPRegistryMetadata: idpMetadata,
      authnContext: 1, // spid level (1/2/3)
      serviceProvider: {
        type: 'public',
        entityId: sp,
        certificate: spCert,
        acs: [
          {
            name: 'acs0',
            attributes: ['spidCode', 'email', 'fiscalNumber'],
          },
          {
            name: 'acs1',
            attributes: ['email'],
          },
        ],
        organization: {
          it: {
            name: 'example',
            displayName: 'example',
            url: sp,
          },
        },
        contactPerson: {
          IPACode: 'ipacode',
          email,
        },
      },
    },
    cache,
  };
  const verify = (profile, done) => {
    done(null, profile as any);
  };
  const strategy = new SpidStrategy(config, verify, verify);
  const metadata = await strategy.generateSpidServiceProviderMetadata();
  passport.use('spid', strategy);
  const passportOptions = {
    session: false,
  };
  app.use(passport.initialize());
  app.get('/metadata', async (req, res) => {
    res.contentType('text/xml');
    res.send(metadata);
  });
  app.get('/login', passport.authenticate('spid', passportOptions));
  app.post(
    '/login/cb',
    express.urlencoded({ extended: false }),
    passport.authenticate('spid', passportOptions),
    (req, res) => {
      const user = req.user as SamlSpidProfile;
      // you can save request and response
      const samlRequest = user.getSamlRequestXml();
      const samlResponse = user.getSamlResponseXml();
      res.send(user);
    },
  );
  app.listen(4000);
}

run().catch(console.error);
