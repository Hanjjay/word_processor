from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import document as doc_feature

router = APIRouter()


# ── 요청 바디 모델 ────────────────────────────────────

class SaveBody(BaseModel):
    doc_id:  int
    title:   str
    content: str
    mode:    str = "일반"

class AutosaveBody(BaseModel):
    doc_id:  int
    content: str

class CountBody(BaseModel):
    content: str


# ── 엔드포인트 ────────────────────────────────────────

@router.post("/new")
def new_document():
    """새 문서 생성"""
    doc = doc_feature.create_document()
    return {"status": "ok", "data": doc}


@router.get("/list")
def list_documents():
    """문서 목록"""
    docs = doc_feature.list_documents()
    return {"status": "ok", "data": docs}


@router.get("/{doc_id}")
def get_document(doc_id: int):
    """문서 단건 조회"""
    doc = doc_feature.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {"status": "ok", "data": doc}


@router.post("/save")
def save_document(body: SaveBody):
    """문서 저장"""
    doc = doc_feature.save_document(
        body.doc_id, body.title, body.content, body.mode
    )
    return {"status": "ok", "data": doc}


@router.post("/autosave")
def autosave_document(body: AutosaveBody):
    """자동 저장 (내용만)"""
    doc_feature.autosave_document(body.doc_id, body.content)
    return {"status": "ok"}


@router.delete("/{doc_id}")
def delete_document(doc_id: int):
    """문서 삭제"""
    doc_feature.delete_document(doc_id)
    return {"status": "ok"}


@router.post("/count")
def count_text(body: CountBody):
    """글자 수 / 단어 수 계산"""
    result = doc_feature.count_text(body.content)
    return {"status": "ok", "data": result}
