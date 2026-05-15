"""
api/project.py — 프로젝트 관련 HTTP 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import project as proj_feat
from features import section as sect_feat

router = APIRouter()


class CreateProjectBody(BaseModel):
    title:       str = "새 프로젝트"
    description: str = ""

class UpdateProjectBody(BaseModel):
    title:       str | None = None
    description: str | None = None
    cover_color: str | None = None

class ReorderBody(BaseModel):
    ordered_ids: list[int]


# ── 프로젝트 CRUD ─────────────────────────────────────

@router.get("/list")
def list_projects():
    """전체 프로젝트 목록"""
    projects = proj_feat.list_projects()
    return {"status": "ok", "data": projects}


@router.post("/create")
def create_project(body: CreateProjectBody):
    """새 프로젝트 생성 (기본 섹션 자동 생성 포함)"""
    project = proj_feat.create_project(body.title, body.description)
    return {"status": "ok", "data": project}


@router.get("/{project_id}")
def get_project(project_id: int):
    """프로젝트 단건 조회"""
    project = proj_feat.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return {"status": "ok", "data": project}


@router.patch("/{project_id}")
def update_project(project_id: int, body: UpdateProjectBody):
    """프로젝트 정보 수정"""
    project = proj_feat.update_project(
        project_id,
        title=body.title,
        description=body.description,
        cover_color=body.cover_color,
    )
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return {"status": "ok", "data": project}


@router.delete("/{project_id}")
def delete_project(project_id: int):
    """프로젝트 삭제 (하위 데이터 전부 삭제)"""
    proj_feat.delete_project(project_id)
    return {"status": "ok"}


@router.post("/reorder")
def reorder_projects(body: ReorderBody):
    """프로젝트 순서 변경"""
    proj_feat.reorder_projects(body.ordered_ids)
    return {"status": "ok"}


# ── 섹션 트리 (프로젝트 안) ───────────────────────────

@router.get("/{project_id}/tree")
def get_project_tree(project_id: int):
    """
    프로젝트의 전체 섹션 트리 + 각 섹션의 문서 목록.
    사이드바 트리 렌더링에 사용.
    """
    # 섹션 목록
    sections = sect_feat.get_project_tree(project_id)

    # 각 섹션의 문서 목록 추가
    from features import document as doc_feat
    for section in sections:
        section["documents"] = doc_feat.list_documents(
            project_id, section["id"]
        )

    # 프로젝트 루트 문서 (section_id=None)
    root_docs = doc_feat.list_documents(project_id, None)

    return {
        "status": "ok",
        "data": {
            "sections":   sections,
            "root_docs":  root_docs,
        }
    }
