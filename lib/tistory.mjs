import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
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

export async function getFeedPosts() {
  const origin = configuredOrigin();
  const feedUrl = new URL('/rss', origin);
  const xml = await getText(feedUrl, MAX_RSS_SIZE);
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  if (!rawItems) {
    if (parsed?.rss?.channel) return [];
    throw new Error('티스토리 RSS 형식을 읽지 못했습니다. /rss 주소와 공개 설정을 확인하세요.');
  }
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const posts = [];
  const seen = new Set();
  for (const item of items) {
    const url = validatedLink(scalar(item.link), origin);
    if (!url || !ensurePostPath(url.pathname)) continue;
    const key = readerKeyFor(url.href);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const content = scalar(item['content:encoded']) || scalar(item.description);
    const rawCategory = Array.isArray(item.category) ? item.category.map(scalar) : [scalar(item.category)];
    const board = boardForCategory(rawCategory);
    const category = cleanText(rawCategory.find(v => boardForCategory(v) === board) || rawCategory[0], 100) || '미분류';
    const title = cleanText(scalar(item.title), 240) || '제목 없음';
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
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

export function publicPost(post) {
  const { id, title, category, board, date, excerpt, thumbnail, originalUrl } = post;
  return { id, title, category, board, date, excerpt, thumbnail, originalUrl,
    readerUrl: board ? `/tech/read/${board}/${id}` : null };
}

export function safeArticleHTML(rawHtml, originUrl) {
  const origin = new URL(originUrl);
  return sanitizeHtml(rawHtml || '', {
    allowedTags: [
      'h1','h2','h3','h4','h5','h6','p','br','hr','strong','b','em','i','u','s','del',
      'blockquote','pre','code','ul','ol','li','figure','figcaption','img','div','span',
      'table','thead','tbody','tfoot','tr','th','td','sup','sub','details','summary','a'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'loading'],
      th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], code: ['class']
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: {
      a: (_tag, attribs) => {
        const href = attribs.href || '';
        let safe = '';
        try {
          const url = new URL(href, origin);
          if (['https:', 'mailto:'].includes(url.protocol)) safe = url.href;
        } catch { /* ignore */ }
        return { tagName: 'a', attribs: safe ? {
          href: safe, target: '_blank', rel: 'noopener noreferrer'
        } : {} };
      },
      img: (_tag, attribs) => {
        const src = mediaUrl(attribs['data-src'] || attribs['data-url'] || attribs.src, origin);
        return { tagName: 'img', attribs: src ? {
          src, alt: String(attribs.alt || '').slice(0, 240), loading: 'lazy'
        } : {} };
      }
    },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src
  });
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
