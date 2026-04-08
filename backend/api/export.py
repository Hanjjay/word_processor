from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from features import export as export_feature

router = APIRouter()


class ExportBody(BaseModel):
    content: str
    path:    str

class PdfBody(BaseModel):
    html_content: str
    path:         str


@router.post("/docx")
def export_docx(body: ExportBody):
    """텍스트 → .docx 내보내기"""
    try:
        path = export_feature.to_docx(body.content, body.path)
        return {"status": "ok", "data": {"path": path}}
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
def export_pdf(body: PdfBody):
    """HTML → .pdf 내보내기"""
    try:
        path = export_feature.to_pdf(body.html_content, body.path)
        return {"status": "ok", "data": {"path": path}}
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
