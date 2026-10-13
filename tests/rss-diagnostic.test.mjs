import test from 'node:test';
import assert from 'node:assert/strict';
import { boardForCategory } from '../lib/categories.mjs';
const parent = '01 TECH — 기술 자료';
for (const [name,key] of [
  ['신제품·업데이트','news'],['냉매배관','refrigerant'],['드레인배관','drain'],
  ['보온·결로','insulation'],['전기·통신','electric'],['시공·시운전','installation'],
  ['고장진단','diagnosis'],['HVAC 해외 소식','global']]) {
  test(`${name} category exact and nested`, () => {
    assert.equal(boardForCategory(name),key);
    assert.equal(boardForCategory(`${parent}/${name}`),key);
    assert.equal(boardForCategory(`${parent}/01-${name}`),key);
  });
}
test('exclude other parent categories',()=>{
 assert.equal(boardForCategory('04 NEWS — 회사 소식/신제품·업데이트'),null);
});
