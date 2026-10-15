import { greet } from './lib/greet.js';

const name = process.argv[2] ?? 'world';
console.log(greet(name));
