import get from 'lodash.get';
import set from 'lodash.set';
import unset from 'lodash.unset';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  X2jOptionsOptional,
  XMLBuilder,
  XmlBuilderOptionsOptional,
  XMLParser,
} from 'fast-xml-parser';
import { array } from './util';

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

const _rename = (obj, from: string, to: string) => {
  obj[to] = obj[from];
  delete obj[from];
};

const _nsPrefix = (ns: string) => (ns ? `${ns}:` : '');
const _getTagName = (k: string) =>
  k.includes(':') ? k.slice(k.indexOf(':') + 1) : k;
const isNs = (tag: string, ns: string) =>
  ns ? tag.startsWith(`${ns}:`) : !tag.includes(':');
const _children = (node) =>
  Object.keys(node).filter((k) => ![TEXT, ATTR, '?xml'].includes(k));

const _renameNamespace = (node, from: string, to: string) => {
  if (Array.isArray(node)) {
    return node.forEach((n) => _renameNamespace(n, from, to));
  } else if (typeof node !== 'object' || !node) {
    return;
  }
  const prefix = _nsPrefix(to);
  for (const k of _children(node)) {
    _renameNamespace(node[k], from, to);
    if (isNs(k, from)) {
      _rename(node, k, prefix + _getTagName(k));
    }
  }
};

export const _find = (node, tag: string): any[] => {
  const found = [];
  for (const k of _children(node)) {
    const t = _getTagName(k);
    if (t === tag) {
      found.push(...array(node[k]));
    }
  }
  return found;
};

export class XML_ {
  protected dom: Document;
  constructor(xml: string) {
    this.load(xml);
  }

  public load(xml: string) {
    this.dom = parseDom(xml);
  }

  protected getElement(tag, ns?: string): Element {
    return this.getElements(tag, ns)[0];
  }

  protected getElements(tag, ns?: string): Element[] {
    return Array.from(this.dom.getElementsByTagNameNS(ns ?? '*', tag));
  }

  xml() {
    return serialize(this.dom);
  }
}

export class XML {
  // parsed object
  protected _: any;

  constructor(xml: string) {
    this.load(xml);
  }

  get(path?: string) {
    if (!path) return this._;
    else return get(this._, path);
  }

  protected set(path: string, value) {
    return set(this._, path, value);
  }

  protected unset(path: string) {
    unset(this._, path);
  }

  xml() {
    return build(this._);
  }

  load(xml: string) {
    this._ = parse(xml);
  }

  find(tag: string) {
    return _find(this._, tag);
  }

  renameNamespace(from: string, to: string, root: string) {
    if (from === to) return;
    const node = this.get(root);
    const oldAttrKey = `xmlns${from ? `:${from}` : ''}`;
    const newAttrKey = `xmlns${to ? `:${to}` : ''}`;
    _rename(node[ATTR], oldAttrKey, newAttrKey);
    _renameNamespace(this._, from, to);
  }
}
