import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class FolderBody(BaseModel):
    path: str


def _build_tree(path: str, depth: int = 0) -> list:
    if depth > 3:
        return []
    result = []
    try:
        entries = sorted(
            os.scandir(path),
            key=lambda e: (not e.is_dir(), e.name.lower())
        )
        for entry in entries:
            if entry.name.startswith("."):
                continue
            node = {
                "name": entry.name,
                "path": entry.path,
                "type": "folder" if entry.is_dir() else "file",
            }
            if entry.is_dir():
                node["children"] = _build_tree(entry.path, depth + 1)
            result.append(node)
    except PermissionError:
        pass
    return result


@router.post("/open")
def open_folder(body: FolderBody):
    if not os.path.isdir(body.path):
        raise HTTPException(status_code=400, detail="유효한 폴더 경로가 아닙니다.")
    tree = _build_tree(body.path)
    return {
        "status": "ok",
        "data": {
            "name":     os.path.basename(body.path),
            "path":     body.path,
            "children": tree,
        }
    }


@router.get("/refresh")
def refresh_folder(path: str):
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="유효한 폴더 경로가 아닙니다.")
    tree = _build_tree(path)
    return {
        "status": "ok",
        "data": {
            "name":     os.path.basename(path),
            "path":     path,
            "children": tree,
        }
    }


@router.get("/search")
def search_files(path: str, query: str):
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="유효한 폴더 경로가 아닙니다.")
    results = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if query.lower() in f.lower():
                results.append({
                    "name": f,
                    "path": os.path.join(root, f),
                    "type": "file",
                })
    return {"status": "ok", "data": results}


# ── 파일 내용 읽기 (탐색기에서 파일 클릭 시) ──────────
@router.get("/read")
def read_file(path: str):
    """
    파일 경로를 받아 내용을 반환.
    지원: .txt .md .docx
    """
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    ext = os.path.splitext(path)[1].lower()

    try:
        if ext in (".txt", ".md"):
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {
                "status": "ok",
                "data": {
                    "content":  content,
                    "filename": os.path.basename(path),
                    "mode":     "마크다운" if ext == ".md" else "일반",
                }
            }

        elif ext == ".docx":
            try:
                from docx import Document
                doc = Document(path)
                content = "\n".join(p.text for p in doc.paragraphs)
                return {
                    "status": "ok",
                    "data": {
                        "content":  content,
                        "filename": os.path.basename(path),
                        "mode":     "일반",
                    }
                }
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="python-docx 미설치. pip install python-docx"
                )

        else:
            # 나머지는 텍스트로 시도
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {
                "status": "ok",
                "data": {
                    "content":  content,
                    "filename": os.path.basename(path),
                    "mode":     "일반",
                }
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
