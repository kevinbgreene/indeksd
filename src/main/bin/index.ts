#!/usr/bin/env node
import { generate } from '../index';
import { IMakeOptions } from '../types';
import { resolveOptions } from './resolveOptions';

console.log(process.argv);
const cliArgs: Array<string> = process.argv.slice(2);
console.log({ cliArgs });
const options: IMakeOptions = resolveOptions(cliArgs);

generate(options);
