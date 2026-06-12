"""
features/document.py — 문서 관련 기능 코드 (v2)

문서는 실제 글이 담기는 단위.
project_id 필수, section_id 는 선택 (없으면 프로젝트 루트).
저장은 SQLite만 사용 (v1의 .docx 이중 저장 제거).
"""
import json
from pathlib import Path
from storage.database import get_connection

# workspace 폴더 (내보내기 전용)
WORKSPACE_DIR = Path(__file__).parent.parent.parent / "workspace"


def create_document(project_id: int, section_id: int = None,
                    title: str = "제목 없음", mode: str = "일반") -> dict:
    """새 문서 생성"""
    conn = get_connection()

    row = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order "
        "FROM documents WHERE project_id=? AND section_id IS ?",
        (project_id, section_id)
    ).fetchone()
    next_order = row["next_order"] if row else 0

    cur = conn.execute(
        """INSERT INTO documents (project_id, section_id, title, mode, sort_order)
           VALUES (?, ?, ?, ?, ?)""",
        (project_id, section_id, title, mode, next_order)
    )
    doc_id = cur.lastrowid
    conn.commit()
    conn.close()
    return get_document(doc_id)


def get_document(doc_id: int) -> dict | None:
    """문서 단건 조회"""
    conn = get_connection()
    row = conn.execute(
        """SELECT id, project_id, section_id, title, content, content_json,
                  mode, word_count, sort_order, created_at, updated_at
           FROM documents WHERE id=?""",
        (doc_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    doc = dict(row)
    if doc["content_json"]:
        try:
            doc["content_json"] = json.loads(doc["content_json"])
        except (TypeError, ValueError):
            doc["content_json"] = None
    return doc


def list_documents(project_id: int, section_id: int = None) -> list[dict]:
    """
    특정 섹션(또는 프로젝트 루트)의 문서 목록.
    section_id=None이면 프로젝트 루트 문서 반환.
    """
    conn = get_connection()
    rows = conn.execute(
        """SELECT id, section_id, title, mode, word_count, updated_at
           FROM documents
           WHERE project_id=? AND section_id IS ?
           ORDER BY sort_order, updated_at DESC""",
        (project_id, section_id)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def list_all_documents(project_id: int) -> list[dict]:
    """프로젝트 내 전체 문서 목록 (섹션 무관)"""
    conn = get_connection()
    rows = conn.execute(
        """SELECT d.id, d.section_id, d.title, d.mode,
                  d.word_count, d.updated_at, s.name AS section_name
           FROM documents d
           LEFT JOIN sections s ON s.id = d.section_id
           WHERE d.project_id=?
           ORDER BY d.updated_at DESC""",
        (project_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_document(doc_id: int, title: str, content: str, mode: str,
                  content_json: dict | list | None = None) -> dict:
    """문서 전체 저장 (제목·내용·모드·TipTap JSON)"""
    word_count = _count_words(content)
    content_json_str = json.dumps(content_json, ensure_ascii=False) if content_json is not None else None
    conn = get_connection()
    conn.execute(
        """UPDATE documents
           SET title=?, content=?, content_json=?, mode=?, word_count=?,
               updated_at=datetime('now','localtime')
           WHERE id=?""",
        (title, content, content_json_str, mode, word_count, doc_id)
    )
    # 프로젝트 수정 시간도 갱신
    row = conn.execute("SELECT project_id FROM documents WHERE id=?", (doc_id,)).fetchone()
    if row:
        conn.execute(
            "UPDATE projects SET updated_at=datetime('now','localtime') WHERE id=?",
            (row["project_id"],)
        )
    conn.commit()
    conn.close()
    return get_document(doc_id)


def autosave_document(doc_id: int, content: str, content_json: dict | list | None = None) -> bool:
    """자동 저장 — 내용·단어 수·TipTap JSON만 업데이트"""
    word_count = _count_words(content)
    content_json_str = json.dumps(content_json, ensure_ascii=False) if content_json is not None else None
    conn = get_connection()
    conn.execute(
        """UPDATE documents
           SET content=?, content_json=?, word_count=?,
               updated_at=datetime('now','localtime')
           WHERE id=?""",
        (content, content_json_str, word_count, doc_id)
    )
    conn.commit()
    conn.close()
    return True


def move_document(doc_id: int, new_section_id: int = None) -> dict | None:
    """문서를 다른 섹션으로 이동"""
    conn = get_connection()
    conn.execute(
        "UPDATE documents SET section_id=? WHERE id=?",
        (new_section_id, doc_id)
    )
    conn.commit()
    conn.close()
    return get_document(doc_id)


def reorder_documents(sibling_ids: list[int]) -> bool:
    """같은 섹션 안 문서 순서 변경"""
    conn = get_connection()
    for order, did in enumerate(sibling_ids):
        conn.execute("UPDATE documents SET sort_order=? WHERE id=?", (order, did))
    conn.commit()
    conn.close()
    return True


def delete_document(doc_id: int) -> bool:
    """문서 삭제 (스냅샷, 메모, 코르크보드 카드 CASCADE 삭제)"""
    conn = get_connection()
    conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()
    return True


def count_text(content: str) -> dict:
    """글자 수 / 단어 수 / 줄 수 계산"""
    no_space = content.replace(" ", "").replace("\n", "").replace("\t", "")
    words    = [w for w in content.split() if w]
    lines    = content.split("\n")
    return {
        "chars":          len(content),
        "chars_no_space": len(no_space),
        "words":          len(words),
        "lines":          len(lines),
    }


# ── 내부 유틸 ─────────────────────────────────────────

def _count_words(content: str) -> int:
    """저장 시 단어 수 자동 계산"""
    return len([w for w in content.split() if w])
