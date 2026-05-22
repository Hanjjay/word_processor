================================================================
  Roots - 작가를 위한 글쓰기 프로그램
  프로젝트 파일 구조 및 설명
  최종 업데이트: 2025-05
================================================================

▶ 전체 구조
────────────────────────────────────────────────────────────────

word_processor/
├── backend/                 Python 담당 (FastAPI 서버 + 기능 코드)
├── frontend/                React 담당 (UI 화면)
├── workspace/               문서 저장 폴더 (자동 생성)
└── roots_파일설명.txt       이 파일


================================================================
  설치 방법
================================================================

■ 백엔드 (Python)
────────────────────────────────────────────────────────────────

 

  requirements.txt 내용:
    fastapi
    uvicorn[standard]
    python-docx
    weasyprint


────────────────────────────────────────────────────────────────

■ 프론트엔드 (Node.js / React)
────────────────────────────────────────────────────────────────

  cd frontend
  npm install



  BACKEND (Python + FastAPI)
================================================================

■ backend/main.py
  역할 : FastAPI 서버 진입점
  하는 일:
    - FastAPI 앱 생성 + CORS 설정
    - 라우터 등록 (project, section, document, snapshot, export, explorer, memo)
    - 앱 시작 시 DB 초기화
    - workspace 폴더 자동 생성
  실행 : python main.py → localhost:8000
  확인 : http://localhost:8000/docs

────────────────────────────────────────────────────────────────

■ backend/storage/database.py
  역할 : SQLite DB 연결 + 테이블 생성
  DB 파일 : backend/storage/roots.db (자동 생성)
  테이블:
    projects       — 작품 단위 프로젝트
    sections       — 계층 폴더 (PRE-DRAFT / DRAFT / POST-DRAFT / Act / 장면)
    documents      — 실제 문서 내용
    snapshots      — 스냅샷 이력
    memos          — 문서별 메모
    corkboard_cards— 코르크보드 카드
    characters     — 캐릭터 정보
    pomodoro_log   — 뽀모도로 기록

────────────────────────────────────────────────────────────────

[ API 폴더 ]

■ backend/api/project.py
  GET  /project/list           → 프로젝트 목록
  POST /project/create         → 프로젝트 생성 (기본 섹션 자동 생성)
  GET  /project/{id}           → 단건 조회
  PATCH /project/{id}          → 수정
  DELETE /project/{id}         → 삭제 (CASCADE)
  GET  /project/{id}/tree      → 섹션 트리 + 문서 목록

■ backend/api/section.py
  POST /section/create         → 섹션 생성
  PATCH /section/{id}          → 이름·타입 수정
  PATCH /section/{id}/move     → 다른 부모로 이동
  POST /section/reorder        → 순서 변경
  DELETE /section/{id}         → 삭제 (CASCADE)

■ backend/api/document.py
  POST /document/new           → 새 문서 생성
  GET  /document/list          → 섹션별 문서 목록
  GET  /document/list-all      → 프로젝트 전체 문서
  GET  /document/{id}          → 단건 조회
  POST /document/save          → 전체 저장
  POST /document/autosave      → 자동 저장 (내용만)
  PATCH /document/{id}/move    → 섹션 이동
  POST /document/reorder       → 순서 변경
  DELETE /document/{id}        → 삭제

■ backend/api/snapshot.py     → 스냅샷 관련
■ backend/api/export.py       → Word/PDF 내보내기
■ backend/api/explorer.py     → 파일 트리 + 파일 읽기
■ backend/api/memo.py         → 메모 관련

────────────────────────────────────────────────────────────────

[ Features 폴더 ]

■ backend/features/project.py  → 프로젝트 CRUD 실제 처리
■ backend/features/section.py  → 섹션 CRUD
■ backend/features/document.py → 문서 CRUD (SQLite만 저장)
■ backend/features/snapshot.py → 스냅샷 저장·비교·복원
■ backend/features/export.py   → docx/pdf 변환


================================================================
  FRONTEND (React + Vite)
================================================================

■ frontend/src/main.jsx         → React 앱 시작점
■ frontend/src/App.jsx          → 최상위: DndContext + PanelGroup + 상태 관리
■ frontend/src/App.css          → 전체 레이아웃
■ frontend/src/api.js           → 모든 fetch 함수 모음

────────────────────────────────────────────────────────────────

[ Sidebar 컴포넌트 ]

■ Sidebar.jsx         → 사이드바 전체 (프로젝트 선택 + 트리)
■ Sidebar.css
■ ProjectSelector.jsx → 상단 프로젝트 드롭다운
■ ProjectSelector.css
■ ProjectTree.jsx     → 섹션·문서 트리 (DnD 포함)
■ ProjectTree.css

────────────────────────────────────────────────────────────────

[ Editor 컴포넌트 ]

■ Editor.jsx
  역할 : 에디터 영역 전체 조합
  포함:
    - MenuBar (상단 메뉴)
    - Breadcrumb (경로 표시)
    - Toolbar (서식 툴바)
    - EditorPane x1 or x2 (분할 화면)
    - DroppablePane (사이드바 드롭존 인라인 정의)
  단축키:
    F3      → 일반 ↔ 마크다운 모드 전환
    Ctrl+S  → 저장

■ EditorPane.jsx 
  역할 : TipTap 에디터 단일 패널
  하는 일:
    - TipTap 에디터 초기화 (StarterKit + Markdown + Placeholder + Typography)
    - 일반 모드: enableInputRules=false (# 타이핑해도 변환 안 됨)
    - 마크다운 모드: enableInputRules=true (# → H1 등 변환)
    - 모드 전환 시 editorKey 증가 → 에디터 재생성 (enableInputRules 반영)
    - isModeSwitching ref → 모드 전환 시 DB 재로드 방지 (롤백 방지)
    - jsonRef → 모드 전환 시 JSON으로 복원 (빈줄 보존)
    - cursorRef → 모드 전환 후 커서 위치 복원
    - 3초 자동 저장
    - 수동 저장 (window.__activePaneSave)

■ MenuBar.jsx       → 상단 메뉴바 (파일/편집/보기/서식/검토/도구/도움말)
■ Breadcrumb.jsx    → 경로 표시 (DRAFT > 초고 V1 > Act 1 > 문서명)
■ Toolbar.jsx       → 서식 툴바 (모드 선택, B/I/U, 저장, 스냅샷, 분할)
■ StatusBar.jsx     → 하단 상태바 (글자수, 모드, 저장 상태)

■ TipTapEditor.css  → TipTap 렌더링 스타일
                      (헤딩, 단락, 코드, 인용, 목록, 수평선 등)
■ EditorDropZone.css→ 드롭존 스타일 (드래그 중 하이라이트)


  실행 방법
================================================================

  터미널 1 — 백엔드:
    cd backend
    python main.py

  터미널 2 — 프론트엔드:
    cd frontend
    npm run dev


================================================================
  단축키
================================================================

  F3              일반 ↔ 마크다운 모드 전환
  Ctrl+S          저장
  Ctrl+B          사이드바 열기/닫기 (MenuBar 기능 시)
  # + 스페이스    제목 1 (마크다운 모드)
  ## + 스페이스   제목 2 (마크다운 모드)
  **텍스트**      굵게 (마크다운 모드)
  *텍스트*        기울임 (마크다운 모드)
  - + 스페이스    글머리 목록 (마크다운 모드)
  ``` + Enter     코드블록 (마크다운 모드)
  > + 스페이스    인용문 (마크다운 모드)
  ---             구분선 (마크다운 모드)


================================================================
  파일 저장 위치
================================================================

  DB 파일    : backend/storage/roots.db
  문서 파일  : SQLite에만 저장 (별도 .docx 없음)

================================================================ 
 ── 전체 한번에 설치 ─────────────────────────────────────────
  cd backend
  pip install -r requirements.txt

  실행:
    python main.py

  cd frontend\src
  npm install \
    @tiptap/react \
    @tiptap/starter-kit \
    @tiptap/extension-placeholder \
    @tiptap/extension-typography \
    tiptap-markdown \
    @dnd-kit/core \
    @dnd-kit/sortable \
    @dnd-kit/utilities \
    react-resizable-panels

  실행:
    npm run dev
    → http://localhost:5173


================================================================


찬호를 위한 커밋