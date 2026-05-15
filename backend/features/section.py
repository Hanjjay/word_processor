"""
features/section.py — 섹션(폴더) 관련 기능 코드

섹션은 프로젝트 안의 계층 폴더입니다.
PRE-DRAFT → 초고 V1 → Act 1 → 1.2 장면 처럼 무한 계층 가능.
"""
from storage.database import get_connection


def create_section(project_id: int, name: str,
                   section_type: str = "folder",
                   parent_id: int = None) -> dict:
    """섹션 생성"""
    conn = get_connection()

    # 같은 부모 아래에서 가장 마지막 순서로 추가
    row = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order "
        "FROM sections WHERE project_id=? AND parent_id IS ?",
        (project_id, parent_id)
    ).fetchone()
    next_order = row["next_order"] if row else 0

    cur = conn.execute(
        """INSERT INTO sections (project_id, parent_id, name, type, sort_order)
           VALUES (?, ?, ?, ?, ?)""",
        (project_id, parent_id, name, section_type, next_order)
    )
    section_id = cur.lastrowid
    conn.commit()
    conn.close()
    return get_section(section_id)


def get_section(section_id: int) -> dict | None:
    """섹션 단건 조회"""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, project_id, parent_id, name, type, sort_order "
        "FROM sections WHERE id=?", (section_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_project_tree(project_id: int) -> list[dict]:
    """
    프로젝트의 전체 섹션 트리 반환.
    flat list 형태로 반환 후 프론트엔드에서 트리 구성.
    각 섹션에 하위 문서 개수 포함.
    """
    conn = get_connection()

    sections = conn.execute(
        """SELECT s.id, s.parent_id, s.name, s.type, s.sort_order,
                  COUNT(d.id) AS doc_count
           FROM sections s
           LEFT JOIN documents d ON d.section_id = s.id
           WHERE s.project_id = ?
           GROUP BY s.id
           ORDER BY s.sort_order""",
        (project_id,)
    ).fetchall()

    conn.close()
    return [dict(s) for s in sections]


def update_section(section_id: int, name: str = None,
                   section_type: str = None) -> dict | None:
    """섹션 이름·타입 수정"""
    conn = get_connection()
    fields, values = [], []
    if name         is not None: fields.append("name=?"); values.append(name)
    if section_type is not None: fields.append("type=?"); values.append(section_type)
    if fields:
        values.append(section_id)
        conn.execute(f"UPDATE sections SET {', '.join(fields)} WHERE id=?", values)
        conn.commit()
    conn.close()
    return get_section(section_id)


def move_section(section_id: int, new_parent_id: int = None) -> dict | None:
    """섹션을 다른 부모 아래로 이동"""
    conn = get_connection()
    conn.execute(
        "UPDATE sections SET parent_id=? WHERE id=?",
        (new_parent_id, section_id)
    )
    conn.commit()
    conn.close()
    return get_section(section_id)


def reorder_sections(sibling_ids: list[int]) -> bool:
    """같은 부모 아래 섹션 순서 변경"""
    conn = get_connection()
    for order, sid in enumerate(sibling_ids):
        conn.execute("UPDATE sections SET sort_order=? WHERE id=?", (order, sid))
    conn.commit()
    conn.close()
    return True


def delete_section(section_id: int) -> bool:
    """
    섹션 삭제.
    CASCADE로 하위 섹션 및 문서 전부 함께 삭제.
    """
    conn = get_connection()
    conn.execute("DELETE FROM sections WHERE id=?", (section_id,))
    conn.commit()
    conn.close()
    return True
