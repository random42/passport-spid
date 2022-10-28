import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  X2jOptionsOptional,
  XMLBuilder,
  XmlBuilderOptionsOptional,
  XMLParser,
} from 'fast-xml-parser';

const TEXT = '#';
const ATTR = '@';

const OPTIONS: X2jOptionsOptional & XmlBuilderOptionsOptional = {
  ignoreAttributes: false,
  attributesGroupName: ATTR,
  attributeNamePrefix: '',
  textNodeName: TEXT,
  allowBooleanAttributes: true,
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
  format: false,
} as const;

const parser = new XMLParser(OPTIONS);
const builder = new XMLBuilder(OPTIONS);

export const parseDom = (xml: string) =>
  new DOMParser().parseFromString(xml, 'text/xml');
export const serialize = (node: Node) =>
  new XMLSerializer().serializeToString(node);

export const parse = parser.parse.bind(parser) as XMLParser['parse'];
export const build = builder.build.bind(builder) as XMLBuilder['build'];

export const nodeFromObject = (x) => parseDom(build(x));
export const buildFromObject = build;

export class XML {
  protected dom: Document;
  constructor(xml: string) {
    this.load(xml);
  }

  public load(xml: string) {
    this.dom = parseDom(xml);
  }

  public getElement(tag, ns?: string): Element {
    return this.getElements(tag, ns)[0];
  }

  public getElements(tag, ns?: string): Element[] {
    return Array.from(this.dom.getElementsByTagNameNS(ns ?? '*', tag));
  }

  xml() {
    return serialize(this.dom);
  }
}
