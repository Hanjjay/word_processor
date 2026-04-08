# Roots — 개발 환경 설정 및 실행 방법

---

## 폴더 구조

```
roots/
├── backend/                 ← Python 담당 (FastAPI + 기능 코드)
│   ├── main.py              ← FastAPI 서버 진입점
│   ├── requirements.txt     ← Python 패키지 목록
│   ├── api/                 ← 엔드포인트 (React ↔ Python 연결)
│   │   ├── document.py
│   │   ├── snapshot.py
│   │   ├── export.py
│   │   ├── explorer.py
│   │   └── memo.py
│   ├── features/            ← 실제 기능 코드
│   │   ├── document.py
│   │   ├── snapshot.py
│   │   └── export.py
│   └── storage/
│       └── database.py      ← SQLite 연결 및 테이블 초기화
│
└── frontend/                ← React 담당 (UI)
    ├── index.html
    ├── vite.config.js
    ├── package.json         ← JS 패키지 목록
    └── src/
        ├── main.jsx         ← React 진입점
        ├── App.jsx          ← 최상위 컴포넌트 (사이드바 + 에디터 조합)
        ├── api.js           ← FastAPI 호출 유틸
        └── components/
            ├── sidebar/     ← 사이드바 영역
            │   ├── Sidebar.jsx
            │   ├── FileTree.jsx
            │   └── DocList.jsx
            └── editor/      ← 에디터 영역
                ├── Editor.jsx
                ├── A4Paper.jsx
                ├── Toolbar.jsx
                └── StatusBar.jsx

```

---

## 필요 환경

- Python 3.11 이상
- Node.js 18 이상
- npm 또는 pnpm

---

## 설치

### 1. Python 패키지 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. Node 패키지 설치

```bash
cd frontend
npm install
```

---

## 실행 (개발 모드)

터미널을 **두 개** 열어서 각각 실행하세요.

### 터미널 1 — FastAPI 백엔드

```bash
cd backend
python main.py
```

실행 확인: http://localhost:8000
API 문서:  http://localhost:8000/docs

### 터미널 2 — React 프론트엔드

```bash
cd frontend
npm run dev
```

실행 확인: http://localhost:5173

---

## 통신 구조

```
브라우저 (localhost:5173)
    ↓ fetch('/api/...')
Vite 프록시 (vite.config.js)
    ↓ http://localhost:8000/...
FastAPI 서버
    ↓ 함수 호출
Python 기능 코드
```

vite.config.js에 프록시가 설정되어 있어서
React에서 fetch('/api/document/list') 처럼 호출하면
자동으로 FastAPI(localhost:8000)로 전달됩니다.

---

## DB 위치

앱 최초 실행 시 자동 생성됩니다.

```
backend/storage/roots.db
```

---

## 자주 쓰는 명령어

```bash
# 백엔드 실행
cd backend && python main.py

# 프론트엔드 실행
cd frontend && npm run dev

# API 명세서 확인 (브라우저)
http://localhost:8000/docs
```
