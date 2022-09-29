import express from 'express';
import { promises as fs } from 'fs';
import Redis from 'ioredis';
import passport from 'passport';
import { SpidStrategy, SpidConfig } from '../src';

async function run() {
  const redis = new Redis();
  // const fn = process.argv[2];
  // const idp = (await fs.readFile(fn)).toString();
  const idpMetadata = (
    await fs.readFile('./var/idp.xml')
  ).toString();
  const sp = 'http://localhost:4000';
  const idp = 'https://localhost:8443/demo';
  const privateKey = await fs.readFile('./var/keys/key.pem');
  const spCert = (await fs.readFile('./var/keys/crt.pem')).toString();
  const email = 'asd@example.com';
  // you can use a normal Map (not recommended)
  // const cache = new Map();
  const cachePrefix = 'spid_request_'
  const cache: SpidConfig['cache'] = {
    get(key: string) {
      return redis.get(cachePrefix + key)
    },
    set(key: string, value: string) {
      return redis.set(cachePrefix + key, value)
    },
    delete(key: string) {
      return redis.del(cachePrefix + key)
    },
    expire(key: string, ms: number) {
      return redis.pexpire(cachePrefix + key, ms);
    },
  }
  const config: SpidConfig = {
    saml: {
      attributeConsumingServiceIndex: '0',
      signatureAlgorithm: 'sha256',
      callbackUrl: `${sp}/login/cb`,
      // logoutCallbackUrl: `${sp}/logout/cb`,
      authnContext: ['SpidL1'],
      racComparison: 'minimum',
      privateKey,
      requestIdExpirationPeriodMs: 30000,
    },
    spid: {
      getIDPEntityIdFromRequest: (req) => idp,
      getIDPRegistryMetadata: () => idpMetadata,
      serviceProvider: {
        type: 'public',
        entityId: sp,
        publicCert: spCert,
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
  await strategy.init();
  passport.use('spid', strategy);
  const app = express();
  app.use(express.json(), (req, res, next) => {
    console.error(JSON.stringify({
      path: req.path,
      query: req.query,
    }));
    next()
  }, passport.initialize());
  app.get('/', (req, res) => res.sendStatus(200));
  app.get('/failure', (req, res) => res.send('failure'));
  app.get('/metadata', async (req, res) => {
    const metadata = await strategy.generateSpidServiceProviderMetadata();
    res.contentType('text/xml');
    res.send(metadata);
  });
  const po = {
    failureRedirect: '/failure',
    session: false,
  };
  app.get('/login', passport.authenticate('spid', po));
  app.post(
    '/login/cb',
    express.urlencoded({ extended: false }),
    passport.authenticate('spid', po),
    (req, res) => {
      res.send(req.user);
    },
  );
  app.use((err, req, res, next) => {
    console.error(err);
    res.sendStatus(500);
  });
  app.listen(4000, () => {
    console.log(sp);
    console.log('http://host.docker.internal:4000/')
  });
}

run();
