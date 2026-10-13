// airplan.at 기존 TECHNICAL DATA 8개 메뉴와 티스토리 하위 카테고리 매핑
// 티스토리 관리자 > 카테고리 관리: 상위 '01 TECH — 기술 자료' 아래 생성.
export const TOP_CATEGORY = '01 TECH — 기술 자료';
export const BOARDS = Object.freeze({
  news:         { label: '신제품·업데이트', route: '/tech-news',         number: '01', aliases: ['신제품·업데이트 소식'] },
  refrigerant:  { label: '냉매배관',        route: '/tech-refrigerant',  number: '02', aliases: [] },
  drain:        { label: '드레인배관',      route: '/tech-drain',        number: '03', aliases: [] },
  insulation:   { label: '보온·결로',       route: '/tech-insulation',   number: '04', aliases: [] },
  electric:     { label: '전기·통신',       route: '/tech-electric',     number: '05', aliases: [] },
  installation: { label: '시공·시운전',     route: '/tech-installation', number: '06', aliases: [] },
  diagnosis:    { label: '고장진단',        route: '/tech-diagnosis',    number: '07', aliases: [] },
  global:       { label: 'HVAC 해외 소식', route: '/tech-global',       number: '08', aliases: [] }
});

export const isBoard = key => typeof key === 'string' && Object.hasOwn(BOARDS, key);

// Tistory RSS sometimes escapes HTML named entities a second time, e.g.
// `01 TECH &mdash; 기술 자료/신제품&middot;업데이트`.
// Decode only category labels before comparing names. No runtime dependency.
const CATEGORY_ENTITIES = Object.freeze({
  amp: '&', mdash: '—', ndash: '–', middot: '·', bull: '•', nbsp: ' ',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', quot: '"', apos: "'",
  lt: '<', gt: '>'
});

export function decodeCategoryEntities(value) {
  let decoded = String(value ?? '');
  // Support both `&mdash;` and `&amp;mdash;` without allowing unlimited passes.
  for (let pass = 0; pass < 2; pass++) {
    const next = decoded.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/giu, (original, entity) => {
      if (entity.startsWith('#')) {
        const hex = /^#x/i.test(entity);
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return original;
        return String.fromCodePoint(code);
      }
      return CATEGORY_ENTITIES[entity.toLowerCase()] ?? original;
    });
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

const norm = v => decodeCategoryEntities(v).normalize('NFKC').toLocaleLowerCase('ko-KR')
  .replace(/[\s\u00a0]+/gu, '').replace(/[‐‑‒–—−]/gu, '-').replace(/[·•]/gu, '·');

// RSS category가 `하위이름`이거나 `상위이름/하위이름`인 형태에 대응.
// 카테고리 이름이 본 목록과 다르면 이 파일의 label/aliases를 함께 수정해야 합니다.
export function boardForCategory(raw) {
  const categories = Array.isArray(raw) ? raw : [raw];
  for (const category of categories) {
    const text = decodeCategoryEntities(category).trim();
    if (!text) continue;
    const segments = text.split(/\s*(?:\/|>|›|»|→)\s*/u).filter(Boolean);
    // Some Tistory themes include numbering on subcategories.
    const leaf = norm(segments.at(-1)).replace(/^\d{1,2}[.·_\-)]/, '');
    if (segments.length > 1 && norm(segments[0]) !== norm(TOP_CATEGORY)) continue;
    for (const [key, def] of Object.entries(BOARDS)) {
      if ([def.label, ...def.aliases].some(label => norm(label) === leaf)) return key;
    }
  }
  return null;
}
