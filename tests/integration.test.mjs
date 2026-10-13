import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOARDS } from '../lib/categories.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = path => readFileSync(join(root, path), 'utf8');
test('all eight original board URLs load Tistory code with correct board id', () => {
  const script = file('js/tech.js');
  assert.match(script, /\/api\/tistory-tech/);
  for (const [key, board] of Object.entries(BOARDS)) {
    const path = board.route.slice(1) + '.html';
    const html = file(path);
    assert.match(html, new RegExp(`data-tech-board="${key}"`));
    assert.match(html, /id="techList"/);
    assert.match(html, /id="techSearch"/);
    assert.match(html, /src="js\/tech\.js"/);
  }
});
test('reader page is explicitly noindex while list pages are not', () => {
  const reader = file('netlify/functions/tistory-tech-reader.mjs');
  assert.match(reader, /X-Robots-Tag.*noindex, follow/);
  assert.match(reader, /name="robots" content="noindex, follow"/);
  for (const board of Object.values(BOARDS)) {
    assert.doesNotMatch(file(board.route.slice(1) + '.html'), /name="robots" content="noindex/);
  }
});
test('no external company categories are mapped to technical board', () => {
  const parser = file('lib/categories.mjs');
  assert.match(parser, /TOP_CATEGORY/);
  assert.match(parser, /boardForCategory/);
});
