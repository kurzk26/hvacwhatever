// 각 페이지에서 <body data-page="home"> 형태로 지정
(function(){
  const page = document.body.dataset.page || '';
  const NAV = [
    { id:'about',      href:'about.html',      label:'ABOUT' },
    { id:'consumer',   href:'consumer.html',   label:'소비자 정보' },
    { id:'data',       href:'data.html',       label:'기술자료' },
    { id:'calculator', href:'calculator.html', label:'기술도구' },
    { id:'magazine',   href:'magazine.html',   label:'기술 매거진' },
    { id:'book',       href:'book.html',       label:'최신서적' },
    { id:'related',    href:'related.html',    label:'관련 링크' },
  ];

  const navHTML = NAV.map(n =>
    `<a href="${n.href}" class="${page===n.id?'active':''}">${n.label}</a>`
  ).join('');

  const headerHTML = `
  <header>
    <div class="container nav">
      <a class="logo" href="index.html">에어컨 무엇이든지 물어보세요</a>
      <button class="menu-btn" aria-label="메뉴 열기" onclick="toggleMenu()">☰</button>
      <nav id="mainNav">${navHTML}</nav>
    </div>
  </header>`;

  const footerHTML = `
 <footer>
  <div class="container">

    <!-- 상단: 로고 + 메뉴 -->
    <div class="footer-top">
      <div class="footer-brand">
        에어컨 무엇이든지 물어보세요
        <small>HVAC WHATEVER</small>
      </div>

      <nav class="footer-nav">
        <a href="about.html">ABOUT</a>
        <a href="consumer.html">소비자 정보</a>
        <a href="data.html">기술자료</a>
        <a href="calculator.html">기술도구</a>
        <a href="magazine.html">기술 매거진</a>
        <a href="book.html">최신서적</a>
        <a href="related.html">관련 링크</a>
      </nav>
    </div>

    <!-- 회사 정보 -->
    <div class="footer-info">
      <p>
        대표: 곽현경
        <span class="sep">|</span>
        사업자등록번호: 375-21-0217298
      </p>
      <p>
        주소: 경기도 광명시 안재로 10번길 30, 1층 (하안동) <span class="sep">|</span> 전화번호: <a href="tel:050714259310">0507-1425-9310</a>
        <span class="sep">|</span>
        이메일: <a href="mailto:kurzk26@gmail.com">kurzk26@gmail.com</a>
      </p>
    </div>

    <!-- 법적 링크 + 저작권 -->
    <div class="footer-bottom">
      <div class="footer-links">
        <a href="terms.html">이용약관</a>
        <a href="privacy.html" class="strong">개인정보처리방침</a>
        <a href="email-refuse.html">이메일무단수집거부</a>
      </div>
      <p class="footer-copy">© 에어컨 무엇이든지 물어보세요. All rights reserved.</p>
    </div>

  </div>
</footer>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
  document.body.insertAdjacentHTML('beforeend', footerHTML);
})();