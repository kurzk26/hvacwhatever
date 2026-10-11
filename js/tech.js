/* ============================================================
   기술자료 게시판 (Google Sheets API)
   ============================================================ */
(function(){
  'use strict';

  /* ⬇⬇⬇ 여기에 웹앱 URL ⬇⬇⬇ */
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzyRQ3Gmva-nqGGY8iTSLgOCwAV8bZO7QR8nf7iOLJVBYydBq725mm3EO-lemlXdbB/exec';
  /* ⬆⬆⬆ */

  const CATEGORY = document.body.dataset.techCategory || '';

  const listView   = document.getElementById('techListView');
  const detailView = document.getElementById('techDetailView');
  const listEl     = document.getElementById('techList');
  const searchEl   = document.getElementById('techSearch');
  if(!listEl) return;

  let allPosts = [];

  /* ---------- Drive 링크 → 이미지 URL ---------- */
  function driveToImgUrl(url){
    if(!url) return '';
    const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/)
           || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(!m) return '';
    return 'https://lh3.googleusercontent.com/d/' + m[1];
  }

  /* ---------- 목록 로드 ---------- */
  async function loadList(){
    try{
      let url = APPS_SCRIPT_URL + '?action=list';
      if(CATEGORY) url += '&category=' + encodeURIComponent(CATEGORY);

      const res  = await fetch(url);
      const json = await res.json();
      if(!json.success) throw new Error(json.message);

      allPosts = json.data || [];
      renderList(allPosts);
    }catch(err){
      listEl.innerHTML = '<div class="tech-empty">게시글을 불러오지 못했습니다.</div>';
      console.error(err);
    }
  }

  /* ---------- 목록 렌더 ---------- */
  function renderList(posts){
    if(!posts.length){
      listEl.innerHTML = '<div class="tech-empty">등록된 자료가 없습니다.</div>';
      return;
    }

    listEl.innerHTML = posts.map(p=>{
      const thumbUrl = p.이미지 ? driveToImgUrl(p.이미지) : '';
      const thumb = thumbUrl
        ? `<div class="tech-item-thumb"><img src="${thumbUrl}=w200" alt="" loading="lazy"></div>`
        : '';

      return `
        <a class="tech-list-item ${thumbUrl ? 'has-thumb' : ''}"
           href="#post-${p.id}" data-id="${p.id}">
          ${thumb}
          <div class="tech-item-body">
            <div class="tech-item-title">${escapeHtml(p.제목 || '')}</div>
            <div class="tech-item-meta">
              <span>${escapeHtml(p.작성자 || '운영자')}</span>
              <span>${escapeHtml(p.날짜 || '')}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    listEl.querySelectorAll('.tech-list-item').forEach(el=>{
      el.addEventListener('click', (e)=>{
        e.preventDefault();
        loadDetail(el.dataset.id);
      });
    });
  }

  /* ---------- 본문 렌더 (이미지 마커 + 텍스트) ---------- */
  function renderContent(text){
    if(!text) return '';

    // 1) HTML escape
    let safe = escapeHtml(String(text));

    // 2) 이미지 마커 변환
    //    [IMG:URL]         → 100% 크기 (기본)
    //    [IMG-LARGE:URL]   → 100%
    //    [IMG-MEDIUM:URL]  → 75%
    //    [IMG-SMALL:URL]   → 50%
    safe = safe.replace(
      /\[IMG(-SMALL|-MEDIUM|-LARGE)?:([^\]]+)\]/g,
      (match, size, url)=>{
        const imgUrl = driveToImgUrl(url.trim());
        if(!imgUrl) return '';

        const sizeClass = size === '-SMALL'  ? 'small'
                        : size === '-MEDIUM' ? 'medium'
                        : size === '-LARGE'  ? 'large'
                        : '';

        return `<figure class="tech-detail-figure ${sizeClass}">
                  <img src="${imgUrl}=w1200" alt="" loading="lazy">
                </figure>`;
      }
    );

    // 3) 줄바꿈
    return safe.replace(/\n/g, '<br/>');
  }

  /* ---------- 상세 로드 ---------- */
  async function loadDetail(id){
    try{
      let url = APPS_SCRIPT_URL + '?action=detail&id=' + encodeURIComponent(id);
      if(CATEGORY) url += '&category=' + encodeURIComponent(CATEGORY);

      const res  = await fetch(url);
      const json = await res.json();
      if(!json.success || !json.data) throw new Error('글을 찾을 수 없습니다.');

      const p = json.data;

      document.getElementById('techDetailTitle').textContent  = p.제목 || '';
      document.getElementById('techDetailAuthor').textContent = p.작성자 || '운영자';
      document.getElementById('techDetailDate').textContent   = p.날짜 || '';

      const contentHtml = renderContent(p.내용);
    
      document.getElementById('techDetailContent').innerHTML = contentHtml;

      listView.style.display   = 'none';
      detailView.style.display = 'block';
      window.scrollTo({top:0, behavior:'smooth'});
      history.replaceState(null, '', '#post-' + id);

    }catch(err){
      alert('자료를 불러오지 못했습니다.');
      console.error(err);
    }
  }

  /* ---------- 뒤로 ---------- */
  const backBtn = document.getElementById('techBack');
  if(backBtn){
    backBtn.addEventListener('click', ()=>{
      detailView.style.display = 'none';
      listView.style.display   = 'block';
      history.replaceState(null, '', location.pathname);
    });
  }

  /* ---------- 검색 ---------- */
  if(searchEl){
    searchEl.addEventListener('input', ()=>{
      const q = searchEl.value.trim().toLowerCase();
      if(!q){ renderList(allPosts); return; }
      renderList(allPosts.filter(p=>
        String(p.제목 || '').toLowerCase().includes(q)
      ));
    });
  }

  /* ---------- 유틸 ---------- */
  function escapeHtml(s){
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ---------- 초기 로드 ---------- */
  loadList();

  const m = location.hash.match(/^#post-(.+)$/);
  if(m) loadDetail(m[1]);

})();