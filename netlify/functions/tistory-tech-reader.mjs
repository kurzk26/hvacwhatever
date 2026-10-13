import { getFullPost, getFeedPosts, escapeHtml } from '../../lib/tistory.mjs';
import { BOARDS, isBoard } from '../../lib/categories.mjs';

function send(body, status=200, cache=false) {
  return new Response(body, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': 'noindex, follow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...(cache ? { 'Netlify-CDN-Cache-Control': 'public, durable, max-age=300, stale-while-revalidate=600' } : {}),
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"
  }});
}

function articleDoc(post, board) {
  const def = BOARDS[board];
  const date = post.published && !Number.isNaN(Date.parse(post.published))
    ? new Date(post.published).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year:'numeric', month:'long', day:'numeric' }) : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow"><title>${escapeHtml(post.title)} | ${escapeHtml(def.label)} | HVAC WHATEVER</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f4f7fa;color:#25384a;font-family:Pretendard,'Noto Sans KR',system-ui,sans-serif;line-height:1.85;word-break:keep-all}
  a{color:#197caf}.header{background:#fff;border-bottom:1px solid #dce5ed;padding:20px max(20px,calc((100% - 1100px)/2));display:flex;gap:20px;justify-content:space-between;flex-wrap:wrap;align-items:center}
  .logo{font-weight:850;text-decoration:none;color:#142d47}.logo b{color:#2486bc}.header nav{display:flex;gap:20px;font-size:13px}
  main{max-width:900px;margin:40px auto 90px;padding:0 20px}.back{font-size:13px;text-decoration:none;font-weight:750}article{background:white;border:1px solid #dce5ed;border-radius:16px;padding:clamp(24px,5vw,62px);margin-top:18px}
  .kicker{color:#2783b7;font-size:12px;letter-spacing:1px;font-weight:800}h1{font-size:clamp(26px,4vw,39px);color:#142d47;line-height:1.4;letter-spacing:-1.1px;margin:12px 0 16px}
  .date{color:#758698;font-size:13px}.source{background:#eef7fc;border-left:3px solid #2783b7;margin:30px 0;padding:17px 20px;font-size:14px}
  .content{font-size:16px;overflow-wrap:anywhere}.content img{max-width:100%;height:auto;border-radius:8px}.content table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.content td,.content th{border:1px solid #dde7ed;padding:10px}
  .content h2,.content h3{color:#142d47;line-height:1.5}.content h2{margin-top:44px;padding-bottom:12px;border-bottom:1px solid #e2eaf0}.content pre{white-space:pre;overflow-x:auto;background:#f2f6f9;padding:16px}.content blockquote{border-left:3px solid #2783b7;margin:20px 0;padding:12px 20px;background:#f4f8fc}
  .notice{background:#fffbeb;border:1px solid #eedaa2;padding:14px;border-radius:8px;font-size:13px}.foot{border-top:1px solid #e2eaf0;margin-top:35px;padding-top:20px;color:#718293;font-size:13px}
  @media(max-width:600px){main{margin-top:20px}.content{font-size:15px}}
  </style></head><body>
  <header class="header"><a class="logo" href="/">HVAC <b>WHATEVER.</b></a><nav><a href="/data">기술자료</a><a href="${def.route}">${escapeHtml(def.label)}</a></nav></header>
  <main><a class="back" href="${def.route}">← ${escapeHtml(def.label)} 게시판으로</a>
  <article><div class="kicker">TECHNICAL DATA · ${def.number}</div><h1>${escapeHtml(post.title)}</h1>${date ? `<div class="date">${escapeHtml(date)}</div>` : ''}
  <aside class="source">원문 출처: <strong>에어컨 무엇이든지 물어보세요 티스토리</strong><br><a href="${escapeHtml(post.originalUrl)}" target="_blank" rel="noopener noreferrer">티스토리 원문 보기 ↗</a></aside>
  ${post.complete ? '' : '<p class="notice">원문 전체를 가져오지 못했을 수 있습니다. 누락된 내용은 티스토리 원문에서 확인하세요.</p>'}
  <div class="content">${post.html || '<p>본문을 불러오지 못했습니다. 원문 링크를 이용해 주세요.</p>'}</div><div class="foot">© 에어컨 무엇이든지 물어보세요 · HVAC WHATEVER</div>
  </article></main></body></html>`;
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return send('Method Not Allowed', 405);
  const { board, id } = context?.params || {};
  if (!isBoard(board) || !id) return send('잘못된 게시판 또는 글 경로입니다.', 404);
  try {
    // 가능한 한 RSS 카테고리 일치 여부를 검사합니다.
    // RSS 목록 범위 밖의 과거 글은 원문 페이지에서 그대로 읽을 수 있습니다.
    const posts = await getFeedPosts();
    const known = posts.find(p => p.id === id);
    if (!known || known.board !== board) return send('현재 공개 RSS에서 해당 게시판의 글을 확인할 수 없습니다.', 404);
  } catch (error) {
    console.error('TISTORY_READER_VERIFY_FAILURE:', error);
    return send('글의 카테고리를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', 503);
  }
  try {
    const post = await getFullPost(id);
    return send(articleDoc(post, board), 200, Boolean(post.html));
  } catch (error) {
    console.error('TISTORY_TECH_READER_FAILURE:', error);
    return send(`<html lang="ko"><meta charset="utf-8"><meta name="robots" content="noindex"><body style="padding:40px;font-family:sans-serif"><h1>글을 불러오지 못했습니다.</h1><a href="${BOARDS[board].route}">게시판으로 돌아가기</a></body></html>`, 502);
  }
}
export const config = { path: '/tech/read/:board/:id' };
