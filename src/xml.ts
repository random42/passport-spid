import { load, CheerioAPI } from 'cheerio';
import {
  X2jOptionsOptional,
  XMLBuilder,
  XmlBuilderOptionsOptional,
  XMLParser,
} from 'fast-xml-parser';
import escapeCss from 'cssesc';

const TEXT_KEY = '#text';
const ATTR_KEY = ':@';
const ATTR_PREFIX = '@_';

const OPTIONS: X2jOptionsOptional & XmlBuilderOptionsOptional = {
  ignoreAttributes: false,
  textNodeName: TEXT_KEY,
  attributeNamePrefix: ATTR_PREFIX,
  allowBooleanAttributes: true,
  preserveOrder: true,
  suppressEmptyNode: true,
  suppressBooleanAttributes: true,
  format: false,
} as const;

const parser = new XMLParser(OPTIONS);
const builder = new XMLBuilder(OPTIONS);

export const parse = parser.parse.bind(parser) as XMLParser['parse'];
export const build = builder.build.bind(builder) as XMLBuilder['build'];
export const getTag = (x): string => Object.keys(x)[0];
export const text = (text: string) => ({ [TEXT_KEY]: text });
export const attributes = (attr) => {
  const r = { [ATTR_KEY]: {} };
  Object.keys(attr).forEach((k) => {
    r[ATTR_KEY][`${ATTR_PREFIX}${k}`] = attr[k];
  });
  return r;
};

export const cleanBuildObject = (o) => {
  if (Array.isArray(o)) {
    return o.filter((x) => x).map((x) => cleanBuildObject(x));
  }
  if (typeof o === 'object' && o && !o[TEXT_KEY]) {
    const tag = getTag(o);
    return {
      ...o,
      [tag]: cleanBuildObject(o[tag]),
    };
  } else return o;
};

// selector escape
export const e = (s: string) =>
  escapeCss(s, {
    isIdentifier: true,
  });

export class XMLCheerio {
  $: CheerioAPI;
  constructor(xml: string) {
    this.$ = load(xml, {
      xml: true,
    });
  }
}
