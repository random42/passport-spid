# passport-spid

[![npm package][npm-img]][npm-url]
[![Downloads][downloads-img]][downloads-url]

> A passport strategy for [SPID](https://developers.italia.it/it/spid/), an extension of the SAML2 protocol.

## Features

- Passport strategy only
- Built on the latest versions of [node-saml](https://github.com/node-saml/node-saml) and [passport-saml](https://github.com/node-saml/passport-saml)
- Full typings for the SPID metadata specs
- Custom SAML options, if SPID compliant
- Custom request cache
- Custom function to get Identity Providers' registry XML

## Install

```bash
npm i passport-spid
```

## Usage

```typescript
import express from 'express';
import { promises as fs } from 'fs';
import Redis from 'ioredis';
import passport from 'passport';
import { SpidStrategy, SpidConfig, Cache, SamlSpidProfile } from 'passport-spid';

async function run() {
  const redis = new Redis();
  const idpMetadata = (await fs.readFile('./var/idp.xml')).toString();
  const sp = 'http://localhost:4000';
  const idp = 'https://localhost:8443/demo';
  const privateKey = (await fs.readFile('./var/keys/key.pem')).toString();
  const spCert = (await fs.readFile('./var/keys/crt.pem')).toString();
  const email = 'asd@example.com';
  // you can use a normal Map (not recommended for scaling applications)
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
      attributeConsumingServiceIndex: '0', // index of 'acs' array
      signatureAlgorithm: 'sha256',
      callbackUrl: `${sp}/login/cb`,
      logoutCallbackUrl: `${sp}/logout/cb`,
      authnContext: ['SpidL1'],
      racComparison: 'minimum',
      privateKey,
      requestIdExpirationPeriodMs: 30000,
    },
    spid: {
      getIDPEntityIdFromRequest: (req) => idp, // maybe req.query.entityId in production
      getIDPRegistryMetadata: () => idpMetadata, // get identity providers registry metadata xml however you like
      serviceProvider: {
        type: 'public',
        entityId: sp,
        certificate: spCert,
        acs: [
          {
            name: 'acs0',
            attributes: ['spidCode'],
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
  // initialize to get identity providers from xml
  await strategy.init();
  passport.use('spid', strategy);
  const passportOptions = {
    session: false,
  };
  const app = express();
  app.use(
    express.json(),
    passport.initialize(),
  );
  app.get('/metadata', async (req, res) => {
    // you should cache this
    const metadata = await strategy.generateSpidServiceProviderMetadata();
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
      // user.getSamlRequestXml();
      // user.getSamlResponseXml();
      res.send(user);
    },
  );
}
```

## Development setup

Prerequisites:

- Docker and docker-compose

```sh
# make scripts executable
chmod -R u+x scripts
# generate key and certificate
scripts/keygen.sh var/keys \
  --key-size 3072 \
  --common-name "example" \
  --days 365 \
  --entity-id http://localhost:4000 \
  --locality-name Roma \
  --org-id "PA:IT-c_h501" \
  --org-name "example" \
  --sector public
# start docker compose
docker-compose up
# open localhost:4000/login
```

[downloads-img]:https://img.shields.io/npm/dt/passport-spid
[downloads-url]:https://www.npmtrends.com/passport-spid
[npm-img]:https://img.shields.io/npm/v/passport-spid
[npm-url]:https://www.npmjs.com/package/passport-spid
