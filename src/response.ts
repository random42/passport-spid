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
import { isISODateTimeUTC } from './util';

export class SpidResponse extends XML.XML {
  validate(req: SpidRequest, config: SpidConfig, saml: SamlOptions) {
    assert(this.response, `Missing response`);
    assert(this.assertion, `Missing assertion`);
    const { SAML_ASSERTION: A, SAML_PROTOCOL: P } = NS;
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
    assert.strictEqual(
      data.version,
      '2.0',
      `Invalid  SAML version "${data.version}"`,
    );
    // IssueInstant
    const assertIssueInstant = (ii) =>
      assert(
        isISODateTimeUTC(ii) &&
          !dayjs(ii).isBefore(req.issueInstant) &&
          dayjs(ii).isBefore(
            req.issueInstant.valueOf() + saml.requestIdExpirationPeriodMs,
          ),
        `Invalid IssueInstant "${data.issueInstant}"`,
      );
    assertIssueInstant(data.issueInstant);
    assertIssueInstant(data.assertion.issueInstant);
    // Destination
    assert.strictEqual(
      data.destination,
      config.saml.callbackUrl,
      `Invalid Destination "${data.destination}"`,
    );
    // StatusCode
    assert.strictEqual(
      data.statusCode,
      'urn:oasis:names:tc:SAML:2.0:status:Success',
      `Invalid StatusCode "${data.statusCode}"`,
    );
    // Issuer
    assert.strictEqual(
      data.issuer,
      saml.idpIssuer,
      `Invalid Issuer "${data.issuer}"`,
    );
    assert.strictEqual(
      data.assertion.issuer,
      saml.idpIssuer,
      `Invalid Assertion Issuer "${data.assertion.issuer}"`,
    );
    assert(
      (!responseIssuer.hasAttribute('Format') ||
        responseIssuer.getAttribute('Format') === ISSUER_FORMAT) &&
        assIssuer.getAttribute('Format') === ISSUER_FORMAT,
      `Invalid Issuer Format "${data.issuerFormat}"`,
    );
    assert.strictEqual(
      data.assertion.version,
      '2.0',
      `Invalid Assertion Version "${data.assertion.version}"`,
    );
    // Subject
    assert(data.subject.nameId, `Invalid NameID "${data.subject.nameId}"`);
    assert.strictEqual(
      data.subject.nameIdFormat,
      IDENTIFIER_FORMAT,
      `Invalid NameID Format "${data.subject.nameIdFormat}"`,
    );
    assert.strictEqual(
      data.subject.nameIdQualifier,
      saml.idpIssuer,
      `Invalid NameQualifier "${data.subject.nameIdQualifier}"`,
    );
    // SubjectConfirmation
    assert.strictEqual(
      data.subject.confirmation.method,
      SUBJECT_CONFIRMATION_METHOD,
      `Invalid SubjectConfirmation`,
    );
    assert.strictEqual(
      data.subject.confirmation.data.inResponseTo,
      req.id,
      `Invalid SubjectConfirmation`,
    );
    assert.strictEqual(
      data.subject.confirmation.data.recipient,
      req
        .getElement('AuthnRequest', P)
        .getAttribute('AssertionConsumerServiceURL'),
      `Invalid SubjectConfirmation`,
    );
    assert(
      isISODateTimeUTC(data.subject.confirmation.data.notOnOrAfter),
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
      isISODateTimeUTC(data.assertion.conditions.notBefore),
      `Invalid Conditions`,
    );
    assert(
      !dayjs(data.assertion.conditions.notBefore).isAfter(data.issueInstant),
      `Invalid Conditions`,
    );
    assert(
      isISODateTimeUTC(data.assertion.conditions.notOnOrAfter),
      `Invalid Conditions`,
    );
    assert(
      dayjs(data.assertion.conditions.notOnOrAfter).isAfter(data.issueInstant),
      `Invalid Conditions`,
    );
    // AuthnStatement
    const { authnContext } = data.assertion;
    const authnError = `Invalid AuthnContext "${data.assertion.authnContext}"`;
    assert(
      Object.values(SPID_LEVELS).includes(authnContext as any),
      authnError,
    );
    const reqLevel = config.spid.authnContext;
    const level = +authnContext.slice(-1, authnContext.length);
    const { racComparison } = saml;
    // nice rules -_-
    switch (racComparison) {
      case 'exact':
        assert(level >= reqLevel, authnError);
        break;
      case 'better':
        assert(level > reqLevel, authnError);
        break;
      case 'minimum':
        assert(level >= reqLevel, authnError);
        break;
      case 'maximum':
        break;
    }
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
      data.assertion.attributes.every((attr) => typeof attr.value === 'string'),
      `Missing Attributes value`,
    );
    assert.strictEqual(
      attributes.length,
      expected.length,
      `Attributes mismatch`,
    );
    assert.strictEqual(
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
