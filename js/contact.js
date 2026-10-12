/* =========================================================
   문의 모달 시스템 (Contact Modal)
   - 어느 페이지에서든 <script src="js/contact.js"></script> 만 추가하면 됨
   - data-contact 속성을 가진 요소 클릭 시 모달 열림
   ========================================================= */
(function(){

  // ⬇️ Apps Script URL
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwP_nSrG9oduCTA5fkF4OexczFqhaG92YKaJf-SQG49dANUVPKeNVEMpxH224YGqTYF1Q/exec';

  // 이미 로드되어 있으면 중복 방지
  if (document.getElementById('contactModal')) return;

  /* ---------- 1) 스타일 주입 ---------- */
  const CSS = `
    .modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;visibility:hidden;transition:opacity .28s ease, visibility .28s;}
    .modal.open{opacity:1;visibility:visible;}
    .modal-bg{position:absolute;inset:0;background:rgba(16,36,62,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
    .modal-panel{position:relative;z-index:2;width:100%;max-width:560px;max-height:calc(100vh - 48px);overflow-y:auto;background:#fff;border-radius:20px;padding:40px 38px 34px;transform:translateY(24px) scale(.98);opacity:0;transition:transform .35s cubic-bezier(.2,.7,.3,1), opacity .35s;box-shadow:0 40px 90px -30px rgba(16,36,62,.6);}
    .modal.open .modal-panel{transform:none;opacity:1;}
    .modal-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#687585;background:none;border:0;cursor:pointer;transition:all .2s;}
    .modal-close:hover{background:#eef5fb;color:#10243e;transform:rotate(90deg);}
    .modal-eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.2em;color:#2f6fae;text-transform:uppercase;margin-bottom:12px;}
    .modal h3{font-size:24px;font-weight:800;letter-spacing:-1.2px;line-height:1.3;margin:0 0 10px;color:#10243e;}
    .modal .modal-sub{font-size:13.5px;color:#687585;margin-bottom:26px;line-height:1.6;}
    .type-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px;padding:6px;background:#eef5fb;border-radius:12px;}
    .type-tabs button{padding:10px 6px;border-radius:8px;font-size:12px;font-weight:700;color:#687585;background:none;border:0;cursor:pointer;transition:all .2s;}
    .type-tabs button.active{background:#fff;color:#2f6fae;box-shadow:0 4px 12px -6px rgba(16,36,62,.2);}
    .form-row{margin-bottom:16px;}
    .form-row label{display:block;font-size:12px;font-weight:700;color:#10243e;margin-bottom:7px;}
    .form-row label .req{color:#d9534f;margin-left:2px;}
    .form-row input,.form-row select,.form-row textarea{width:100%;padding:12px 14px;font-family:inherit;font-size:14px;color:#17202a;border:1px solid #dfe5eb;border-radius:10px;background:#fff;transition:border-color .2s, box-shadow .2s;outline:none;}
    .form-row textarea{resize:vertical;min-height:110px;line-height:1.6;}
    .form-row input:focus,.form-row select:focus,.form-row textarea:focus{border-color:#2f6fae;box-shadow:0 0 0 4px rgba(47,111,174,.12);}
    .form-row input::placeholder,.form-row textarea::placeholder{color:#9aa5b8;}
    .form-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .form-agree{display:flex;align-items:flex-start;gap:10px;font-size:12.5px;color:#687585;margin:6px 0 22px;line-height:1.55;}
    .form-agree input{width:16px;height:16px;margin-top:3px;accent-color:#2f6fae;flex-shrink:0;}
    .modal-actions{display:flex;gap:10px;}
    .modal-actions .btn{flex:1;justify-content:center;}
    .modal-success{text-align:center;padding:20px 0 6px;display:none;}
    .modal-success.show{display:block;}
    .modal-success .ic{font-size:52px;margin-bottom:16px;animation:pop .5s cubic-bezier(.2,.9,.3,1.4);}
    @keyframes pop{0%{transform:scale(0);}100%{transform:scale(1);}}
    .modal-success h3{font-size:22px;margin-bottom:10px;color:#10243e;}
    .modal-success p{font-size:14px;color:#687585;margin-bottom:26px;}
    body.modal-lock{overflow:hidden;position:fixed;width:100%;}
    @media(max-width:520px){.form-2col{grid-template-columns:1fr;}}
    @media(max-width:620px){
      .modal{padding:0;}
      .modal-panel{max-width:none;width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:32px 22px 26px;}
      .type-tabs{grid-template-columns:repeat(2,1fr);}
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ---------- 2) 모달 HTML 주입 ---------- */
  const HTML = `
    <div class="modal" id="contactModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-bg" data-close></div>
      <div class="modal-panel">
        <button class="modal-close" data-close aria-label="닫기">✕</button>

        <div id="modalFormWrap">
          <span class="modal-eyebrow">CONTACT US</span>
          <h3 id="modalTitle">무엇이든지 물어보세요</h3>
          <p class="modal-sub">궁금한 점이나 진행 중인 프로젝트를 남겨주시면, 담당자가 확인 후 연락드립니다.</p>

          <form id="contactForm" novalidate>
            <div class="type-tabs" id="typeTabs">
              <button type="button" data-type="사업 문의" class="active">사업 문의</button>
              <button type="button" data-type="기술 문의">기술 문의</button>
              <button type="button" data-type="서비스 문의">서비스 문의</button>
              <button type="button" data-type="추천업체 문의">추천업체 문의</button>
            </div>
            <input type="hidden" name="type" id="typeField" value="사업 문의" />

            <div class="form-2col">
              <div class="form-row">
                <label for="cName">이름 <span class="req">*</span></label>
                <input type="text" id="cName" name="name" placeholder="홍길동" required />
              </div>
              <div class="form-row">
                <label for="cCompany">회사 / 소속</label>
                <input type="text" id="cCompany" name="company" placeholder="(선택)" />
              </div>
            </div>

            <div class="form-2col">
              <div class="form-row">
                <label for="cPhone">연락처 <span class="req">*</span></label>
                <input type="tel" id="cPhone" name="phone" placeholder="010-0000-0000" required />
              </div>
              <div class="form-row">
                <label for="cEmail">이메일 <span class="req">*</span></label>
                <input type="email" id="cEmail" name="email" placeholder="name@example.com" required />
              </div>
            </div>

            <div class="form-row">
              <label for="cSubject">문의 주제</label>
              <select id="cSubject" name="subject">
                <option>설계·시공·견적</option>
                <option>유지관리·A/S</option>
                <option>기술 콘텐츠·앱</option>
                <option>매거진·도서출판</option>
                <option>추천업체 문의</option>
                <option>기타</option>
              </select>
            </div>

            <div class="form-row">
              <label for="cMessage">문의 내용 <span class="req">*</span></label>
              <textarea id="cMessage" name="message" placeholder="문의 내용을 자유롭게 남겨주세요." required></textarea>
            </div>

            <label class="form-agree">
              <input type="checkbox" id="cAgree" required />
              <span>개인정보 수집 및 이용에 동의합니다. (문의 응대 목적, 완료 후 파기)</span>
            </label>

            <div class="modal-actions">
              <button type="button" class="btn secondary" data-close>취소</button>
              <button type="submit" class="btn primary" id="submitBtn">문의 보내기 →</button>
            </div>
          </form>
        </div>

        <div class="modal-success" id="modalSuccess">
          <div class="ic">✅</div>
          <h3>문의가 접수되었습니다</h3>
          <p>남겨주신 연락처로 담당자가 곧 연락드리겠습니다.<br/>감사합니다.</p>
          <button class="btn primary" data-close style="width:100%;justify-content:center;">확인</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', HTML);

  /* ---------- 3) 로직 ---------- */
  const modal    = document.getElementById('contactModal');
  const formWrap = document.getElementById('modalFormWrap');
  const success  = document.getElementById('modalSuccess');
  const form     = document.getElementById('contactForm');
  const typeField= document.getElementById('typeField');
  const tabs     = document.querySelectorAll('#typeTabs button');
  const submitBtn= document.getElementById('submitBtn');
  let lastFocus = null;

  function openModal(type){
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;

    if(type){
      typeField.value = type;
      tabs.forEach(t=>t.classList.toggle('active', t.dataset.type === type));
    }
    lastFocus = document.activeElement;
    modal.classList.add('open');
    document.body.classList.add('modal-lock');
    formWrap.style.display = '';
    success.classList.remove('show');
    setTimeout(()=>{ const f = document.getElementById('cName'); f && f.focus(); }, 260);
  }

  function closeModal(){
    const scrollY = parseInt(document.body.style.top || '0') * -1;
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
    modal.classList.remove('open');
    document.body.classList.remove('modal-lock');
    lastFocus && lastFocus.focus();
  }

  document.querySelectorAll('[data-contact]').forEach(el=>{
    el.addEventListener('click', e=>{
      e.preventDefault();
      openModal(el.dataset.contact || '사업 문의');
    });
  });

  modal.querySelectorAll('[data-close]').forEach(el=>{
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      typeField.value = t.dataset.type;
    });
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name  = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const msg   = form.message.value.trim();
    const agree = document.getElementById('cAgree').checked;

    if(!name){ alert('이름을 입력해주세요.'); form.name.focus(); return; }
    if(!phone){ alert('연락처를 입력해주세요.'); form.phone.focus(); return; }
    if(!/^\S+@\S+\.\S+$/.test(email)){ alert('이메일 형식을 확인해주세요.'); form.email.focus(); return; }
    if(!msg){ alert('문의 내용을 입력해주세요.'); form.message.focus(); return; }
    if(!agree){ alert('개인정보 수집 및 이용에 동의해주세요.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    try{
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: new FormData(form)
      });

      form.reset();
      typeField.value = '사업 문의';
      tabs.forEach((x,i)=>x.classList.toggle('active', i===0));
      formWrap.style.display = 'none';
      success.classList.add('show');

    }catch(err){
      alert('전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = '문의 보내기 →';
    }
  });

})();