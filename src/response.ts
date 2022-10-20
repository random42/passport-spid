import dayjs from 'dayjs';
import assert from 'assert';
import { SpidConfig } from './types';
import * as XML from './xml';
import { SpidRequest } from './request';
import { SPID_FORCED_SAML_CONFIG } from './const';
import { SamlOptions } from '@node-saml/node-saml/lib';

const { e, attributes: attr, text } = XML;

export class SpidResponse extends XML.XMLCheerio {
  constructor(xml: string) {
    super(xml);
  }

  validate(req: SpidRequest, config: SpidConfig, saml: SamlOptions) {
    const isDate = (x) => !isNaN(Date.parse(x));
    const log = (x) => {
      console.log(x);
      return x;
    };
    const res = {
      id: this.getId(),
      destination: this.response.attr('Destination'),
      issuerFormat: this.issuer.attr('Format'),
      version: this.response.attr('Version'),
      issueInstant: this.response.attr('IssueInstant'),
      statusCode: this.getStatusCode(),
      issuer: this.getIssuer(),
      assertion: {
        version: this.assertion.attr('Version'),
        issuer: this.$(e('saml:Issuer')).last().text(),
        issueInstant: this.assertion.attr('IssueInstant'),
      },
    };
    // ID
    assert(res.id, `Missing ID`);
    // Version
    assert(res.version === '2.0', `Invalid  SAML version`);
    assert(
      isDate(res.issueInstant) &&
        isDate(res.assertion.issueInstant) &&
        res.issueInstant === res.assertion.issueInstant &&
        dayjs(res.issueInstant).isAfter(req.getIssueInstant()) &&
        dayjs(res.issueInstant).isBefore(
          req.getIssueInstant().valueOf() +
            SPID_FORCED_SAML_CONFIG.requestIdExpirationPeriodMs,
        ),
      `Invalid IssueInstant ${res.issueInstant}`,
    );
    // Destination
    assert.equal(
      res.destination,
      config.saml.callbackUrl,
      `Invalid Destination ${res.destination}`,
    );
    // StatusCode
    assert.equal(
      res.statusCode,
      'urn:oasis:names:tc:SAML:2.0:status:Success',
      `Invalid StatusCode`,
    );
    // Issuer
    console.log(this.$(e('saml:Issuer')).text());
    assert(this.$(e('saml:Issuer')).length === 2, 'Invalid Issuer');
    assert.equal(res.issuer, saml.idpIssuer, `Invalid Issuer`);
    assert.equal(res.assertion.issuer, saml.idpIssuer, `Invalid Issuer`);
    assert.equal(
      res.issuerFormat,
      'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
    );
    assert.equal(res.assertion.version, '2.0', `Invalid Assertion Version`);
    // TODO 37
  }

  get response() {
    return this.$(e('samlp:Response'));
  }

  get assertion() {
    return this.$(e('saml:Assertion'));
  }

  private get issuer() {
    return this.$(e('saml:Issuer')).first();
  }

  getId(): string {
    return this.response.attr('ID');
  }

  getStatusCode() {
    return this.$(e('samlp:StatusCode')).attr('Value');
  }

  getInResponseTo(): string {
    return this.response.attr('InResponseTo');
  }

  getIssueInstant(): Date {
    return new Date(this.response.attr('IssueInstant'));
  }

  getIssuer(): string {
    return this.$(e('saml:Issuer')).first().text();
  }
}
