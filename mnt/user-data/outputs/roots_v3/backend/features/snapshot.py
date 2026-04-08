"""
스냅샷 관련 실제 기능 코드.
"""
import difflib
from storage.database import get_connection


def take_snapshot(doc_id: int, content: str, memo: str = "") -> dict:
    """스냅샷 저장"""
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO snapshots (doc_id, content, memo) VALUES (?, ?, ?)",
        (doc_id, content, memo)
    )
    conn.commit()
    snap_id = cur.lastrowid
    conn.close()
    return get_snapshot(snap_id)


def get_snapshot(snap_id: int) -> dict | None:
    """스냅샷 단건 조회"""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, doc_id, content, memo, created_at FROM snapshots WHERE id=?",
        (snap_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_snapshots(doc_id: int) -> list[dict]:
    """특정 문서의 스냅샷 목록 (최신순, 내용 제외)"""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, memo, created_at FROM snapshots "
        "WHERE doc_id=? ORDER BY created_at DESC",
        (doc_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def diff_snapshots(snap_id_a: int, snap_id_b: int) -> dict:
    """두 스냅샷 사이의 변경 내용 비교"""
    a = get_snapshot(snap_id_a)
    b = get_snapshot(snap_id_b)

    if not a or not b:
        return {"error": "스냅샷을 찾을 수 없습니다."}

    lines_a = a["content"].splitlines(keepends=True)
    lines_b = b["content"].splitlines(keepends=True)

    diff = list(difflib.unified_diff(
        lines_a, lines_b,
        fromfile=f"스냅샷 #{snap_id_a}",
        tofile=f"스냅샷 #{snap_id_b}",
    ))

    added   = [l.rstrip() for l in diff if l.startswith("+") and not l.startswith("+++")]
    removed = [l.rstrip() for l in diff if l.startswith("-") and not l.startswith("---")]

    return {
        "added":   added,
        "removed": removed,
        "summary": f"{len(added)}줄 추가, {len(removed)}줄 삭제",
        "raw_diff": "".join(diff),
    }


def restore_snapshot(snap_id: int) -> dict | None:
    """스냅샷 내용 반환 (에디터 복원용)"""
    snap = get_snapshot(snap_id)
    if not snap:
        return None
    return {"content": snap["content"]}
