/* ============================================================
   기술자료 게시판 (Decap CMS + JSON)
   ============================================================ */
(function(){
  'use strict';

  /* ⬇⬇⬇ tech-data.json 경로 ⬇⬇⬇ */
  const DATA_URL = 'tech-data.json';
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
    if(!m) return url;
    return 'https://lh3.googleusercontent.com/d/' + m[1];
  }

  /* ---------- 데이터 로드 ---------- */
  async function loadData(){
    try{
      const res  = await fetch(DATA_URL);
      const json = await res.json();

      let posts = json.posts || [];

      // 카테고리 필터
      if(CATEGORY){
        posts = posts.filter(p =>
          String(p.카테고리).trim() === String(CATEGORY).trim()
        );
      }

      allPosts = posts;
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

  /* ---------- 상세 로드 ---------- */
  function loadDetail(id){
    const p = allPosts.find(x => String(x.id) === String(id));
    if(!p){
      alert('글을 찾을 수 없습니다.');
      return;
    }

    document.getElementById('techDetailTitle').textContent  = p.제목 || '';
    document.getElementById('techDetailAuthor').textContent = p.작성자 || '운영자';
    document.getElementById('techDetailDate').textContent   = p.날짜 || '';
    document.getElementById('techDetailContent').innerHTML  = p.내용 || '';

    listView.style.display   = 'none';
    detailView.style.display = 'block';
    window.scrollTo({top:0, behavior:'smooth'});
    history.replaceState(null, '', '#post-' + id);
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
  loadData();

  /* URL에 #post-id 있으면 바로 상세 열기 */
  const m = location.hash.match(/^#post-(.+)$/);
  if(m){
    const check = setInterval(()=>{
      if(allPosts.length){
        clearInterval(check);
        loadDetail(m[1]);
      }
    }, 100);
  }

})();