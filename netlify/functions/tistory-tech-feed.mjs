import { getFeedPosts, publicPost } from '../../lib/tistory.mjs';
import { isBoard, BOARDS } from '../../lib/categories.mjs';

const json = (payload, status = 200, cached = false) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...(cached ? { 'Netlify-CDN-Cache-Control': 'public, durable, max-age=300, stale-while-revalidate=600' } : {})
  }
});

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'GET만 지원합니다.' }, 405);
  const url = new URL(request.url);
  const board = url.searchParams.get('board');
  if (!isBoard(board)) return json({ error: '8개 게시판 중 하나를 선택해야 합니다.' }, 400);
  try {
    // Diagnose filtered RSS results without exposing raw article bodies.
    const debug = url.searchParams.get('debug') === '1';
    const diagnostics = {};
    const allPosts = await getFeedPosts(debug ? diagnostics : null);
    const posts = allPosts.filter(p => p.board === board).map(publicPost);
    const payload = { board, label: BOARDS[board].label, source: 'Tistory RSS', posts };
    if (debug) payload.diagnostics = diagnostics;
    return json(payload, 200, !debug);
  } catch (error) {
    console.error('TISTORY_TECH_FEED_FAILURE:', error);
    return json({ error: '게시글을 불러올 수 없습니다. RSS 공개 및 Netlify 환경변수를 확인하세요.' }, 502);
  }
}
export const config = { path: '/api/tistory-tech' };
