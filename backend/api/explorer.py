import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class FolderBody(BaseModel):
    path: str


def _build_tree(path: str, depth: int = 0) -> list:
    """폴더를 재귀적으로 읽어 트리 구조 반환. 최대 3단계."""
    if depth > 3:
        return []
    result = []
    try:
        entries = sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            # 숨김 파일 제외
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
    """폴더 열기 → 파일 트리 반환"""
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
    """폴더 새로고침"""
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
    """파일명 검색"""
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="유효한 폴더 경로가 아닙니다.")
    results = []
    for root, dirs, files in os.walk(path):
        # 숨김 폴더 제외
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if query.lower() in f.lower():
                results.append({
                    "name": f,
                    "path": os.path.join(root, f),
                    "type": "file",
                })
    return {"status": "ok", "data": results}
