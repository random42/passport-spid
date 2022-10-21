import assert from 'assert';
import fs from 'fs';
import { parse, build } from '../src/xml';

const { log } = console;
const json = (x) => log(JSON.stringify(x, null, 2));

const xml = fs.readFileSync('./var/res0.xml').toString();
const x = parse(xml);

json(x);
assert.deepEqual(x, parse(build(x)));
