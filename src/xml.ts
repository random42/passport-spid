import get from 'lodash.get';
import set from 'lodash.set';
import unset from 'lodash.unset';
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

export const parse = parser.parse.bind(parser) as XMLParser['parse'];
export const build = builder.build.bind(builder) as XMLBuilder['build'];

const _rename = (obj, from: string, to: string) => {
  obj[to] = obj[from];
  delete obj[from];
};

const _nsPrefix = (ns: string) => (ns ? `${ns}:` : '');
const _getTagName = (k: string) =>
  k.includes(':') ? k.slice(k.indexOf(':') + 1) : k;
const isNs = (tag: string, ns: string) =>
  ns ? tag.startsWith(`${ns}:`) : !tag.includes(':');

const _renameNamespace = (node, from: string, to: string) => {
  if (Array.isArray(node)) {
    return node.forEach((n) => _renameNamespace(n, from, to));
  } else if (typeof node !== 'object' || !node) {
    return;
  }
  const prefix = _nsPrefix(to);
  for (const k of Object.keys(node).filter(
    (k) => ![TEXT, ATTR, '?xml'].includes(k),
  )) {
    _renameNamespace(node[k], from, to);
    if (isNs(k, from)) {
      _rename(node, k, prefix + _getTagName(k));
    }
  }
};

export class XML {
  // parsed object
  protected _: any;

  constructor(protected _xml: string) {
    this.xml = _xml;
  }

  get(path: string) {
    return get(this._, path);
  }

  protected set(path: string, value) {
    return set(this._, path, value);
  }

  protected unset(path: string) {
    unset(this._, path);
  }

  get xml() {
    return this._xml;
  }

  set xml(xml: string) {
    this._xml = xml;
    this._ = parse(xml);
  }

  renameNamespace(from: string, to: string, root: string) {
    if (from === to) return;
    const node = this.get(root);
    const oldAttrKey = `xmlns${from ? `:${from}` : ''}`;
    const newAttrKey = `xmlns${to ? `:${to}` : ''}`;
    _rename(node[ATTR], oldAttrKey, newAttrKey);
    _renameNamespace(this._, from, to);
  }

  public build() {
    this._xml = build(this._);
    return this;
  }
}
