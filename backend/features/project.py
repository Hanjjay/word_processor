"""
features/project.py — 프로젝트 관련 기능 코드

프로젝트는 작품 단위입니다.
예) "햄릿 각색", "새 시나리오 2025"
"""
from storage.database import get_connection


def create_project(title: str = "새 프로젝트", description: str = "") -> dict:
    """
    새 프로젝트 생성.
    생성 시 기본 섹션(PRE-DRAFT / DRAFT / POST-DRAFT)을 자동으로 만들어준다.
    """
    conn = get_connection()

    # 1. 프로젝트 생성
    cur = conn.execute(
        "INSERT INTO projects (title, description) VALUES (?, ?)",
        (title, description)
    )
    project_id = cur.lastrowid

    # 2. 기본 섹션 자동 생성 (UI 초안 기준)
    default_sections = [
        ("PRE-DRAFT",  "pre-draft",  0),
        ("DRAFT",      "draft",      1),
        ("POST-DRAFT", "post-draft", 2),
    ]
    for name, stype, order in default_sections:
        conn.execute(
            """INSERT INTO sections (project_id, parent_id, name, type, sort_order)
               VALUES (?, NULL, ?, ?, ?)""",
            (project_id, name, stype, order)
        )

    conn.commit()
    conn.close()
    return get_project(project_id)


def get_project(project_id: int) -> dict | None:
    """프로젝트 단건 조회"""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, title, description, cover_color, created_at, updated_at "
        "FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_projects() -> list[dict]:
    """전체 프로젝트 목록 (정렬 순서대로)"""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, description, cover_color, updated_at "
        "FROM projects ORDER BY sort_order, updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_project(project_id: int, title: str = None,
                   description: str = None, cover_color: str = None) -> dict | None:
    """프로젝트 정보 수정"""
    conn = get_connection()
    fields, values = [], []
    if title        is not None: fields.append("title=?");        values.append(title)
    if description  is not None: fields.append("description=?");  values.append(description)
    if cover_color  is not None: fields.append("cover_color=?");  values.append(cover_color)
    if not fields:
        conn.close()
        return get_project(project_id)

    fields.append("updated_at=datetime('now','localtime')")
    values.append(project_id)
    conn.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id=?", values)
    conn.commit()
    conn.close()
    return get_project(project_id)


def delete_project(project_id: int) -> bool:
    """
    프로젝트 삭제.
    CASCADE로 하위 sections, documents, snapshots 등 전부 함께 삭제.
    """
    conn = get_connection()
    conn.execute("DELETE FROM projects WHERE id=?", (project_id,))
    conn.commit()
    conn.close()
    return True


def reorder_projects(ordered_ids: list[int]) -> bool:
    """프로젝트 순서 변경 (드래그 앤 드롭용)"""
    conn = get_connection()
    for order, pid in enumerate(ordered_ids):
        conn.execute(
            "UPDATE projects SET sort_order=? WHERE id=?", (order, pid)
        )
    conn.commit()
    conn.close()
    return True
