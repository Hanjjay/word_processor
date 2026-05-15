import { useState } from 'react'
import './ProjectTree.css'

/**
 * ProjectTree
 * PRE-DRAFT / DRAFT / POST-DRAFT 및 하위 섹션·문서 트리
 *
 * tree = { sections: [...], root_docs: [...] }
 * sections = [{ id, parent_id, name, type, sort_order, doc_count, documents }]
 */
function ProjectTree({
  tree, currentDocId,
  onDocSelect,
  onCreateSection, onRenameSection, onDeleteSection,
  onCreateDocument, onDeleteDocument,
}) {
  if (!tree) return null

  // flat sections → 트리 구조로 변환
  const rootSections = buildTree(tree.sections)

  return (
    <div className="pt-tree">
      {/* 루트 문서 (섹션 없이 프로젝트에 바로 속한 문서) */}
      {tree.root_docs?.map(doc => (
        <DocItem
          key={doc.id}
          doc={doc}
          depth={0}
          isActive={currentDocId === doc.id}
          onSelect={onDocSelect}
          onDelete={onDeleteDocument}
        />
      ))}

      {/* 섹션 트리 */}
      {rootSections.map(section => (
        <SectionNode
          key={section.id}
          section={section}
          depth={0}
          currentDocId={currentDocId}
          onDocSelect={onDocSelect}
          onCreateSection={onCreateSection}
          onRenameSection={onRenameSection}
          onDeleteSection={onDeleteSection}
          onCreateDocument={onCreateDocument}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  )
}

// ── 섹션 노드 ────────────────────────────────────────
function SectionNode({
  section, depth, currentDocId,
  onDocSelect, onCreateSection, onRenameSection,
  onDeleteSection, onCreateDocument, onDeleteDocument,
}) {
  // PRE-DRAFT / DRAFT / POST-DRAFT 는 기본 열림
  const isTopLevel = depth === 0
  const [open,    setOpen]    = useState(isTopLevel)
  const [hover,   setHover]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const hasChildren = section.children?.length > 0
  const hasDocs     = section.documents?.length > 0

  const typeLabel = {
    'pre-draft':  'PRE-DRAFT',
    'draft':      'DRAFT',
    'post-draft': 'POST-DRAFT',
    'act':        'ACT',
    'scene':      '',
    'folder':     '',
  }[section.type] ?? ''

  return (
    <div className="pt-section">
      {/* 섹션 헤더 */}
      <div
        className={`pt-section-head depth-${depth}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setMenuOpen(false) }}
        onClick={() => setOpen(o => !o)}
      >
        {/* 접기 화살표 */}
        <span className="pt-arrow">{open ? '▾' : '▸'}</span>

        {/* 섹션 이름 */}
        <span className={`pt-section-name ${typeLabel ? 'top-level' : ''}`}>
          {section.name}
        </span>

        {/* 타입 배지 (PRE-DRAFT 등) */}
        {typeLabel && <span className="pt-type-badge">{typeLabel}</span>}

        {/* 호버 시 액션 버튼 */}
        {hover && (
          <div className="pt-actions" onClick={e => e.stopPropagation()}>
            {/* 문서 추가 */}
            <button
              title="문서 추가"
              onClick={() => onCreateDocument(section.id)}
            >+</button>

            {/* 더보기 메뉴 */}
            <button
              title="더보기"
              onClick={() => setMenuOpen(o => !o)}
            >⋯</button>

            {menuOpen && (
              <div className="pt-context-menu">
                <button onClick={() => { onCreateSection(section.id, 'folder'); setMenuOpen(false) }}>
                  폴더 추가
                </button>
                {section.type === 'draft' && (
                  <button onClick={() => { onCreateSection(section.id, 'act'); setMenuOpen(false) }}>
                    Act 추가
                  </button>
                )}
                {section.type === 'act' && (
                  <button onClick={() => { onCreateSection(section.id, 'scene'); setMenuOpen(false) }}>
                    장면 추가
                  </button>
                )}
                <div className="pt-menu-divider" />
                <button onClick={() => { onRenameSection(section.id, section.name); setMenuOpen(false) }}>
                  이름 변경
                </button>
                {!isTopLevel && (
                  <button
                    className="danger"
                    onClick={() => { onDeleteSection(section.id); setMenuOpen(false) }}
                  >
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하위 내용 (열렸을 때) */}
      {open && (
        <div className="pt-section-body">
          {/* 하위 섹션 (재귀) */}
          {section.children?.map(child => (
            <SectionNode
              key={child.id}
              section={child}
              depth={depth + 1}
              currentDocId={currentDocId}
              onDocSelect={onDocSelect}
              onCreateSection={onCreateSection}
              onRenameSection={onRenameSection}
              onDeleteSection={onDeleteSection}
              onCreateDocument={onCreateDocument}
              onDeleteDocument={onDeleteDocument}
            />
          ))}

          {/* 이 섹션의 문서 목록 */}
          {section.documents?.map(doc => (
            <DocItem
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              isActive={currentDocId === doc.id}
              onSelect={onDocSelect}
              onDelete={onDeleteDocument}
            />
          ))}

          {/* 하위 항목 없을 때 안내 */}
          {!hasChildren && !hasDocs && (
            <div
              className="pt-empty-hint"
              style={{ paddingLeft: `${26 + (depth + 1) * 14}px` }}
            >
              문서가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 문서 아이템 ──────────────────────────────────────
function DocItem({ doc, depth, isActive, onSelect, onDelete }) {
  const [hover, setHover] = useState(false)

  const modeIcon = {
    '일반':        '📄',
    '대본':        '🎭',
    '뮤지컬 가사': '🎵',
    '마크다운':    '📝',
  }[doc.mode] ?? '📄'

  return (
    <div
      className={`pt-doc ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${26 + depth * 14}px` }}
      onClick={() => onSelect(doc.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="pt-doc-icon">{modeIcon}</span>
      <span className="pt-doc-title">{doc.title}</span>
      {doc.word_count > 0 && (
        <span className="pt-doc-count">{doc.word_count.toLocaleString()}</span>
      )}
      {hover && (
        <button
          className="pt-doc-delete"
          title="문서 삭제"
          onClick={e => { e.stopPropagation(); onDelete(doc.id) }}
        >✕</button>
      )}
    </div>
  )
}

// ── flat 섹션 배열 → 트리 구조 변환 ──────────────────
function buildTree(sections) {
  if (!sections) return []
  const map  = {}
  const roots = []

  sections.forEach(s => {
    map[s.id] = { ...s, children: [] }
  })
  sections.forEach(s => {
    if (s.parent_id == null) {
      roots.push(map[s.id])
    } else if (map[s.parent_id]) {
      map[s.parent_id].children.push(map[s.id])
    }
  })
  return roots
}

export default ProjectTree
