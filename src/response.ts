import dayjs from 'dayjs';
import assert from 'assert';
import { SpidConfig } from './types';
import * as XML from './xml';
import { SpidRequest } from './request';
import {
  IDENTIFIER_FORMAT,
  ISSUER_FORMAT,
  NS,
  SPID_LEVELS,
  SUBJECT_CONFIRMATION_METHOD,
} from './const';
import { SamlOptions } from '@node-saml/node-saml/lib';
import difference from 'lodash.difference';

export class SpidResponse extends XML.XML {
  validate(req: SpidRequest, config: SpidConfig, saml: SamlOptions) {
    const isISODate = (s: string): boolean => {
      const n = Date.parse(s);
      if (isNaN(n)) return false;
      else {
        const iso = new Date(n).toISOString();
        return s === iso || s === iso.replace(/\.\d\d\dZ$/, 'Z');
      }
    };
    assert(this.response, `Missing response`);
    assert(this.assertion, `Missing assertion`);
    const { SAML_ASSERTION: A, SAML_PROTOCOL: P } = NS;
    console.log(this.getElements('Issuer', A).length);
    const responseIssuer = this.getElements('Issuer', A).find(
      (x) => (x.parentNode as Element).localName === 'Response',
    );
    const assIssuer = this.getElements('Issuer', A).find(
      (x) => (x.parentNode as Element).localName === 'Assertion',
    );
    assert(responseIssuer && assIssuer, `Missing issuer`);
    const data = {
      id: this.id,
      destination: this.response.getAttribute('Destination'),
      issuerFormat: responseIssuer.getAttribute('Format'),
      version: this.response.getAttribute('Version'),
      issueInstant: this.response.getAttribute('IssueInstant'),
      statusCode: this.statusCode,
      issuer: this.issuer,
      subject: {
        nameId: this.getElement('NameID', A)?.textContent,
        nameIdFormat: this.getElement('NameID', A)?.getAttribute('Format'),
        nameIdQualifier: this.getElement('NameID', A)?.getAttribute(
          'NameQualifier',
        ),
        confirmation: {
          method: this.getElement('SubjectConfirmation', A)?.getAttribute(
            'Method',
          ),
          data: {
            recipient: this.getElement(
              'SubjectConfirmationData',
              A,
            )?.getAttribute('Recipient'),
            inResponseTo: this.getElement(
              'SubjectConfirmationData',
              A,
            )?.getAttribute('InResponseTo'),
            notOnOrAfter: this.getElement(
              'SubjectConfirmationData',
              A,
            )?.getAttribute('NotOnOrAfter'),
            notBefore: this.getElement(
              'SubjectConfirmationData',
              A,
            )?.getAttribute('NotBefore'),
          },
        },
      },
      assertion: {
        version: this.assertion.getAttribute('Version'),
        issueInstant: this.assertion.getAttribute('IssueInstant'),
        issuer: assIssuer.textContent,
        issuerFormat: assIssuer.getAttribute('Format'),
        conditions: {
          notBefore: this.getElement('Conditions', A)?.getAttribute(
            'NotBefore',
          ),
          notOnOrAfter: this.getElement('Conditions', A)?.getAttribute(
            'NotOnOrAfter',
          ),
        },
        authnContext: this.getElement('AuthnContextClassRef', A)?.textContent,
        attributes: this.getElements('AttributeValue', A).map((x) => ({
          name: (x.parentNode as Element)?.getAttribute('Name'),
          value: x.textContent,
          nameFormat: (x.parentNode as Element)?.getAttribute('NameFormat'),
        })),
      },
    };

    // ID
    assert(data.id, `Missing ID`);
    // Version
    assert.equal(
      data.version,
      '2.0',
      `Invalid  SAML version "${data.version}"`,
    );
    // IssueInstant
    assert(
      isISODate(data.issueInstant) &&
        isISODate(data.assertion.issueInstant) &&
        data.issueInstant === data.assertion.issueInstant &&
        dayjs(data.issueInstant).isAfter(req.issueInstant) &&
        dayjs(data.issueInstant).isBefore(
          req.issueInstant.valueOf() + saml.requestIdExpirationPeriodMs,
        ),
      `Invalid IssueInstant "${data.issueInstant}"`,
    );
    // Destination
    assert.equal(
      data.destination,
      config.saml.callbackUrl,
      `Invalid Destination "${data.destination}"`,
    );
    // StatusCode
    assert.equal(
      data.statusCode,
      'urn:oasis:names:tc:SAML:2.0:status:Success',
      `Invalid StatusCode "${data.statusCode}"`,
    );
    // Issuer
    assert.equal(
      data.issuer,
      saml.idpIssuer,
      `Invalid Issuer "${data.issuer}"`,
    );
    assert.equal(
      data.assertion.issuer,
      saml.idpIssuer,
      `Invalid Assertion Issuer "${data.assertion.issuer}"`,
    );
    assert.equal(
      data.issuerFormat,
      ISSUER_FORMAT,
      `Invalid Issuer Format "${data.issuerFormat}"`,
    );
    assert.equal(
      data.assertion.issuerFormat,
      ISSUER_FORMAT,
      `Invalid Issuer Format "${data.assertion.issuerFormat}"`,
    );
    assert.equal(
      data.assertion.version,
      '2.0',
      `Invalid Assertion Version "${data.assertion.version}"`,
    );
    // Subject
    assert(data.subject.nameId, `Invalid NameID "${data.subject.nameId}"`);
    assert.equal(
      data.subject.nameIdFormat,
      IDENTIFIER_FORMAT,
      `Invalid NameID Format "${data.subject.nameIdFormat}"`,
    );
    assert.equal(
      data.subject.nameIdQualifier,
      saml.idpIssuer,
      `Invalid NameQualifier "${data.subject.nameIdQualifier}"`,
    );
    // SubjectConfirmation
    assert.equal(
      data.subject.confirmation.method,
      SUBJECT_CONFIRMATION_METHOD,
      `Invalid SubjectConfirmation`,
    );
    assert.equal(
      data.subject.confirmation.data.inResponseTo,
      req.id,
      `Invalid SubjectConfirmation`,
    );
    assert.equal(
      data.subject.confirmation.data.recipient,
      req
        .getElement('AuthnRequest', P)
        .getAttribute('AssertionConsumerServiceURL'),
      `Invalid SubjectConfirmation`,
    );
    assert(
      isISODate(data.subject.confirmation.data.notOnOrAfter),
      `Invalid SubjectConfirmation`,
    );
    assert(
      dayjs(data.subject.confirmation.data.notOnOrAfter).isAfter(
        data.issueInstant,
      ),
      `Invalid SubjectConfirmation`,
    );
    // Conditions
    assert(
      isISODate(data.assertion.conditions.notBefore),
      `Invalid Conditions`,
    );
    assert(
      !dayjs(data.assertion.conditions.notBefore).isAfter(data.issueInstant),
      `Invalid Conditions`,
    );
    assert(
      isISODate(data.assertion.conditions.notOnOrAfter),
      `Invalid Conditions`,
    );
    assert(
      dayjs(data.assertion.conditions.notOnOrAfter).isAfter(data.issueInstant),
      `Invalid Conditions`,
    );
    // AuthnStatement
    const LEVELS = Object.values(SPID_LEVELS);
    assert(
      LEVELS.includes(data.assertion.authnContext as any),
      `Invalid AuthnContext "${data.assertion.authnContext}"`,
    );
    // AttributeStatement
    const serviceIndex = parseInt(
      req
        .getElement('AuthnRequest', P)
        .getAttribute('AttributeConsumingServiceIndex'),
    );
    assert(!isNaN(serviceIndex));
    const attributes = data.assertion.attributes.map((a) => a.name);
    const expected =
      config.spid.serviceProvider.acs[serviceIndex]?.attributes ?? [];
    assert(
      data.assertion.attributes.every((attr) => attr.nameFormat),
      `Missing Attributes NameFormat`,
    );
    assert(
      data.assertion.attributes.every((attr) => typeof attr.value === 'string'),
      `Missing Attributes value`,
    );
    assert.equal(attributes.length, expected.length, `Attributes mismatch`);
    assert.equal(
      difference(attributes, expected).length,
      0,
      `Attributes mismatch`,
    );
  }

  protected get response() {
    return this.getElement('Response', NS.SAML_PROTOCOL);
  }

  protected get assertion() {
    return this.getElement('Assertion', NS.SAML_ASSERTION);
  }

  get id(): string {
    return this.response?.getAttribute('ID');
  }

  get statusCode() {
    return this.getElement('StatusCode', NS.SAML_PROTOCOL)?.getAttribute(
      'Value',
    );
  }

  get inResponseTo(): string {
    return this.response?.getAttribute('InResponseTo');
  }

  get issueInstant(): Date {
    return new Date(this.response?.getAttribute('IssueInstant'));
  }

  get issuer(): string {
    return this.getElement('Issuer', NS.SAML_ASSERTION)?.textContent;
  }
}
