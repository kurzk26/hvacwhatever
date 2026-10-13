import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, TOP_CATEGORY, boardForCategory } from '../lib/categories.mjs';
test('exactly eight existing technical boards',()=>{assert.equal(Object.keys(BOARDS).length,8)});
for (const [id,board] of Object.entries(BOARDS)) {
  test('map '+board.label,()=>{
    assert.equal(boardForCategory(board.label),id);
    assert.equal(boardForCategory(`${TOP_CATEGORY}/${board.label}`),id);
  });
}
test('exclude consumer news company category',()=>{
 assert.equal(boardForCategory('04 NEWS — 회사 소식'),null);
 assert.equal(boardForCategory('02 TOOLS — 기술 도구'),null);
 assert.equal(boardForCategory('03 CONSUMER — 소비자 자료'),null);
 assert.equal(boardForCategory('다른 대분류/냉매배관'),null);
});
