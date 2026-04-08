from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from storage.database import get_connection

router = APIRouter()


class MemoBody(BaseModel):
    memo_id: int = 0     # 0이면 새 메모, 숫자면 수정
    title:   str
    content: str


@router.get("/list")
def list_memos():
    """메모 목록"""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, content, updated_at FROM memos ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return {"status": "ok", "data": [dict(r) for r in rows]}


@router.post("/save")
def save_memo(body: MemoBody):
    """메모 저장 (생성 or 수정)"""
    conn = get_connection()
    if body.memo_id == 0:
        cur = conn.execute(
            "INSERT INTO memos (title, content) VALUES (?, ?)",
            (body.title, body.content)
        )
        memo_id = cur.lastrowid
    else:
        conn.execute(
            """UPDATE memos SET title=?, content=?,
               updated_at=datetime('now','localtime') WHERE id=?""",
            (body.title, body.content, body.memo_id)
        )
        memo_id = body.memo_id
    conn.commit()
    conn.close()
    return {"status": "ok", "data": {"memo_id": memo_id}}


@router.delete("/{memo_id}")
def delete_memo(memo_id: int):
    """메모 삭제"""
    conn = get_connection()
    conn.execute("DELETE FROM memos WHERE id=?", (memo_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}
