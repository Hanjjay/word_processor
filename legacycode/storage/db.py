import sqlite3
import os
from pathlib import Path


class Database:
    """
    로컬 SQLite 데이터베이스.
    파일 위치: ~/Documents/Roots/roots.db
    """
    def __init__(self):
        db_dir = Path.home() / "Documents" / "Roots"
        db_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = str(db_dir / "roots.db")
        self._conn: sqlite3.Connection | None = None

    def init(self):
        """앱 시작 시 한 번 호출 — 테이블 생성"""
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")  # 자동 저장 안전성 향상
        self._conn.execute("PRAGMA synchronous=NORMAL")

        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL DEFAULT '제목 없음',
                content     TEXT    NOT NULL DEFAULT '',
                mode        TEXT    NOT NULL DEFAULT '일반',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id      INTEGER NOT NULL,
                content     TEXT    NOT NULL,
                memo        TEXT    DEFAULT '',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (doc_id) REFERENCES documents(id)
            );

            CREATE TABLE IF NOT EXISTS memos (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL DEFAULT '',
                content     TEXT    NOT NULL DEFAULT '',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS pomodoro_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                mode        TEXT    NOT NULL,   -- 'focus' or 'break'
                minutes     INTEGER NOT NULL,
                completed   INTEGER NOT NULL DEFAULT 0,  -- 1 = 완료
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );
        """)
        self._conn.commit()

    # ── 문서 ─────────────────────────────────────────────

    def save_document(self, doc_id: int, content: str) -> int:
        """문서 저장. doc_id=0이면 새 문서 생성 후 ID 반환"""
        if doc_id == 0:
            cur = self._conn.execute(
                "INSERT INTO documents (content) VALUES (?)", (content,)
            )
            self._conn.commit()
            return cur.lastrowid
        else:
            self._conn.execute(
                "UPDATE documents SET content=?, updated_at=datetime('now','localtime') WHERE id=?",
                (content, doc_id)
            )
            self._conn.commit()
            return doc_id

    def load_document(self, doc_id: int) -> dict | None:
        cur = self._conn.execute(
            "SELECT id, title, content, mode FROM documents WHERE id=?", (doc_id,)
        )
        row = cur.fetchone()
        if row:
            return {"id": row[0], "title": row[1], "content": row[2], "mode": row[3]}
        return None

    def list_documents(self) -> list[dict]:
        cur = self._conn.execute(
            "SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC"
        )
        return [{"id": r[0], "title": r[1], "updated_at": r[2]} for r in cur.fetchall()]

    # ── 스냅샷 ───────────────────────────────────────────

    def save_snapshot(self, doc_id: int, content: str, memo: str = "") -> int:
        cur = self._conn.execute(
            "INSERT INTO snapshots (doc_id, content, memo) VALUES (?,?,?)",
            (doc_id, content, memo)
        )
        self._conn.commit()
        return cur.lastrowid

    def list_snapshots(self, doc_id: int) -> list[dict]:
        cur = self._conn.execute(
            "SELECT id, memo, created_at FROM snapshots WHERE doc_id=? ORDER BY created_at DESC",
            (doc_id,)
        )
        return [{"id": r[0], "memo": r[1], "created_at": r[2]} for r in cur.fetchall()]

    def close(self):
        if self._conn:
            self._conn.close()
