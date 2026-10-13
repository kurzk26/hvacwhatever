/*
 * airplan.at 기술자료 게시판: 기존 8개 HTML 페이지 + 티스토리 8개 하위 카테고리
 * 티스토리 글을 홈 사이트 내부에서 읽는 기능은 서버 /tech/read/...에 있습니다.
 * 기존 Decap/tech-data.json는 이 게시판에 사용하지 않습니다.
 */
(() => {
  'use strict';
  const boards = Object.freeze({
    '신제품·업데이트 소식': 'news', '신제품·업데이트': 'news',
    '냉매배관': 'refrigerant', '드레인배관': 'drain',
    '보온·결로': 'insulation', '전기·통신': 'electric',
    '시공·시운전': 'installation', '고장진단': 'diagnosis',
    'HVAC 해외 소식': 'global'
  });
  const key = document.body.dataset.techBoard || boards[document.body.dataset.techCategory];
  const list = document.getElementById('techList');
  const search = document.getElementById('techSearch');
  if (!list || !key) return;
  const legacyDetail = document.getElementById('techDetailView');
  if (legacyDetail) legacyDetail.hidden = true;

  let posts = [];
  const PAGE_SIZE = 12;
  let count = PAGE_SIZE;
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const dateFormat = raw => {
    if (!raw || Number.isNaN(Date.parse(raw))) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(raw));
  };

  const source = make('p', 'tech-tistory-source');
  const original = make('a', 'tech-tistory-original', '티스토리 공식 기술 블로그 ↗');
  original.href = 'https://hvacwhatever.tistory.com/category/01%20TECH%20%E2%80%94%20%EA%B8%B0%EC%88%A0%20%EC%9E%90%EB%A3%8C';
  original.target = '_blank';
  original.rel = 'noopener noreferrer';
  source.append('게시글 출처: ', original);
  list.after(source);

  const more = make('button', 'tech-tistory-more', '더 보기');
  more.type = 'button';
  more.hidden = true;
  list.after(more);
  const status = make('p', 'tech-tistory-status');
  status.setAttribute('role', 'status');
  list.before(status);

  function render() {
    const term = (search?.value || '').trim().toLocaleLowerCase('ko-KR');
    const found = posts.filter(p => !term || `${p.title} ${p.excerpt}`.toLocaleLowerCase('ko-KR').includes(term));
    const nodes = document.createDocumentFragment();
    for (const p of found.slice(0, count)) {
      const card = make('a', 'tech-list-item');
      card.href = p.readerUrl;
      const body = make('div', 'tech-item-body');
      body.append(make('div', 'tech-item-title', p.title || '제목 없음'));
      if (p.excerpt) body.append(make('p', 'tech-tistory-excerpt', p.excerpt));
      const meta = make('div', 'tech-item-meta');
      meta.append(make('span', '', '에어컨 무엇이든지 물어보세요'));
      meta.append(make('span', '', dateFormat(p.date)));
      body.append(meta);
      if (p.thumbnail && /^https:\/\//i.test(p.thumbnail)) {
        card.classList.add('has-thumb');
        const frame = make('div', 'tech-item-thumb');
        const img = make('img');
        img.src = p.thumbnail; img.alt = ''; img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        frame.append(img); card.append(frame);
      }
      card.append(body); nodes.append(card);
    }
    list.replaceChildren(nodes);
    status.textContent = found.length ? `총 ${found.length}개 자료` :
      (term ? '검색 결과가 없습니다.' : '이 카테고리에 등록된 기술자료가 없습니다.');
    more.hidden = count >= found.length;
  }
  search?.addEventListener('input', () => { count = PAGE_SIZE; render(); });
  more.addEventListener('click', () => { count += PAGE_SIZE; render(); });

  async function load() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/tistory-tech?board=${encodeURIComponent(key)}`, {
        headers: { Accept: 'application/json' }, signal: controller.signal
      });
      if (!response.ok) throw new Error(`연동 서버 오류 ${response.status}`);
      const result = await response.json();
      if (!Array.isArray(result.posts)) throw new Error('예상하지 못한 게시글 데이터');
      posts = result.posts.filter(p => p && typeof p.title === 'string' &&
        typeof p.readerUrl === 'string' && p.readerUrl.startsWith(`/tech/read/${key}/`));
      render();
    } catch (error) {
      console.error('티스토리 기술자료 연동 오류:', error);
      list.replaceChildren(make('div', 'tech-empty',
        '현재 기술자료를 불러오지 못했습니다. 잠시 후 다시 시도하거나 티스토리 원문에서 확인해 주세요.'));
      status.textContent = '자료를 불러오지 못했습니다.';
      retry.hidden = false;
    } finally { clearTimeout(timer); }
  }
  const retry = make('button', 'tech-tistory-retry', '다시 불러오기');
  retry.type = 'button'; retry.hidden = true;
  list.after(retry);
  retry.addEventListener('click', () => {
    retry.hidden = true;
    list.replaceChildren(make('div', 'tech-empty', '기술자료를 불러오는 중입니다...'));
    load();
  });
  load();
})();
