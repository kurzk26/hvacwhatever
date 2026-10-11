// 계산기 iframe 모달
(function(){
  if(document.getElementById('calcModal')) return;

  const html = `
  <div id="calcModal" class="calc-modal" aria-hidden="true">
    <div class="calc-modal-backdrop" data-close></div>
    <div class="calc-modal-panel" role="dialog" aria-modal="true" aria-label="계산기">
      <div class="calc-modal-head">
        <div class="calc-modal-title" id="calcModalTitle">계산기</div>
        <div class="calc-modal-actions">
          <a id="calcModalOpenNew" class="calc-modal-btn" href="#" target="_blank" rel="noopener">새 창에서 열기 ↗</a>
          <button class="calc-modal-btn ghost" type="button" data-close aria-label="닫기">✕</button>
        </div>
      </div>
      <div class="calc-modal-body">
        <iframe id="calcModalFrame" title="계산기" loading="lazy"
          referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal   = document.getElementById('calcModal');
  const frame   = document.getElementById('calcModalFrame');
  const titleEl = document.getElementById('calcModalTitle');
  const newWin  = document.getElementById('calcModalOpenNew');

  function openModal(url, title){
    titleEl.textContent = title || '계산기';
    newWin.href = url;
    frame.src = url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    frame.src = 'about:blank'; // 리소스 해제
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e=>{
    const trigger = e.target.closest('[data-calc]');
    if(trigger){
      e.preventDefault();
      const key   = trigger.dataset.calc;
      const url   = (window.CALC_URLS && window.CALC_URLS[key]) || trigger.getAttribute('href');
      const title = trigger.dataset.calcTitle
                 || trigger.closest('.card')?.querySelector('h3')?.textContent
                 || '계산기';
      openModal(url, title);
      return;
    }
    if(e.target.closest('[data-close]')) closeModal();
  });

  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();