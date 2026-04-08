"""
문서 관련 실제 기능 코드.
API 레이어(api/document.py)가 이 함수들을 호출합니다.
"""
from storage.database import get_connection


def create_document() -> dict:
    """새 문서 생성"""
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO documents (title, content) VALUES (?, ?)",
        ("제목 없음", "")
    )
    conn.commit()
    doc_id = cur.lastrowid
    conn.close()
    return get_document(doc_id)


def get_document(doc_id: int) -> dict | None:
    """문서 단건 조회"""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, title, content, mode, created_at, updated_at "
        "FROM documents WHERE id = ?", (doc_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def save_document(doc_id: int, title: str, content: str, mode: str) -> dict:
    """문서 저장 (제목·내용·모드 업데이트)"""
    conn = get_connection()
    conn.execute(
        """UPDATE documents
           SET title=?, content=?, mode=?,
               updated_at=datetime('now','localtime')
           WHERE id=?""",
        (title, content, mode, doc_id)
    )
    conn.commit()
    conn.close()
    return get_document(doc_id)


def autosave_document(doc_id: int, content: str) -> bool:
    """자동 저장 — 내용만 업데이트"""
    conn = get_connection()
    conn.execute(
        """UPDATE documents
           SET content=?, updated_at=datetime('now','localtime')
           WHERE id=?""",
        (content, doc_id)
    )
    conn.commit()
    conn.close()
    return True


def list_documents() -> list[dict]:
    """문서 목록 (최신순)"""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, mode, updated_at FROM documents ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_document(doc_id: int) -> bool:
    """문서 삭제"""
    conn = get_connection()
    conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()
    return True


def count_text(content: str) -> dict:
    """글자 수 / 단어 수 / 줄 수 계산"""
    no_space = content.replace(" ", "").replace("\n", "").replace("\t", "")
    words = [w for w in content.split() if w]
    lines = content.split("\n")
    return {
        "chars":          len(content),
        "chars_no_space": len(no_space),
        "words":          len(words),
        "lines":          len(lines),
    }
