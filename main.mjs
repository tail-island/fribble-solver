import {readQuestion, writeAnswer} from './io.mjs';
import {solve}                     from './solver.mjs';

writeAnswer(solve(readQuestion(process.stdin.fd)), process.stdout.fd);
