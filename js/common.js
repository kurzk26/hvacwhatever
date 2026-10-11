function toggleMenu(){
  document.getElementById('mainNav').classList.toggle('open');
}
document.addEventListener('click', e=>{
  const nav = document.getElementById('mainNav');
  if(!nav) return;
  const link = e.target.closest('#mainNav a');
  if(link) nav.classList.remove('open');
});

function comingSoon(e){
  e.preventDefault();
  alert('현재 준비 중인 메뉴입니다. 실제 콘텐츠 연결 시 해당 페이지로 연결할 수 있습니다.');
}
function consumerNotice(e, title){
  e.preventDefault();
  alert(title + ' 콘텐츠를 준비하고 있습니다. 실제 운영 시 상세 페이지로 연결할 수 있습니다.');
}


// 우클릭 메뉴 막기
document.addEventListener('contextmenu', event => event.preventDefault());
// 텍스트 드래그(선택) 막기
document.addEventListener('selectstart', event => event.preventDefault());
// 이미지 드래그 막기
document.addEventListener('dragstart', event => event.preventDefault());