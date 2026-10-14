import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { boardForCategory } from './categories.mjs';

const FETCH_TIMEOUT_MS = 9000;
const MAX_RSS_SIZE = 5_000_000;
const MAX_PAGE_SIZE = 6_000_000;

function configuredOrigin() {
  const raw = (process.env.TISTORY_BLOG_URL || 'https://hvacwhatever.tistory.com').trim();
  if (!raw) throw new Error('TISTORY_BLOG_URL 환경변수가 설정되지 않았습니다.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('TISTORY_BLOG_URL이 올바른 URL이 아닙니다.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('TISTORY_BLOG_URL은 https:// 로 시작하는 공개 블로그 주소여야 합니다.');
  }
  const name = url.hostname.toLowerCase();
  if (!(name.endsWith('.tistory.com') || name === 'hvacwhatever.tistory.com') || !name.includes('.') || name === 'localhost' || name.endsWith('.local') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(name) || name.includes(':')) {
    throw new Error('공개 호스트 이름만 사용할 수 있습니다.');
  }
  return new URL(url.origin);
}

function validatedLink(raw, blogOrigin) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim(), blogOrigin);
    if (url.hostname.toLowerCase() !== blogOrigin.hostname.toLowerCase() ||
        !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.protocol = 'https:';
    url.port = '';
    url.hash = '';
    return url;
  } catch { return null; }
}

function ensurePostPath(path) {
  if (typeof path !== 'string' || path.length > 1400 || path.includes('\\') ||
      path.includes('..') || path.includes('?') || path.includes('#') || path.includes('//')) return false;
  return /^\/(?:[0-9]+\/?|entry\/.+)$/u.test(path);
}

export function readerKeyFor(url) {
  const path = new URL(url).pathname;
  if (!ensurePostPath(path)) return null;
  return Buffer.from(path, 'utf8').toString('base64url');
}

export function postUrlFromReaderKey(key) {
  const blogOrigin = configuredOrigin();
  if (!/^[a-zA-Z0-9_-]{2,1900}$/.test(key || '')) throw new Error('게시글 주소가 올바르지 않습니다.');
  const path = Buffer.from(key, 'base64url').toString('utf8');
  if (!ensurePostPath(path)) throw new Error('게시글 경로가 허용되지 않습니다.');
  return new URL(path, blogOrigin);
}

async function getText(url, maxBytes) {
  // 외부 콘텐츠는 설정된 블로그 호스트에서만 받아옵니다. 외부 URL 프록시 기능이 아닙니다.
  const origin = configuredOrigin();
  let current = validatedLink(url.toString(), origin);
  if (!current) throw new Error('설정된 티스토리 블로그 외의 주소는 허용되지 않습니다.');
  for (let redirect = 0; redirect < 3; redirect++) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'Accept': 'text/html, application/rss+xml, application/xml, text/xml;q=0.9',
        'User-Agent': 'Airplan-HVAC-OwnBlogSyndication/1.0 (+https://airplan.at/)'
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = validatedLink(response.headers.get('location'), origin);
      if (!next) throw new Error('블로그 외부로 연결되는 리다이렉트를 차단했습니다.');
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`티스토리 요청 실패 (HTTP ${response.status})`);
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw new Error('응답 크기가 너무 큽니다.');
    const reader = response.body?.getReader();
    if (!reader) return await response.text();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('응답 용량 제한을 초과했습니다.');
      }
      chunks.push(value);
    }
    return new TextDecoder('utf-8').decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
  }
  throw new Error('리다이렉트가 너무 많습니다.');
}

function scalar(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return scalar(value[0]);
  if (value && typeof value === 'object') {
    return scalar(value.__cdata ?? value['#text'] ?? value['__text'] ?? '');
  }
  return '';
}

function visibleText(html) {
  return cheerio.load(`<main>${html || ''}</main>`)('main').text().replace(/\s+/g, ' ').trim();
}

function cleanText(text, max = 500) {
  return visibleText(String(text ?? '')).slice(0, max);
}

function mediaUrl(raw, origin) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const uri = new URL(raw.trim(), origin);
    return uri.protocol === 'https:' ? uri.href : '';
  } catch { return ''; }
}

function findCover(html, origin) {
  if (!html) return null;
  const $ = cheerio.load(html);
  const first = $('img').first();
  return mediaUrl(first.attr('data-src') || first.attr('data-url') || first.attr('src'), origin) || null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: '__cdata',
  processEntities: true,
  trimValues: false
});

export async function getFeedPosts(diagnostics = null) {
  const origin = configuredOrigin();
  const feedUrl = new URL('/rss', origin);
  const xml = await getText(feedUrl, MAX_RSS_SIZE);
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const stats = {
    feed: feedUrl.href,
    rssItemCount: 0,
    acceptedLinkCount: 0,
    rejectedLinkCount: 0,
    categoryUnmatchedCount: 0,
    boardCounts: {},
    seenCategories: [],
    skippedExamples: []
  };
  if (!rawItems) {
    if (parsed?.rss?.channel) {
      if (diagnostics) Object.assign(diagnostics, stats);
      return [];
    }
    throw new Error('티스토리 RSS 형식을 읽지 못했습니다. /rss 주소와 공개 설정을 확인하세요.');
  }
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  stats.rssItemCount = items.length;
  const categoriesSeen = new Set();
  const posts = [];
  const seen = new Set();
  for (const item of items) {
    const rawLink = scalar(item.link);
    const url = validatedLink(rawLink, origin);
    const title = cleanText(scalar(item.title), 240) || '제목 없음';
    const rawCategory = Array.isArray(item.category) ? item.category.map(scalar) : [scalar(item.category)];
    for (const category of rawCategory) {
      const value = String(category || '').trim().slice(0, 160);
      if (value && categoriesSeen.size < 40) categoriesSeen.add(value);
    }
    if (!url || !ensurePostPath(url.pathname)) {
      stats.rejectedLinkCount++;
      if (stats.skippedExamples.length < 8) stats.skippedExamples.push({
        reason: 'invalid_post_link', title: title.slice(0, 90),
        urlPath: url ? url.pathname.slice(0, 150) : String(rawLink).slice(0, 150),
        categories: rawCategory.map(v => String(v).slice(0, 150))
      });
      continue;
    }
    const key = readerKeyFor(url.href);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    stats.acceptedLinkCount++;
    const content = scalar(item['content:encoded']) || scalar(item.description);
    const board = boardForCategory(rawCategory);
    if (!board) {
      stats.categoryUnmatchedCount++;
      if (stats.skippedExamples.length < 8) stats.skippedExamples.push({
        reason: 'category_not_mapped', title: title.slice(0, 90),
        categories: rawCategory.map(v => String(v).slice(0, 150))
      });
    } else {
      stats.boardCounts[board] = (stats.boardCounts[board] || 0) + 1;
    }
    const category = cleanText(rawCategory.find(v => boardForCategory(v) === board) || rawCategory[0], 100) || '미분류';
    const date = scalar(item.pubDate);
    const millis = Date.parse(date);
    posts.push({
      id: key,
      title,
      category,
      board,
      date: Number.isFinite(millis) ? new Date(millis).toISOString() : '',
      excerpt: cleanText(content, 185),
      thumbnail: findCover(content, origin),
      originalUrl: url.href,
      _rssBody: content,
      _rssFull: Boolean(scalar(item['content:encoded']))
    });
  }
  stats.seenCategories = [...categoriesSeen];
  if (diagnostics) Object.assign(diagnostics, stats);
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

export function publicPost(post) {
  const { id, title, category, board, date, excerpt, thumbnail, originalUrl } = post;
  return { id, title, category, board, date, excerpt, thumbnail, originalUrl,
    readerUrl: board ? `/tech/read/${board}/${id}` : null };
}

// HTML sanitizer for public Tistory articles. We use cheerio's existing parser
// and serialize ONLY allowlisted elements and attributes. Do not add raw HTML
// or user-provided attributes back into the output without validating them.
const ARTICLE_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6','p','br','hr','strong','b','em','i','u','s','del',
  'blockquote','pre','code','ul','ol','li','figure','figcaption','img','div','span',
  'table','thead','tbody','tfoot','tr','th','td','sup','sub','details','summary','a'
]);
const DISCARD_TAGS = new Set([
  'script','style','template','noscript','iframe','frame','frameset','object','embed',
  'svg','math','form','input','textarea','select','option','button','link','meta',
  'base','video','audio','source','track','canvas','portal'
]);
const VOID_TAGS = new Set(['br','hr','img']);

export function safeArticleHTML(rawHtml, originUrl) {
  const origin = new URL(originUrl);
  // Parsing the HTML server-side is safe; only renderNode's serialized output
  // is exposed to visitors. Using an element wrapper makes fragments reliable.
  const $ = cheerio.load(`<section data-hvac-sanitizer="root">${String(rawHtml || '')}</section>`, {}, false);
  const root = $('[data-hvac-sanitizer="root"]').first();
  // Tistory may append its Creative Commons license badge to the article body.
  // Remove only this platform-generated badge; do not remove author-written
  // copyright discussions, ordinary links or acknowledgements in articles.
  root.find('.container_postbtn, .postbtn_ccl, .tt_ccl, .postbtn_like').remove();
  root.find('a[href]').filter((_, node) => {
    try {
      const url = new URL($(node).attr('href'), origin);
      return /(^|\.)creativecommons\.org$/i.test(url.hostname) &&
        /^\/licenses\//i.test(url.pathname);
    } catch { return false; }
  }).each((_, node) => {
    const parent = $(node).parent();
    const childCount = parent.children().length;
    // Drop an otherwise empty wrapper rather than leaving a blank CC box.
    if (childCount === 1 && parent.is('p, div, span, aside') &&
        parent.text().trim() === $(node).text().trim()) parent.remove();
    else $(node).remove();
  });


  function attr(name, value) {
    return ` ${name}="${escapeHtml(value)}"`;
  }
  function safeHref(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    try {
      const url = new URL(raw.trim(), origin);
      return ['https:', 'mailto:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function spanAttr(value) {
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 24 ? String(num) : '';
  }

  function renderNode(node, depth = 0) {
    if (!node || depth > 100) return '';
    if (node.type === 'text') return escapeHtml(node.data || '');
    if (!node.name || ['comment','directive','cdata'].includes(node.type)) return '';
    const tag = String(node.name).toLowerCase();
    if (DISCARD_TAGS.has(tag)) return '';
    const contents = (node.children || []).map(child => renderNode(child, depth + 1)).join('');
    if (!ARTICLE_TAGS.has(tag)) return contents; // harmless wrapper removed

    if (tag === 'img') {
      const src = mediaUrl(node.attribs?.['data-src'] || node.attribs?.['data-url'] || node.attribs?.src, origin);
      return src ? `<img${attr('src',src)}${attr('alt',String(node.attribs?.alt || '').slice(0,240))} loading="lazy">` : '';
    }
    if (tag === 'a') {
      const href = safeHref(node.attribs?.href);
      return href ? `<a${attr('href',href)} target="_blank" rel="noopener noreferrer">${contents}</a>` : contents;
    }
    let attributes = '';
    if (tag === 'td' || tag === 'th') {
      for (const name of ['colspan','rowspan']) {
        const val = spanAttr(node.attribs?.[name]);
        if (val) attributes += attr(name,val);
      }
    }
    if (tag === 'code' && typeof node.attribs?.class === 'string') {
      const cls = node.attribs.class.split(/\s+/).find(v => /^language-[a-z0-9_-]{1,32}$/i.test(v));
      if (cls) attributes += attr('class',cls);
    }
    if (VOID_TAGS.has(tag)) return `<${tag}${attributes}>`;
    return `<${tag}${attributes}>${contents}</${tag}>`;
  }
  return root.contents().toArray().map(node => renderNode(node)).join('');
}

function readPage(html) {
  const $ = cheerio.load(html);
  const title = cleanText(
    $('meta[property="og:title"]').attr('content') ||
    $('.post-cover h1, .article-header h1, h1.title-article, .post-header h1').first().text() ||
    $('title').first().text(), 240);
  const published = $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') || '';
  const candidates = [
    '.tt_article_useless_p_margin', '.entry-content', '.article-view',
    '.area_view', '.post-content', '.article-body', '#article-view', '.contents_style'
  ];
  for (const sel of candidates) {
    const root = $(sel).first();
    if (!root.length) continue;
    root.find('script,style,form,.adsbygoogle,.revenue_unit_wrap').remove();
    const body = root.html() || '';
    if (visibleText(body).length >= 30 || root.find('img').length > 0) {
      return { title, published, body };
    }
  }
  return { title, published, body: '' };
}

export async function getFullPost(id) {
  const sourceUrl = postUrlFromReaderKey(id);
  let page = { title: '', published: '', body: '' };
  let pageError = null;
  try {
    page = readPage(await getText(sourceUrl, MAX_PAGE_SIZE));
  } catch (error) { pageError = error; }
  let feedItem = null;
  if (!page.body || !page.title) {
    try {
      const items = await getFeedPosts();
      feedItem = items.find(item => item.id === id) || null;
    } catch { /* RSS가 실패해도 원문 읽기를 우선합니다. */ }
  }
  const content = page.body || feedItem?._rssBody || '';
  const contentSource = page.body ? 'article' : (feedItem?._rssFull ? 'rss-full' : 'rss-unknown');
  return {
    title: page.title || feedItem?.title || '티스토리 기술자료',
    published: page.published || feedItem?.date || '',
    category: feedItem?.category || 'HVAC TECHNICAL JOURNAL',
    originalUrl: sourceUrl.href,
    html: safeArticleHTML(content, sourceUrl.href),
    complete: Boolean(page.body || feedItem?._rssFull),
    contentSource,
    pageError: pageError?.message || null
  };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
