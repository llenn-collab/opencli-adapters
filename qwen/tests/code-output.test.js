import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCodeBlocks } from '../code-output.js';

test('extracts fenced code blocks without line numbers', () => {
  assert.deepEqual(extractCodeBlocks('before\n```js\na\n\nb\n```\nafter'), [{ language: 'js', code: 'a\n\nb' }]);
  assert.deepEqual(extractCodeBlocks('no code'), []);
});
