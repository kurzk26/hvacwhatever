/* ============================================================
   BOOK — 구매 드롭다운
   ============================================================ */
(function(){
  'use strict';

  const dd = document.querySelector('.buy-dropdown');
  if(!dd) return;   // 이 페이지에 드롭다운이 없으면 종료

  const btn  = dd.querySelector('.buy-btn');
  const menu = dd.querySelector('.buy-menu');
  if(!btn || !menu) return;

  function open(){
    dd.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function close(){
    dd.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function toggle(){
    dd.classList.contains('open') ? close() : open();
  }

  /* 버튼 클릭 → 토글 */
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    toggle();
  });

  /* 바깥 클릭 → 닫기 */
  document.addEventListener('click', (e)=>{
    if(!dd.contains(e.target)) close();
  });

  /* ESC 키 → 닫기 */
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && dd.classList.contains('open')) close();
  });

  /* 서점 클릭 → 닫기 */
  menu.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> close());
  });
})();