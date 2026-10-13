# airplan.at 티스토리 기술자료 8개 게시판 — 통합본

## 상태
원본 hvacwhatever.zip의 HTML/CSS/JS를 실제로 병합한 Netlify 소스입니다. 웹사이트 **운영 배포는 하지 않았습니다.**

## 게시판 매핑
| 티스토리 상위 카테고리 | 하위 카테고리 | airplan.at 게시판 |
|---|---|---|
| 01 TECH — 기술 자료 | 신제품·업데이트 | /tech-news.html |
| 위와 같음 | 냉매배관 | /tech-refrigerant.html |
| 위와 같음 | 드레인배관 | /tech-drain.html |
| 위와 같음 | 보온·결로 | /tech-insulation.html |
| 위와 같음 | 전기·통신 | /tech-electric.html |
| 위와 같음 | 시공·시운전 | /tech-installation.html |
| 위와 같음 | 고장진단 | /tech-diagnosis.html |
| 위와 같음 | HVAC 해외 소식 | /tech-global.html |

카테고리 이름이 다르면 `lib/categories.mjs`의 `BOARDS`(label/aliases)를 맞춰주세요.

## 동작 구조
- 기존 각 `tech-*.html` 페이지의 디자인과 검색창은 그대로 유지하며 `js/tech.js`가 티스토리 카테고리 글만 조회합니다.
- `GET /api/tistory-tech?board=refrigerant` Netlify Function이 `https://hvacwhatever.tistory.com/rss`를 읽어 필터링합니다.
- 제목 선택 시 `GET /tech/read/refrigerant/<게시글키>` 주소가 열리고 airplan.at 사이트 안에서 본문을 읽습니다.
- 외부 글 HTML은 서버에서 정제되어 위험한 스크립트·폼·iframe을 표시하지 않습니다. 본문 위에 티스토리 원문 링크를 제공합니다.
- 복제 상세 페이지만 `noindex, follow` HTTP 헤더와 메타 태그를 사용합니다. 기술자료 목록 페이지의 검색 색인은 유지합니다.
- `Netlify-CDN-Cache-Control`으로 성공 결과를 5분 캐시합니다. 티스토리에 글을 올려도 반영이 즉시 이루어지지는 않을 수 있습니다.

## 배포 방법
1. **원본 백업** 및 현재 GitHub 저장소 백업을 확보합니다.
2. ZIP 압축 해제 후 포함된 `hvacwhatever/` 폴더를 현재 홈페이지 저장소의 프로젝트 내용과 병합합니다. `.git`과 `node_modules`는 ZIP에 포함되지 않았습니다.
3. 소스 폴더에서 `npm install`을 실행하여 의존성을 설치하고 (이후 생성된 package-lock.json을 커밋하는 것을 권장), `npm run build`로 기존 기술자료 빌드를 확인합니다.
4. Netlify의 기존 Git 배포를 통해 재배포합니다. 단순 정적 ZIP Drag & Drop만으로는 Functions가 자동 배포된다고 가정하지 마세요.
5. 티스토리 관리자에서 **8개 하위 카테고리를 생성**하고, RSS 공개 및 공개 글 개수를 최대치로 설정합니다.
6. 기본 블로그 주소는 코드에 `https://hvacwhatever.tistory.com`으로 지정되어 있습니다. Netlify 환경변수 `TISTORY_BLOG_URL`을 지정하면 재설정할 수 있습니다(티스토리 도메인만 허용).

## 확인 순서
- https://airplan.at/api/tistory-tech?board=refrigerant : JSON 형식. 냉매배관 글만 표시되는지 확인
- https://airplan.at/tech-refrigerant.html : 원래 기술자료 목록 디자인에 냉매배관 글 제목/요약 출력
- 글 클릭: airplan.at/tech/read/refrigerant/... 가 열리고 본문 표시 및 티스토리 원문 링크 확인
- 다른 7개 메뉴 각각 올바른 하위 카테고리만 표시하는지 확인
- 읽기 페이지의 응답 헤더 `X-Robots-Tag: noindex, follow` 확인

## 주의 사항
- **RSS 최신 공개 글 범위까지만 자동 목록에 표시됩니다**(일반적으로 최대 약 50개, 티스토리 설정에 따름). 장기 아카이브를 위해서는 Netlify Blobs/DB 등 별도 동기화 저장소를 추가해야 합니다.
- iframe, 동영상 임베드, 티스토리 광고 등 일부 삽입 요소는 안전을 위해 제거되어 원문과 다르게 보일 수 있습니다.
- 현재 티스토리 하위 카테고리에 글이 없으면 목록에는 '등록된 기술자료가 없습니다'라고 정상 표시됩니다.
- 기존 Decap CMS 및 `content/tech`와 `tech-data.json` 빌드 기능은 원본 보존을 위해 삭제하지 않았지만, 기술자료 페이지는 이제 그 데이터를 사용하지 않습니다.
- Netlify 배포를 실제 수행한 것은 아니며, 티스토리 RSS 응답을 직접 수신해 실검증하지 못했습니다. 게시글 공개 후 현장 확인이 필요합니다.
