"""
database.py — Roots DB 설계 v2

테이블 계층:
  projects
    └── sections (parent_id 자기참조로 무한 계층)
          └── documents
                ├── snapshots
                ├── memos
                └── corkboard_cards

  characters     (project 소속)
  pomodoro_log   (project 소속)
"""

import sqlite3
from pathlib import Path

# DB 파일 위치: backend/storage/roots.db
DB_PATH = Path(__file__).parent / "roots.db"


def get_connection() -> sqlite3.Connection:
    """DB 연결 반환. row_factory로 dict처럼 사용 가능."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")    # 자동저장 안전성
    conn.execute("PRAGMA foreign_keys=ON")     # FK 제약 활성화
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def init_db():
    """앱 시작 시 한 번 호출 — 테이블 없으면 자동 생성."""
    conn = get_connection()
    conn.executescript("""

    -- ── 1. 프로젝트 ───────────────────────────────────────
    -- 작가가 관리하는 작품 단위
    -- 예) "햄릿 각색", "새 시나리오 2025"
    CREATE TABLE IF NOT EXISTS projects (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL DEFAULT '새 프로젝트',
        description TEXT             DEFAULT '',
        cover_color TEXT             DEFAULT '#5b4fcf',  -- 프로젝트 대표 색상
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- ── 2. 섹션 ───────────────────────────────────────────
    -- 프로젝트 안의 계층 폴더 구조
    -- parent_id = NULL  → 최상위 섹션 (PRE-DRAFT, DRAFT, POST-DRAFT)
    -- parent_id = 숫자  → 하위 섹션  (초고 V1, Act 1, 1.2 장면 등)
    --
    -- type 값:
    --   'pre-draft'  → PRE-DRAFT 단계
    --   'draft'      → DRAFT 단계
    --   'post-draft' → POST-DRAFT 단계
    --   'act'        → Act 묶음
    --   'scene'      → 장면 (문서를 품는 최하위 폴더)
    --   'folder'     → 일반 폴더 (자유 분류용)
    CREATE TABLE IF NOT EXISTS sections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL,
        parent_id   INTEGER          DEFAULT NULL,   -- 자기참조 (상위 섹션)
        name        TEXT    NOT NULL DEFAULT '새 섹션',
        type        TEXT    NOT NULL DEFAULT 'folder',
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id)  REFERENCES sections(id) ON DELETE CASCADE
    );

    -- ── 3. 문서 ───────────────────────────────────────────
    -- 실제 글이 담기는 단위
    -- section_id가 NULL이면 프로젝트 루트에 바로 속함
    CREATE TABLE IF NOT EXISTS documents (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL,
        section_id  INTEGER          DEFAULT NULL,
        title       TEXT    NOT NULL DEFAULT '제목 없음',
        content     TEXT    NOT NULL DEFAULT '',
        mode        TEXT    NOT NULL DEFAULT '일반',   -- 일반/대본/뮤지컬 가사
        sort_order  INTEGER NOT NULL DEFAULT 0,
        word_count  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id) REFERENCES projects(id)  ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id)  ON DELETE SET NULL
    );

    -- ── 4. 스냅샷 ─────────────────────────────────────────
    -- 문서의 특정 시점 저장 (수동 저장 이력)
    CREATE TABLE IF NOT EXISTS snapshots (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        content     TEXT    NOT NULL,
        memo        TEXT             DEFAULT '',
        word_count  INTEGER          DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- ── 5. 메모 ───────────────────────────────────────────
    -- 문서에 붙는 체크리스트형 메모
    -- document_id가 NULL이면 프로젝트 전체 메모
    CREATE TABLE IF NOT EXISTS memos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL,
        document_id INTEGER          DEFAULT NULL,
        content     TEXT    NOT NULL DEFAULT '',
        is_done     INTEGER NOT NULL DEFAULT 0,  -- 0: 미완료, 1: 완료
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id)  REFERENCES projects(id)  ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    -- ── 6. 코르크보드 카드 ────────────────────────────────
    -- 문서에 연결된 코르크보드 카드
    CREATE TABLE IF NOT EXISTS corkboard_cards (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL,
        document_id INTEGER          DEFAULT NULL,   -- 연결된 문서
        title       TEXT             DEFAULT '',
        content     TEXT             DEFAULT '',
        color       TEXT             DEFAULT '#ffd700',
        pos_x       INTEGER          DEFAULT 0,
        pos_y       INTEGER          DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id)  REFERENCES projects(id)  ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    -- ── 7. 캐릭터 ─────────────────────────────────────────
    -- 프로젝트 단위 캐릭터 관리 (UI 오른쪽 패널)
    CREATE TABLE IF NOT EXISTS characters (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id   INTEGER NOT NULL,
        name         TEXT    NOT NULL DEFAULT '',
        role         TEXT             DEFAULT '',       -- 역할 설명
        description  TEXT             DEFAULT '',       -- 인물 설명
        initial_state TEXT            DEFAULT '',       -- 처음 상태
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- ── 8. 뽀모도로 로그 ──────────────────────────────────
    -- 프로젝트별 집중 시간 기록
    CREATE TABLE IF NOT EXISTS pomodoro_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL,
        mode        TEXT    NOT NULL DEFAULT 'focus',  -- focus / break
        minutes     INTEGER NOT NULL DEFAULT 25,
        completed   INTEGER NOT NULL DEFAULT 0,        -- 0: 미완료, 1: 완료
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- ── 인덱스 ────────────────────────────────────────────
    -- 자주 조회하는 컬럼에 인덱스 추가 (조회 속도 향상)
    CREATE INDEX IF NOT EXISTS idx_sections_project   ON sections(project_id);
    CREATE INDEX IF NOT EXISTS idx_sections_parent    ON sections(parent_id);
    CREATE INDEX IF NOT EXISTS idx_documents_project  ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_documents_section  ON documents(section_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_document ON snapshots(document_id);
    CREATE INDEX IF NOT EXISTS idx_memos_project      ON memos(project_id);
    CREATE INDEX IF NOT EXISTS idx_memos_document     ON memos(document_id);
    CREATE INDEX IF NOT EXISTS idx_corkboard_project  ON corkboard_cards(project_id);
    CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_project   ON pomodoro_log(project_id);

    """)
    conn.commit()
    conn.close()
    print("✅ DB 초기화 완료 (v2 — 다중 프로젝트 구조)")


def reset_db():
    """
    DB 초기화 — 기존 데이터 전부 삭제 후 새로 생성.
    개발 중에만 사용. 운영 환경에서는 절대 호출 금지.
    """
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("🗑️  기존 roots.db 삭제 완료")
    init_db()
    print("✅ 새 roots.db 생성 완료")
