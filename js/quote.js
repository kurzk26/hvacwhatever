/* ============================================================
   견적 문의 폼 (Google Apps Script → Sheets + Gmail)
   ============================================================ */
(function(){
  'use strict';

  /* ⬇⬇ Apps Script 웹앱 URL ⬇⬇ */
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNPaFlmaCXL8Xt_eJatvtXUXOyQq3_6CjeX4K_V0Mps6mfaa1oZ2j7laoCPsoHd7_6/exec';
  /* ⬆⬆ */

  const form      = document.getElementById('quoteForm');
  const success   = document.getElementById('quoteSuccess');
  const submitBtn = document.getElementById('quoteSubmitBtn');
  if(!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    // 값 수집
    const address  = form.시공현장주소.value.trim();
    const building = form.건물형태및평형.value.trim();
    const units    = form.실내기대수.value.trim();
    const status   = form.현장상태.value;
    const schedule = form.설치희망일정.value.trim();
    const phone    = form.연락처.value.trim();
    const agree    = document.getElementById('qAgree').checked;

    // 검증
    if(!address){  alert('시공 현장 주소를 입력해주세요.'); form.시공현장주소.focus(); return; }
    if(!building){ alert('건물 형태 및 평형을 입력해주세요.'); form.건물형태및평형.focus(); return; }
    if(!units){    alert('설치 희망 실내기 대수를 입력해주세요.'); form.실내기대수.focus(); return; }
    if(!status){   alert('현재 현장 상태를 선택해주세요.'); form.현장상태.focus(); return; }
    if(!schedule){ alert('설치 희망 일정을 입력해주세요.'); form.설치희망일정.focus(); return; }
    if(!phone){    alert('연락처를 입력해주세요.'); form.연락처.focus(); return; }
    if(!agree){    alert('개인정보 수집 및 이용에 동의해주세요.'); return; }

    // 전송
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    try{
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',         // Apps Script는 CORS 응답 못 읽음
        body: new FormData(form)
      });

      // no-cors라 응답을 못 읽음 → 낙관적 성공 처리
      form.style.display = 'none';
      success.style.display = 'block';
      window.scrollTo({top: success.offsetTop - 100, behavior:'smooth'});

    }catch(err){
      alert('전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = '견적 문의 보내기';
    }
  });

  // 성공 후 "확인" → 초기화
  document.getElementById('quoteSuccessBtn').addEventListener('click', ()=>{
    form.reset();
    success.style.display = 'none';
    form.style.display = 'block';
  });
})();