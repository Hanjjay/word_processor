import { useEffect, useState } from 'react'
import {
  DragOverlay,
  useDndMonitor,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../../api'
import './ProjectTree.css'

// 8단계: Drag 중 접힌 폴더 위에 이 시간(ms)만큼 머무르면 자동으로 펼침
const AUTO_EXPAND_DELAY = 600

/**
 * ProjectTree
 * - 문서 이름 변경: 더블클릭 또는 호버 시 ✎ 버튼
 * - 폴더(섹션) 이름 변경: ⋯ 메뉴 → 이름 변경
 * - 드래그: ⠿ 핸들로 순서 변경 / 이동 (before・inside・after)
 */
function ProjectTree({
  tree, currentDocId,
  onDocSelect,
  onCreateSection, onRenameSection, onDeleteSection,
  onCreateDocument, onDeleteDocument,
  onRefresh,           // 이름 변경 후 트리 갱신
  onMoveDocument,      // 파일 → 폴더(inside) 이동 — Backend 연결
  onMoveSection,       // 폴더 → 폴더(inside) 이동 — Backend 연결, cycle 방지
  onReorderDocuments,  // 7단계: 문서 before/after — Backend 연결(move+reorder)
  onReorderSections,   // 7단계: 폴더 before/after — Backend 연결(move+reorder)
}) {
  // early return(tree 없음)보다 앞에 위치 — Hooks 규칙상 조건부 호출 금지
  const [activeItem,    setActiveItem]    = useState(null)
  const [dropIndicator, setDropIndicator] = useState(null)
    // { rowType: 'doc'|'folder', targetId, position: 'before'|'inside'|'after' }

  const handleDragStart = (event) => {
    const data = event.active.data.current
    if (!data) return
    if (data.itemType === 'doc') {
      setActiveItem({ id: data.docId, type: 'file', name: data.title || '제목 없음' })
    } else if (data.itemType === 'section') {
      setActiveItem({ id: data.sectionId, type: 'folder', name: data.name })
    }
  }

  // Drag 중 대상 위 어느 위치(before/inside/after)인지 판단해 표시 상태만 갱신 (상태 변경 없음)
  const handleDragOver = (event) => {
    if (!tree) return // DndContext는 이제 상위(App)가 소유 — 프로젝트 미선택 등으로 tree가 없을 때도 monitor는 계속 등록돼있어 방어 필요
    const { active, over } = event
    const overKind = getOverKind(over)
    const position = computeDropPosition(overKind, active, over)
    const plan     = position ? buildDropPlan(overKind, position, active, over, tree) : null

    setDropIndicator(
      plan && isDropPlanValid(plan, tree)
        ? { rowType: overKind, targetId: plan.targetId, position: plan.position }
        : null
    )
  }

  const clearDragState = () => {
    setActiveItem(null)
    setDropIndicator(null)
  }

  // ── Drag 종료 → 판정된 position에 따라 이동/정렬 콜백 호출 (Backend 연결은 LSidebar가 담당) ──
  const handleDragEnd = (event) => {
    clearDragState()
    if (!tree) return

    const { active, over } = event
    if (!over) return                 // over가 null (트리 밖 또는 EditorPane으로 드롭 — 이 컴포넌트가 처리할 대상 아님)
    if (active.id === over.id) return // 자기 자신 위 Drop(대부분의 경우 — 폴더의 나머지 경우는 buildDropPlan에서 재검사)

    const overKind = getOverKind(over)
    const position = computeDropPosition(overKind, active, over)
    if (!position) return             // over.id가 doc-*/sec-*/drop-sec-* 패턴이 아니면(예: editor-drop-zone-*) 여기서 조용히 종료

    const plan = buildDropPlan(overKind, position, active, over, tree)
    if (!isDropPlanValid(plan, tree)) return

    if (plan.position === 'inside') {
      if (plan.activeType === 'doc') {
        onMoveDocument?.({
          itemId:         plan.activeId, // node 고유 id — 변경하지 않고 그대로 전달
          sourceParentId: plan.sourceParentId,
          targetParentId: plan.targetParentId,
        })
      } else {
        onMoveSection?.({
          itemId:         plan.activeId,
          sourceParentId: plan.sourceParentId,
          targetParentId: plan.targetParentId,
        })
      }
      return
    }

    // before / after
    if (plan.activeType === 'doc') {
      onReorderDocuments?.(plan)
    } else {
      onReorderSections?.(plan)
    }
  }

  // DndContext는 App.jsx가 소유(LSidebar+Editor를 함께 감싸야 EditorPane Drop도 같은 세션에서 동작) —
  // 이 컴포넌트는 그 컨텍스트를 useDndMonitor로 구독만 한다 (기존 DndContext 재사용, 새로 만들지 않음)
  useDndMonitor({
    onDragStart: handleDragStart,
    onDragOver:  handleDragOver,
    onDragEnd:   handleDragEnd,
    onDragCancel: clearDragState,
  })

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
    <>
      <div className="pt-tree">
        {/* 루트 문서 */}
        {tree.root_docs?.length > 0 && (
          <SortableDocList
            docs={tree.root_docs}
            parentKey="root"
            currentDocId={currentDocId}
            dropIndicator={dropIndicator}
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
            dropIndicator={dropIndicator}
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

      <DragOverlay>
        {activeItem && (
          <div className="pt-drag-overlay">
            <span>{activeItem.type === 'folder' ? '📁' : '📄'}</span>
            <span>{activeItem.name}</span>
          </div>
        )}
      </DragOverlay>
    </>
  )
}

// ── 정렬 가능한 문서 목록 ─────────────────────────────
function SortableDocList({
  docs, parentKey, currentDocId, dropIndicator,
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
          dropIndicator={dropIndicator}
          onSelect={onDocSelect}
          onDelete={onDeleteDocument}
          onRename={onRenameDocument}
        />
      ))}
    </SortableContext>
  )
}

// ── 드래그 가능한 문서 아이템 ────────────────────────
function SortableDocItem({ doc, parentKey, siblings, isActive, dropIndicator, onSelect, onDelete, onRename }) {
  const [hover, setHover] = useState(false)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `doc-${doc.id}`,
    data: {
      itemType: 'doc',       // 기존 정렬/이동(3~7단계) 로직이 이 필드를 기준으로 동작 — 유지
      type:     'document',  // EditorPane Drop(다음 단계)에서 파일/폴더를 구분해 읽을 필드
      docId:    doc.id,      // 문서 고유 id — 이동해도 절대 안 바뀜, EditorPane이 열 문서 식별자
      title:    doc.title,
      parentKey,
      siblings,
    },
  })

  const isDropBefore = dropIndicator?.rowType === 'doc' && dropIndicator.targetId === doc.id && dropIndicator.position === 'before'
  const isDropAfter  = dropIndicator?.rowType === 'doc' && dropIndicator.targetId === doc.id && dropIndicator.position === 'after'

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
      className={`pt-doc ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDropBefore ? 'drop-line-before' : ''} ${isDropAfter ? 'drop-line-after' : ''}`}
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
  section, siblings, depth, currentDocId, dropIndicator,
  onDocSelect, onCreateSection, onRenameSection,
  onDeleteSection, onCreateDocument, onDeleteDocument,
  onRenameDocument,
}) {
  const isTopLevel = depth === 0
  const [open,     setOpen]     = useState(isTopLevel)
  const [hover,    setHover]    = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // ── 8단계: Drag 중 이 폴더 위에 머무르면 자동 펼침 (Drop 위치와 무관 — before/inside/after 모두 hover로 인정) ──
  const isDragHoverTarget = dropIndicator?.rowType === 'folder' && dropIndicator.targetId === section.id
  useEffect(() => {
    if (!isDragHoverTarget || open) return // 이미 열려있으면 timer 불필요

    const timer = setTimeout(() => setOpen(true), AUTO_EXPAND_DELAY)
    return () => clearTimeout(timer) // 다른 폴더로 이동/Drag 종료/이탈 시 즉시 정리
  }, [isDragHoverTarget, open])

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `sec-${section.id}`,
    disabled: isTopLevel,
    data: {
      itemType:  'section', // 기존 정렬/이동(3~7단계) 로직이 이 필드를 기준으로 동작 — 유지
      type:      'folder',  // 파일(document) Drag 데이터와 명확히 구분하기 위한 필드
      sectionId: section.id,
      name:      section.name,
      parentKey: section.parent_id ? `sec-${section.parent_id}` : 'root',
      siblings,
    },
  })

  // 폴더를 Drop Target(inside)으로도 등록 — 실제 이동은 handleDragEnd에서 처리
  const droppableId = `drop-sec-${section.id}`
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: droppableId,
    data: { type: 'folder', sectionId: section.id },
    disabled: isDragging, // 드래그 중인 폴더 자신 위로는 드롭 판정 안 함
  })

  const isDropInside = dropIndicator?.rowType === 'folder' && dropIndicator.targetId === section.id && dropIndicator.position === 'inside'
  const isDropBefore = dropIndicator?.rowType === 'folder' && dropIndicator.targetId === section.id && dropIndicator.position === 'before'
  const isDropAfter  = dropIndicator?.rowType === 'folder' && dropIndicator.targetId === section.id && dropIndicator.position === 'after'

  // useSortable(정렬용)과 useDroppable(폴더 드롭용) ref를 같은 DOM 노드에 병합
  const setRefs = (node) => {
    setNodeRef(node)
    setDroppableRef(node)
  }

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
    <div ref={setRefs} style={style}>
      <div
        className={`pt-section-head depth-${depth} ${isDropInside ? 'drop-target' : ''} ${isDropBefore ? 'drop-line-before' : ''} ${isDropAfter ? 'drop-line-after' : ''}`}
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
              dropIndicator={dropIndicator}
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
              dropIndicator={dropIndicator}
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

// ══════════════════════════════════════════════════════
// ── Drop 판정 로직 (UI 렌더링과 분리) ──────────────────
// 7단계: before / inside / after 판정 + 정규화된 이동 정보 계산
// ══════════════════════════════════════════════════════

// over.id 문자열 패턴으로 "무엇 위에 있는가"만 구분 (doc-* / sec-* / drop-sec-*)
// 폴더는 useSortable(sec-*)과 useDroppable(drop-sec-*) 두 id를 같은 DOM 노드에 등록해두었으므로
// 충돌 판정이 둘 중 어느 쪽을 반환하든 동일하게 'folder'로 취급한다.
function getOverKind(over) {
  if (!over) return null
  const id = String(over.id)
  if (id.startsWith('doc-')) return 'doc'
  if (id.startsWith('sec-') || id.startsWith('drop-sec-')) return 'folder'
  return null
}

// 드래그 중인 아이템의 현재 rect와 대상(over) rect를 비교해 before/inside/after 판단
// 폴더: 상단 25% before / 중앙 50% inside / 하단 25% after
// 파일: 상단 50% before / 하단 50% after (inside 없음)
function computeDropPosition(overKind, active, over) {
  if (!overKind) return null
  const overRect   = over.rect
  const activeRect = active.rect?.current?.translated ?? active.rect?.current?.initial
  if (!overRect || !activeRect) return null

  const offsetRatio = (activeRect.top + activeRect.height / 2 - overRect.top) / overRect.height

  if (overKind === 'doc') {
    return offsetRatio < 0.5 ? 'before' : 'after'
  }
  if (offsetRatio < 0.25) return 'before'
  if (offsetRatio > 0.75) return 'after'
  return 'inside'
}

// active/over/position → 실제 이동에 필요한 정규화된 정보로 변환 (조회만 수행, 상태 변경 없음)
// 반환 형태: { activeId, activeType, position, targetId, targetParentId, sourceParentId, targetIndex, siblingIds }
function buildDropPlan(overKind, position, active, over, tree) {
  const activeData = active.data?.current
  const overData    = over.data?.current
  if (!activeData?.itemType || !overKind || !overData) return null

  const activeType = activeData.itemType // 'doc' | 'section'
  const draggedId  = activeType === 'doc' ? activeData.docId : activeData.sectionId
  const sourceParentId = activeData.parentKey === 'root'
    ? null
    : Number(activeData.parentKey.replace('sec-', ''))

  // 자기 자신 위 Drop(어떤 position이든) — 폴더는 sec-*/drop-sec-* 두 id 중 무엇이 over로 잡혀도 여기서 걸러짐
  const overTargetId = overKind === 'doc' ? overData.docId : overData.sectionId
  if (activeType === overKind && draggedId === overTargetId) return null

  // ── inside: 폴더 children으로 이동 ──
  if (position === 'inside') {
    if (overKind !== 'folder') return null // 파일에는 inside 불가
    const targetParentId = overData.sectionId
    return {
      activeId: draggedId, activeType, position,
      targetId: targetParentId, targetParentId, sourceParentId,
      targetIndex: null, siblingIds: null, originalSiblingIds: null,
    }
  }

  // ── before / after: target과 같은 종류(문서-문서, 폴더-폴더)만 지원 ──
  if (activeType !== overKind) return null

  let targetId, targetParentId, siblings
  if (overKind === 'doc') {
    targetId = overData.docId
    targetParentId = overData.parentKey === 'root'
      ? null
      : Number(overData.parentKey.replace('sec-', ''))
    siblings = targetParentId == null
      ? tree.root_docs
      : (tree.sections.find(s => s.id === targetParentId)?.documents ?? [])
  } else {
    // 폴더 대상의 before/after → target 폴더 '자신'의 형제 사이로 (inside 아님, target의 부모 기준)
    const targetSection = tree.sections.find(s => s.id === overData.sectionId)
    if (!targetSection) return null
    targetId = targetSection.id
    targetParentId = targetSection.parent_id
    siblings = tree.sections.filter(s => s.parent_id === targetParentId)
  }

  // ── targetIndex 계산: 드래그 대상을 형제 목록에서 제거 후, target 위치를 기준으로 재삽입 ──
  const originalSiblingIds = siblings.map(s => s.id)
  const siblingIds = [...originalSiblingIds]
  const draggedIdx = siblingIds.indexOf(draggedId)
  if (draggedIdx !== -1) siblingIds.splice(draggedIdx, 1) // 같은 부모 안 재배치인 경우만 제거됨
  let targetIdx = siblingIds.indexOf(targetId)
  if (targetIdx === -1) targetIdx = siblingIds.length
  const insertAt = position === 'before' ? targetIdx : targetIdx + 1
  siblingIds.splice(insertAt, 0, draggedId)

  return {
    activeId: draggedId, activeType, position,
    targetId, targetParentId, sourceParentId,
    targetIndex: insertAt, siblingIds, originalSiblingIds,
  }
}

// Drop 가능 여부 최종 판정 — cycle 방지 + 의미 없는 Drop(변화 없음) 차단
function isDropPlanValid(plan, tree) {
  if (!plan) return false

  if (plan.activeType === 'section') {
    if (plan.targetParentId === plan.activeId) return false // 자기 자신 아래로 이동 금지
    if (isDescendant(tree.sections, plan.targetParentId, plan.activeId)) return false // cycle 방지
  }

  if (plan.sourceParentId === plan.targetParentId) {
    if (plan.position === 'inside') return false // 이미 그 폴더 안 — 변화 없음
    if (plan.originalSiblingIds && arraysEqual(plan.originalSiblingIds, plan.siblingIds)) return false // 같은 위치 Drop
  }

  return true
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

// ── cycle 방지: targetFolderId가 draggedFolderId의 하위(descendant)인지 검사 ──
// A → B → C 구조에서 isDescendant(C, A) === true (C는 A의 자손이므로 A를 C 안으로 이동하면 순환 발생)
function isDescendant(sections, targetFolderId, draggedFolderId) {
  if (!sections || targetFolderId == null || draggedFolderId == null) return false
  const byId = Object.fromEntries(sections.map(s => [s.id, s]))
  let current = byId[targetFolderId]
  while (current?.parent_id != null) {
    if (current.parent_id === draggedFolderId) return true
    current = byId[current.parent_id]
  }
  return false
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
