"""
api/document.py — 문서 관련 HTTP 엔드포인트 (v2)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import document as doc_feat

router = APIRouter()


# ── 요청 바디 모델 ────────────────────────────────────

class CreateBody(BaseModel):
    project_id: int
    section_id: int | None = None
    title:      str        = "제목 없음"
    mode:       str        = "일반"

class SaveBody(BaseModel):
    doc_id:       int
    title:        str
    content:      str
    mode:         str = "일반"
    content_json: dict | list | None = None

class AutosaveBody(BaseModel):
    doc_id:       int
    content:      str
    content_json: dict | list | None = None

class CountBody(BaseModel):
    content: str

class MoveBody(BaseModel):
    new_section_id: int | None = None

class ReorderBody(BaseModel):
    sibling_ids: list[int]


# ── 엔드포인트 ────────────────────────────────────────

@router.post("/new")
def new_document(body: CreateBody):
    """새 문서 생성"""
    doc = doc_feat.create_document(
        project_id=body.project_id,
        section_id=body.section_id,
        title=body.title,
        mode=body.mode,
    )
    return {"status": "ok", "data": doc}


@router.get("/list")
def list_documents(project_id: int, section_id: int | None = None):
    """특정 섹션(또는 루트)의 문서 목록"""
    docs = doc_feat.list_documents(project_id, section_id)
    return {"status": "ok", "data": docs}


@router.get("/list-all")
def list_all_documents(project_id: int):
    """프로젝트 전체 문서 목록"""
    docs = doc_feat.list_all_documents(project_id)
    return {"status": "ok", "data": docs}


@router.get("/{doc_id}")
def get_document(doc_id: int):
    """문서 단건 조회"""
    doc = doc_feat.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {"status": "ok", "data": doc}


@router.post("/save")
def save_document(body: SaveBody):
    """문서 전체 저장 (제목·내용·모드)"""
    doc = doc_feat.save_document(
        body.doc_id, body.title, body.content, body.mode, body.content_json
    )
    return {"status": "ok", "data": doc}


@router.post("/autosave")
def autosave_document(body: AutosaveBody):
    """자동 저장 — 내용·TipTap JSON"""
    doc_feat.autosave_document(body.doc_id, body.content, body.content_json)
    return {"status": "ok"}


@router.patch("/{doc_id}/move")
def move_document(doc_id: int, body: MoveBody):
    """문서를 다른 섹션으로 이동"""
    doc = doc_feat.move_document(doc_id, body.new_section_id)
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {"status": "ok", "data": doc}


@router.post("/reorder")
def reorder_documents(body: ReorderBody):
    """문서 순서 변경"""
    doc_feat.reorder_documents(body.sibling_ids)
    return {"status": "ok"}


@router.delete("/{doc_id}")
def delete_document(doc_id: int):
    """문서 삭제"""
    doc_feat.delete_document(doc_id)
    return {"status": "ok"}


@router.post("/count")
def count_text(body: CountBody):
    """글자 수·단어 수·줄 수 계산"""
    result = doc_feat.count_text(body.content)
    return {"status": "ok", "data": result}
