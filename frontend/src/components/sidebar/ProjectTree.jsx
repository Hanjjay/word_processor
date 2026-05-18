import { useState } from 'react'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../../api'
import './ProjectTree.css'

/**
 * ProjectTree
 * - 문서 이름 변경: 더블클릭 또는 호버 시 ✎ 버튼
 * - 폴더(섹션) 이름 변경: ⋯ 메뉴 → 이름 변경
 * - 드래그: ⠿ 핸들로 순서 변경
 */
function ProjectTree({
  tree, currentDocId,
  onDocSelect,
  onCreateSection, onRenameSection, onDeleteSection,
  onCreateDocument, onDeleteDocument,
  onRefresh,   // 이름 변경 후 트리 갱신
}) {
  if (!tree) return null
  const rootSections = buildTree(tree.sections)

  // 문서 이름 변경 (트리 전역에서 사용)
  const handleRenameDoc = async (docId, currentTitle) => {
    const newTitle = window.prompt('문서 이름을 입력하세요', currentTitle)
    if (!newTitle?.trim() || newTitle.trim() === currentTitle) return
    try {
      const res = await api.document.get(docId)
      await api.document.save(
        docId,
        newTitle.trim(),
        res.data.content,
        res.data.mode
      )
      onRefresh?.()   // 사이드바 트리 새로고침
    } catch (e) { alert('이름 변경 실패: ' + e.message) }
  }

  return (
    <div className="pt-tree">
      {/* 루트 문서 */}
      {tree.root_docs?.length > 0 && (
        <SortableDocList
          docs={tree.root_docs}
          parentKey="root"
          currentDocId={currentDocId}
          onDocSelect={onDocSelect}
          onDeleteDocument={onDeleteDocument}
          onRenameDocument={handleRenameDoc}
        />
      )}

      {rootSections.map(section => (
        <SectionNode
          key={section.id}
          section={section}
          siblings={rootSections}
          depth={0}
          currentDocId={currentDocId}
          onDocSelect={onDocSelect}
          onCreateSection={onCreateSection}
          onRenameSection={onRenameSection}
          onDeleteSection={onDeleteSection}
          onCreateDocument={onCreateDocument}
          onDeleteDocument={onDeleteDocument}
          onRenameDocument={handleRenameDoc}
        />
      ))}
    </div>
  )
}

// ── 정렬 가능한 문서 목록 ─────────────────────────────
function SortableDocList({
  docs, parentKey, currentDocId,
  onDocSelect, onDeleteDocument, onRenameDocument
}) {
  const ids = docs.map(d => `doc-${d.id}`)
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {docs.map(doc => (
        <SortableDocItem
          key={doc.id}
          doc={doc}
          parentKey={parentKey}
          siblings={docs}
          isActive={currentDocId === doc.id}
          onSelect={onDocSelect}
          onDelete={onDeleteDocument}
          onRename={onRenameDocument}
        />
      ))}
    </SortableContext>
  )
}

// ── 드래그 가능한 문서 아이템 ────────────────────────
function SortableDocItem({ doc, parentKey, siblings, isActive, onSelect, onDelete, onRename }) {
  const [hover, setHover] = useState(false)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `doc-${doc.id}`,
    data: {
      itemType: 'doc',
      docId:    doc.id,
      title:    doc.title,
      parentKey,
      siblings,
    },
  })

  const style = {
    transform:   CSS.Transform.toString(transform),
    transition,
    opacity:     isDragging ? 0.4 : 1,
    paddingLeft: '26px',
  }

  const modeIcon = {
    '일반': '📄', '대본': '🎭', '뮤지컬 가사': '🎵', '마크다운': '📝'
  }[doc.mode] ?? '📄'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pt-doc ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(doc.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 드래그 핸들 */}
      <span
        className="pt-drag-handle"
        {...attributes}
        {...listeners}
        title="드래그로 순서 변경 · 에디터로 드롭해서 열기"
        onClick={e => e.stopPropagation()}
      >⠿</span>

      <span className="pt-doc-icon">{modeIcon}</span>

      {/* ★ 더블클릭으로 이름 변경 */}
      <span
        className="pt-doc-title"
        title="더블클릭해서 이름 변경"
        onDoubleClick={e => {
          e.stopPropagation()
          onRename(doc.id, doc.title)
        }}
      >
        {doc.title || '제목 없음'}
      </span>

      {doc.word_count > 0 && (
        <span className="pt-doc-count">{doc.word_count.toLocaleString()}</span>
      )}

      {/* ★ 호버 시 버튼 */}
      {hover && (
        <div className="pt-doc-actions" onClick={e => e.stopPropagation()}>
          <button
            className="pt-doc-rename"
            title="이름 변경"
            onClick={() => onRename(doc.id, doc.title)}
          >✎</button>
          <button
            className="pt-doc-delete"
            title="문서 삭제"
            onClick={() => onDelete(doc.id)}
          >✕</button>
        </div>
      )}
    </div>
  )
}

// ── 섹션 노드 ────────────────────────────────────────
function SectionNode({
  section, siblings, depth, currentDocId,
  onDocSelect, onCreateSection, onRenameSection,
  onDeleteSection, onCreateDocument, onDeleteDocument,
  onRenameDocument,
}) {
  const isTopLevel = depth === 0
  const [open,     setOpen]     = useState(isTopLevel)
  const [hover,    setHover]    = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `sec-${section.id}`,
    disabled: isTopLevel,
    data: {
      itemType:  'section',
      sectionId: section.id,
      name:      section.name,
      parentKey: section.parent_id ? `sec-${section.parent_id}` : 'root',
      siblings,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.4 : 1,
  }

  const typeLabel = {
    'pre-draft':  'PRE-DRAFT',
    'draft':      'DRAFT',
    'post-draft': 'POST-DRAFT',
    'act':        'ACT',
  }[section.type] ?? ''

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`pt-section-head depth-${depth}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setMenuOpen(false) }}
        onClick={() => setOpen(o => !o)}
      >
        {!isTopLevel && (
          <span
            className="pt-drag-handle"
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
          >⠿</span>
        )}

        <span className="pt-arrow">{open ? '▾' : '▸'}</span>

        {/* ★ 폴더 이름 — 더블클릭으로 변경 */}
        <span
          className={`pt-section-name ${typeLabel ? 'top-level' : ''}`}
          title={!isTopLevel ? '더블클릭해서 이름 변경' : ''}
          onDoubleClick={e => {
            if (isTopLevel) return
            e.stopPropagation()
            onRenameSection(section.id, section.name)
          }}
        >
          {section.name}
        </span>

        {typeLabel && <span className="pt-type-badge">{typeLabel}</span>}

        {hover && (
          <div className="pt-actions" onClick={e => e.stopPropagation()}>
            <button title="문서 추가" onClick={() => onCreateDocument(section.id)}>+</button>
            <button title="더보기"    onClick={() => setMenuOpen(o => !o)}>⋯</button>

            {menuOpen && (
              <div className="pt-context-menu">
                <button onClick={() => { onCreateDocument(section.id); setMenuOpen(false) }}>
                  문서 추가
                </button>
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

                {!isTopLevel && (
                  <>
                    <div className="pt-menu-divider" />
                    {/* ★ 이름 변경 */}
                    <button onClick={() => {
                      onRenameSection(section.id, section.name)
                      setMenuOpen(false)
                    }}>
                      이름 변경
                    </button>
                    <button
                      className="danger"
                      onClick={() => { onDeleteSection(section.id); setMenuOpen(false) }}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="pt-section-body">
          {section.children?.length > 0 && (
            <SortableSectionList
              sections={section.children}
              depth={depth + 1}
              currentDocId={currentDocId}
              onDocSelect={onDocSelect}
              onCreateSection={onCreateSection}
              onRenameSection={onRenameSection}
              onDeleteSection={onDeleteSection}
              onCreateDocument={onCreateDocument}
              onDeleteDocument={onDeleteDocument}
              onRenameDocument={onRenameDocument}
            />
          )}

          {section.documents?.length > 0 && (
            <SortableDocList
              docs={section.documents}
              parentKey={`sec-${section.id}`}
              currentDocId={currentDocId}
              onDocSelect={onDocSelect}
              onDeleteDocument={onDeleteDocument}
              onRenameDocument={onRenameDocument}
            />
          )}

          {!section.children?.length && !section.documents?.length && (
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

// ── 정렬 가능한 섹션 목록 ────────────────────────────
function SortableSectionList({ sections, depth, ...rest }) {
  const ids = sections.map(s => `sec-${s.id}`)
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {sections.map(section => (
        <SectionNode
          key={section.id}
          section={section}
          siblings={sections}
          depth={depth}
          {...rest}
        />
      ))}
    </SortableContext>
  )
}

// ── flat → 트리 변환 ─────────────────────────────────
function buildTree(sections) {
  if (!sections) return []
  const map = {}, roots = []
  sections.forEach(s => { map[s.id] = { ...s, children: [] } })
  sections.forEach(s => {
    if (s.parent_id == null) roots.push(map[s.id])
    else if (map[s.parent_id]) map[s.parent_id].children.push(map[s.id])
  })
  return roots
}

export default ProjectTree