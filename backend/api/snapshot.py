from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import snapshot as snap_feature

router = APIRouter()


class TakeBody(BaseModel):
    doc_id:  int
    content: str
    memo:    str = ""

class DiffBody(BaseModel):
    snapshot_id_a: int
    snapshot_id_b: int

class RestoreBody(BaseModel):
    snapshot_id: int


@router.post("/take")
def take_snapshot(body: TakeBody):
    """스냅샷 찍기"""
    snap = snap_feature.take_snapshot(body.doc_id, body.content, body.memo)
    return {"status": "ok", "data": snap}


@router.get("/list/{doc_id}")
def list_snapshots(doc_id: int):
    """특정 문서의 스냅샷 목록"""
    snaps = snap_feature.list_snapshots(doc_id)
    return {"status": "ok", "data": snaps}


@router.get("/{snapshot_id}")
def get_snapshot(snapshot_id: int):
    """스냅샷 내용 조회"""
    snap = snap_feature.get_snapshot(snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail="스냅샷을 찾을 수 없습니다.")
    return {"status": "ok", "data": snap}


@router.post("/diff")
def diff_snapshots(body: DiffBody):
    """두 스냅샷 비교"""
    result = snap_feature.diff_snapshots(body.snapshot_id_a, body.snapshot_id_b)
    return {"status": "ok", "data": result}


@router.post("/restore")
def restore_snapshot(body: RestoreBody):
    """스냅샷으로 복원"""
    result = snap_feature.restore_snapshot(body.snapshot_id)
    if not result:
        raise HTTPException(status_code=404, detail="스냅샷을 찾을 수 없습니다.")
    return {"status": "ok", "data": result}
