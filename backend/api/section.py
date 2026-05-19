"""
api/section.py — 섹션 관련 HTTP 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import section as sect_feat

router = APIRouter()


class CreateSectionBody(BaseModel):
    project_id:   int
    name:         str
    section_type: str  = "folder"
    parent_id:    int | None = None

class UpdateSectionBody(BaseModel):
    name:         str | None = None
    section_type: str | None = None

class MoveSectionBody(BaseModel):
    new_parent_id: int | None = None

class ReorderBody(BaseModel):
    sibling_ids: list[int]


@router.post("/create")
def create_section(body: CreateSectionBody):
    """섹션 생성"""
    section = sect_feat.create_section(
        body.project_id, body.name,
        body.section_type, body.parent_id
    )
    return {"status": "ok", "data": section}


@router.patch("/{section_id}")
def update_section(section_id: int, body: UpdateSectionBody):
    """섹션 이름·타입 수정"""
    section = sect_feat.update_section(
        section_id, body.name, body.section_type
    )
    if not section:
        raise HTTPException(status_code=404, detail="섹션을 찾을 수 없습니다.")
    return {"status": "ok", "data": section}


@router.patch("/{section_id}/move")
def move_section(section_id: int, body: MoveSectionBody):
    """섹션 이동 (다른 부모 아래로)"""
    section = sect_feat.move_section(section_id, body.new_parent_id)
    return {"status": "ok", "data": section}


@router.post("/reorder")
def reorder_sections(body: ReorderBody):
    """같은 부모 아래 섹션 순서 변경"""
    sect_feat.reorder_sections(body.sibling_ids)
    return {"status": "ok"}


@router.delete("/{section_id}")
def delete_section(section_id: int):
    """섹션 삭제 (하위 섹션 및 문서 전부 삭제)"""
    sect_feat.delete_section(section_id)
    return {"status": "ok"}
