/* ============================================================
   외부 링크 확인 모달
   - rel="noopener" + data-external 속성 링크에 적용
   ============================================================ */
(function(){
  'use strict';

  if(document.getElementById('externalModal')) return;

  const html = `
  <div id="externalModal" class="external-modal" aria-hidden="true">
    <div class="external-modal-backdrop" data-ext-close></div>
    <div class="external-modal-panel" role="dialog" aria-modal="true" aria-labelledby="externalModalTitle">
      <div class="external-modal-icon">🔗</div>
      <h2 id="externalModalTitle">외부 사이트로 이동합니다</h2>
      <p class="external-modal-msg">
        이 링크는 <strong>외부 사이트</strong>로 연결됩니다.<br>
      </p>
      <div class="external-modal-url" id="externalModalUrl"></div>
      <div class="external-modal-actions">
        <button type="button" class="external-btn ghost" data-ext-close>취소</button>
        <button type="button" class="external-btn primary" id="externalModalGo">
          이동하기 →
        </button>
      </div>
      <label class="external-modal-check">
        <input type="checkbox" id="externalModalSkip">
        <span>이 창 다시 보지 않기</span>
      </label>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal   = document.getElementById('externalModal');
  const urlEl   = document.getElementById('externalModalUrl');
  const goBtn   = document.getElementById('externalModalGo');
  const skipBox = document.getElementById('externalModalSkip');

  let currentUrl = '';
  let currentTarget = null;

  function openModal(url, linkEl){
    currentUrl = url;
    currentTarget = linkEl ? linkEl.target : '_blank';
    urlEl.textContent = url;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    currentUrl = '';
    currentTarget = null;
  }

  /* 외부 링크 클릭 감지 */
  document.addEventListener('click', e=>{
    const link = e.target.closest('a[href]');
    if(!link) return;

    const href = link.getAttribute('href');
    if(!href) return;

    // 외부 링크 판단: http(s)로 시작하고, 같은 도메인이 아니면
    const isExternal = /^https?:\/\//i.test(href) &&
      !href.startsWith(location.origin);

    if(!isExternal) return;

    // 이미 체크했으면 바로 이동
    if(localStorage.getItem('externalModalSkip') === '1') return;

    // 확인 모달
    e.preventDefault();
    openModal(href, link);
  });

  /* 이동 버튼 */
  goBtn.addEventListener('click', ()=>{
    if(skipBox.checked){
      localStorage.setItem('externalModalSkip', '1');
    }
    const url = currentUrl;
    const target = currentTarget || '_blank';
    closeModal();
    if(url){
      window.open(url, target, 'noopener');
    }
  });

  /* 닫기 */
  modal.querySelectorAll('[data-ext-close]').forEach(el=>{
    el.addEventListener('click', closeModal);
  });

  /* ESC */
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();