import sqlite3
import os
from pathlib import Path

# DB 파일 위치: backend/storage/roots.db
DB_PATH = Path(__file__).parent / "roots.db"


def get_connection() -> sqlite3.Connection:
    """DB 연결 반환. 매 요청마다 호출."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row   # 결과를 dict처럼 사용 가능
    conn.execute("PRAGMA journal_mode=WAL")   # 자동저장 안전성
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """앱 시작 시 한 번 호출 — 테이블이 없으면 생성."""
    conn = get_connection()
    conn.executescript("""
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
            memo        TEXT             DEFAULT '',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL DEFAULT '',
            content     TEXT    NOT NULL DEFAULT '',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS corkboard (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id      INTEGER NOT NULL,
            title       TEXT    NOT NULL DEFAULT '',
            content     TEXT             DEFAULT '',
            color       TEXT             DEFAULT '#ffd700',
            pos_x       INTEGER          DEFAULT 0,
            pos_y       INTEGER          DEFAULT 0,
            FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pomodoro_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            mode        TEXT    NOT NULL,
            minutes     INTEGER NOT NULL,
            completed   INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        );
    """)
    conn.commit()
    conn.close()
