import express from 'express';
import fs from 'fs-extra';
import passport from 'passport';
import {
  SpidStrategy,
  SpidConfig,
  SamlSpidProfile,
  SignatureAlgorithm,
  SpidSamlConfig,
  DigestAlgorithm,
} from '../src';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const {
  IDP,
  SP,
  IDP_METADATA_FILE,
  PRIVATE_KEY_FILE,
  CERTIFICATE_FILE,
  BINDING,
  SIG_ALG,
} = process.env;

async function run() {
  const app = express();
  const idpMetadata = (await fs.readFile(IDP_METADATA_FILE)).toString();
  const privateKey = (await fs.readFile(PRIVATE_KEY_FILE)).toString();
  const spCert = (await fs.readFile(CERTIFICATE_FILE)).toString();
  const email = 'asd@example.com';
  const config: SpidConfig = {
    saml: {
      authnRequestBinding: BINDING as SpidSamlConfig['authnRequestBinding'],
      attributeConsumingServiceIndex: '0', // index of 'acs' array
      signatureAlgorithm: SIG_ALG as SignatureAlgorithm,
      digestAlgorithm: SIG_ALG as DigestAlgorithm,
      callbackUrl: `${SP}/login/cb`,
      logoutCallbackUrl: `${SP}/logout/cb`,
      authnContext: ['SpidL1'],
      racComparison: 'minimum',
      privateKey,
      audience: SP,
    },
    spid: {
      getIDPEntityIdFromRequest: () => IDP,
      IDPRegistryMetadata: idpMetadata,
      serviceProvider: {
        type: 'public',
        entityId: SP,
        publicCert: spCert,
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
            url: SP,
          },
        },
        contactPerson: {
          IPACode: 'ipacode',
          email,
        },
      },
    },
    cache: new Map(),
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
  app.use(
    express.json(),
    (req, res, next) => {
      console.error(
        JSON.stringify({
          path: req.path,
          query: req.query,
        }),
      );
      next();
    },
    passport.initialize(),
  );
  app.get('/', (req, res) => res.sendStatus(200));
  app.get('/metadata', async (req, res) => {
    // you should cache this
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
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err?.message);
  });
  app.listen(4000, () => {
    console.log(SP);
    console.log(IDP);
    console.log('http://server:4000/');
  });
}

run().catch(console.error);
