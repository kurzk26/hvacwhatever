/* ============================================================
   Markdown → JSON 빌드 스크립트
   content/tech/*.md → tech-data.json
   ============================================================ */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'tech');
const OUTPUT_FILE = path.join(__dirname, '..', 'tech-data.json');

/* 기술자료 글 읽기 */
function buildTechData() {
  // 폴더 없으면 생성
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    console.log('📁 content/tech 폴더 생성됨');
  }

  // .md 파일 목록
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('⚠️  content/tech 폴더에 .md 파일이 없습니다');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ posts: [] }, null, 2));
    return;
  }

  const posts = files.map((file, index) => {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // Markdown → HTML
    const htmlContent = marked(content);

    // 이미지 마커 처리
    const processedContent = htmlContent.replace(
      /\[IMG(-SMALL|-MEDIUM|-LARGE)?:([^\]]+)\]/g,
      (match, size, url) => {
        const sizeClass = size === '-SMALL' ? 'small'
                        : size === '-MEDIUM' ? 'medium'
                        : size === '-LARGE' ? 'large'
                        : '';
        return `<figure class="tech-detail-figure ${sizeClass}">
                  <img src="${url.trim()}" alt="" loading="lazy">
                </figure>`;
      }
    );

    // Drive 링크 → 이미지 URL 변환
    const cover = data.cover ? driveToImgUrl(data.cover) : '';

    return {
      id: index + 1,
      카테고리: data.category || '',
      제목: data.title || '',
      작성자: data.author || '운영자',
      날짜: formatDate(data.date),
      이미지: cover,
      내용: processedContent,
      slug: file.replace('.md', '')
    };
  });

  // 최신순 정렬
  posts.sort((a, b) => new Date(b.날짜) - new Date(a.날짜));
  posts.forEach((p, i) => p.id = i + 1);

  // JSON 저장
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ posts }, null, 2), 'utf-8');
  console.log(`✅ ${posts.length}개 글 → tech-data.json 생성 완료`);
}

/* Drive 링크 → 이미지 URL */
function driveToImgUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/)
         || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!m) return url;
  return 'https://lh3.googleusercontent.com/d/' + m[1];
}

/* 날짜 포맷 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 실행
buildTechData();