import dayjs from 'dayjs';
import assert from 'assert';
import { SpidConfig } from './types';
import * as XML from './xml';
import { SpidRequest } from './request';
import {
  IDENTIFIER_FORMAT,
  ISSUER_FORMAT,
  SPID_LEVELS,
  SUBJECT_CONFIRMATION_METHOD,
} from './const';
import { SamlOptions } from '@node-saml/node-saml/lib';
import { array } from './util';
import get from 'lodash.get';
import difference from 'lodash.difference';

export class SpidResponse extends XML.XML {
  validate(req: SpidRequest, config: SpidConfig, saml: SamlOptions) {
    // const isISODate = (s: string): boolean => {
    //   const n = Date.parse(s);
    //   if (isNaN(n)) return false;
    //   else {
    //     const iso = new Date(n).toISOString();
    //     return s === iso || s === iso.replace(/\.\d\d\dZ$/, 'Z');
    //   }
    // };
    // const data = {
    //   id: this.id,
    //   destination: this.get('samlp:Response.@.Destination'),
    //   issuerFormat: this.get('samlp:Response.saml:Issuer.@.Format'),
    //   version: this.get('samlp:Response.@.Version'),
    //   issueInstant: this.get('samlp:Response.@.IssueInstant'),
    //   statusCode: this.statusCode,
    //   issuer: this.issuer,
    //   subject: {
    //     nameId: this.get(
    //       'samlp:Response.saml:Assertion.saml:Subject.saml:NameID.#',
    //     )?.trim(),
    //     nameIdFormat: this.get(
    //       'samlp:Response.saml:Assertion.saml:Subject.saml:NameID.@.Format',
    //     ),
    //     nameIdQualifier: this.get(
    //       'samlp:Response.saml:Assertion.saml:Subject.saml:NameID.@.NameQualifier',
    //     ),
    //     confirmation: {
    //       method: this.get(
    //         'samlp:Response.saml:Assertion.saml:Subject.saml:SubjectConfirmation.@.Method',
    //       ),
    //       data: {
    //         recipient: this.get(
    //           'samlp:Response.saml:Assertion.saml:Subject.saml:SubjectConfirmation.saml:SubjectConfirmationData.@.Recipient',
    //         ),
    //         inResponseTo: this.get(
    //           'samlp:Response.saml:Assertion.saml:Subject.saml:SubjectConfirmation.saml:SubjectConfirmationData.@.InResponseTo',
    //         ),
    //         notOnOrAfter: this.get(
    //           'samlp:Response.saml:Assertion.saml:Subject.saml:SubjectConfirmation.saml:SubjectConfirmationData.@.NotOnOrAfter',
    //         ),
    //         notBefore: this.get(
    //           'samlp:Response.saml:Assertion.saml:Subject.saml:SubjectConfirmation.saml:SubjectConfirmationData.@.NotBefore',
    //         ),
    //       },
    //     },
    //   },
    //   assertion: {
    //     version: this.get('samlp:Response.saml:Assertion.@.Version'),
    //     issueInstant: this.get('samlp:Response.saml:Assertion.@.IssueInstant'),
    //     issuer: this.get('samlp:Response.saml:Assertion.saml:Issuer.#'),
    //     issuerFormat: this.get(
    //       'samlp:Response.saml:Assertion.saml:Issuer.@.Format',
    //     ),
    //     conditions: {
    //       notBefore: this.get(
    //         'samlp:Response.saml:Assertion.saml:Conditions.@.NotBefore',
    //       ),
    //       notOnOrAfter: this.get(
    //         'samlp:Response.saml:Assertion.saml:Conditions.@.NotOnOrAfter',
    //       ),
    //     },
    //     authnContext: this.get(
    //       'samlp:Response.saml:Assertion.saml:AuthnStatement.saml:AuthnContext.saml:AuthnContextClassRef',
    //     ),
    //     attributes: array(
    //       this.get(
    //         'samlp:Response.saml:Assertion.saml:AttributeStatement.saml:Attribute',
    //       ),
    //     )
    //       .filter((x) => x)
    //       .map((x) => ({
    //         name: get(x, '@.Name'),
    //         value: get(x, 'saml:AttributeValue.#'),
    //         nameFormat: get(x, '@.NameFormat'),
    //       })),
    //   },
    // };
    // // ID
    // assert(data.id, `Missing ID`);
    // // Version
    // assert.equal(
    //   data.version,
    //   '2.0',
    //   `Invalid  SAML version "${data.version}"`,
    // );
    // // IssueInstant
    // assert(
    //   isISODate(data.issueInstant) &&
    //     isISODate(data.assertion.issueInstant) &&
    //     data.issueInstant === data.assertion.issueInstant &&
    //     dayjs(data.issueInstant).isAfter(req.issueInstant) &&
    //     dayjs(data.issueInstant).isBefore(
    //       req.issueInstant.valueOf() + saml.requestIdExpirationPeriodMs,
    //     ),
    //   `Invalid IssueInstant "${data.issueInstant}"`,
    // );
    // // Destination
    // assert.equal(
    //   data.destination,
    //   config.saml.callbackUrl,
    //   `Invalid Destination "${data.destination}"`,
    // );
    // // StatusCode
    // assert.equal(
    //   data.statusCode,
    //   'urn:oasis:names:tc:SAML:2.0:status:Success',
    //   `Invalid StatusCode "${data.statusCode}"`,
    // );
    // // Issuer
    // assert.equal(
    //   data.issuer,
    //   saml.idpIssuer,
    //   `Invalid Issuer "${data.issuer}"`,
    // );
    // assert.equal(
    //   data.assertion.issuer,
    //   saml.idpIssuer,
    //   `Invalid Assertion Issuer "${data.assertion.issuer}"`,
    // );
    // assert.equal(
    //   data.issuerFormat,
    //   ISSUER_FORMAT,
    //   `Invalid Issuer Format "${data.issuerFormat}"`,
    // );
    // assert.equal(
    //   data.assertion.issuerFormat,
    //   ISSUER_FORMAT,
    //   `Invalid Issuer Format "${data.assertion.issuerFormat}"`,
    // );
    // assert.equal(
    //   data.assertion.version,
    //   '2.0',
    //   `Invalid Assertion Version "${data.assertion.version}"`,
    // );
    // // Subject
    // assert(data.subject.nameId, `Invalid NameID ${data.subject.nameId}`);
    // assert.equal(
    //   data.subject.nameIdFormat,
    //   IDENTIFIER_FORMAT,
    //   `Invalid NameID Format "${data.subject.nameIdFormat}"`,
    // );
    // assert.equal(
    //   data.subject.nameIdQualifier,
    //   saml.idpIssuer,
    //   `Invalid NameQualifier "${data.subject.nameIdQualifier}"`,
    // );
    // // SubjectConfirmation
    // assert.equal(
    //   data.subject.confirmation.method,
    //   SUBJECT_CONFIRMATION_METHOD,
    //   `Invalid SubjectConfirmation`,
    // );
    // assert.equal(
    //   data.subject.confirmation.data.inResponseTo,
    //   req.id,
    //   `Invalid SubjectConfirmation`,
    // );
    // assert.equal(
    //   data.subject.confirmation.data.recipient,
    //   req.get('samlp:AuthnRequest.@.AssertionConsumerServiceURL'),
    //   `Invalid SubjectConfirmation`,
    // );
    // assert(
    //   isISODate(data.subject.confirmation.data.notOnOrAfter),
    //   `Invalid SubjectConfirmation`,
    // );
    // assert(
    //   dayjs(data.subject.confirmation.data.notOnOrAfter).isAfter(
    //     data.issueInstant,
    //   ),
    //   `Invalid SubjectConfirmation`,
    // );
    // // Conditions
    // assert(
    //   isISODate(data.assertion.conditions.notBefore),
    //   `Invalid Conditions`,
    // );
    // assert(
    //   !dayjs(data.assertion.conditions.notBefore).isAfter(data.issueInstant),
    //   `Invalid Conditions`,
    // );
    // assert(
    //   isISODate(data.assertion.conditions.notOnOrAfter),
    //   `Invalid Conditions`,
    // );
    // assert(
    //   dayjs(data.assertion.conditions.notOnOrAfter).isAfter(data.issueInstant),
    //   `Invalid Conditions`,
    // );
    // // AuthnStatement
    // const LEVELS = Object.values(SPID_LEVELS);
    // assert(
    //   LEVELS.includes(data.assertion.authnContext),
    //   `Invalid AuthnContext "${data.assertion.authnContext}"`,
    // );
    // // AttributeStatement
    // const serviceIndex = +req.get(
    //   'samlp:AuthnRequest.@.AttributeConsumingServiceIndex',
    // );
    // assert(!isNaN(serviceIndex));
    // const attributes = data.assertion.attributes.map((a) => a.name);
    // const expected =
    //   config.spid.serviceProvider.acs[serviceIndex]?.attributes ?? [];
    // assert(
    //   data.assertion.attributes.every((attr) => attr.nameFormat),
    //   `Missing Attributes NameFormat`,
    // );
    // assert(
    //   data.assertion.attributes.every((attr) => typeof attr.value === 'string'),
    //   `Missing Attributes value`,
    // );
    // assert.equal(attributes.length, expected.length, `Attributes mismatch`);
    // assert.equal(
    //   difference(attributes, expected).length,
    //   0,
    //   `Attributes mismatch`,
    // );
  }

  get id(): string {
    return this.get('samlp:Response.@.ID');
  }

  get statusCode() {
    return this.get('samlp:Response.samlp:Status.samlp:StatusCode.@.Value');
  }

  get inResponseTo(): string {
    return this.get('samlp:Response.@.InResponseTo');
  }

  get issueInstant(): Date {
    return new Date(this.get('samlp:Response.@.IssueInstant'));
  }

  get issuer(): string {
    return this.get('samlp:Response.saml:Issuer.#');
  }
}
