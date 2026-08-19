import { useState, useEffect, useCallback, Fragment } from 'react'
import { useDndContext, useDndMonitor, useDroppable } from '@dnd-kit/core'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import MenuBar    from '../menubar/MenuBar'
import Breadcrumb from '../breadcrumb/Breadcrumb'
import Toolbar    from '../toolbar/Toolbar'
import EditorPane from './EditorPane'
import './Editor.css'
import './EditorDropZone.css'
//import StatusBar  from '../statusbar/StatusBar'

// EditorPane Drop 위치 판정 기준 — 가로 폭 비율 (왼쪽 25% / 가운데 50% / 오른쪽 25%)
const EDITOR_DROP_LEFT_RATIO  = 0.25
const EDITOR_DROP_RIGHT_RATIO = 0.75

// ── Drop 판정 로직 (UI 렌더링과 분리) ──
// 드래그 중인 아이템의 현재 rect 중심 x좌표가 대상(over) pane rect 안에서 몇 %(offsetRatio) 지점인지로 left/center/right 판정
function computeEditorDropPosition(active, over) {
  const overRect   = over?.rect
  const activeRect = active?.rect?.current?.translated ?? active?.rect?.current?.initial
  if (!overRect || !activeRect) return null

  const pointerX     = activeRect.left + activeRect.width / 2
  const offsetRatio  = (pointerX - overRect.left) / overRect.width

  if (offsetRatio < EDITOR_DROP_LEFT_RATIO)  return 'left'
  if (offsetRatio > EDITOR_DROP_RIGHT_RATIO) return 'right'
  return 'center'
}

// dropZone 값 동등 비교 — paneId/position이 같으면 이전 state 참조를 그대로 반환해 불필요한 setState/rerender 방지
function sameDropZone(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return a.paneId === b.paneId && a.position === b.position
}

/**
 * Editor
 * - 제목 입력창 없음 (사이드바에서 관리)
 * - pane 배열 기반 좌우 분할 화면 지원 (1차: 최대 2분할)
 */
function Editor({
  panes, activePaneId, onPaneFocus, onSplit, onClosePane,
  project, tree,
  onDocSaved, onNewDoc, onNewProject,
  onOpenInPane, onSplitPane,
}) {
  const [mode, setMode] = useState('일반')

  // dropZone: 현재 document Drag가 어느 pane의 어느 위치(left/center/right) 위에 있는지 — 시각화 전용 상태
  // { paneId, position: 'left'|'center'|'right' } | null
  const [dropZone, setDropZone] = useState(null)

  // ── EditorPane 위 Drop 위치(left/center/right) 판정 + center Drop 처리 ──
  // active.data.current → 드래그된 문서 정보(ProjectTree.jsx의 document Drag 데이터, { type: 'document', docId, ... })
  // over.data.current    → 어느 EditorPane인지(DroppablePane의 { type: 'editor-pane', paneId })
  //
  // ★ onDragOver가 아니라 onDragMove를 씀 — onDragOver는 dnd-kit이 "over"(현재 hover 중인
  // droppable id)가 바뀔 때만 발동시킨다. 같은 EditorPane 내부에서 좌→우로 움직여도
  // over.id(`editor-drop-zone-${paneId}`)는 그대로라 onDragOver가 재실행되지 않고
  // 최초 진입 시 계산된 position이 그대로 굳어버리는 게 버그 원인이었다. onDragMove는
  // over 변화 여부와 무관하게 pointer가 움직일 때마다 매번 발동하므로, 같은 pane
  // 안에서의 좌우 이동도 매 tick 재계산된다. active.rect.current.translated는 이
  // 이벤트에서도 dnd-kit이 그때그때 갱신해서 넘겨주므로 좌표 자체는 그대로 신뢰 가능.
  useDndMonitor({
    onDragMove: (event) => {
      const { active, over } = event
      let next = null

      if (over) {
        const activeData = active.data?.current
        const overData    = over.data?.current
        if (activeData?.type === 'document' && overData?.type === 'editor-pane') {
          const position = computeEditorDropPosition(active, over)
          next = position ? { paneId: overData.paneId, position } : null
        }
      }

      setDropZone(prev => sameDropZone(prev, next) ? prev : next)
    },
    onDragEnd: (event) => {
      setDropZone(null)

      const { active, over } = event
      if (!over) return
      const activeData = active.data?.current
      const overData    = over.data?.current
      if (activeData?.type !== 'document') return    // document만 허용 — 폴더는 무시
      if (overData?.type !== 'editor-pane') return    // EditorPane Drop Target이 아니면 무시(트리 내부 이동은 ProjectTree.jsx가 처리)

      const position = computeEditorDropPosition(active, over)
      const targetPane = panes.find(p => p.id === overData.paneId)
      if (!targetPane) return

      if (position === 'center') {
        // center Drop → 그 pane에서 문서 열기. App.jsx의 setPaneDocument 재사용(사이드바 클릭과 동일 경로, 동일 문서면 no-op).
        onOpenInPane?.(overData.paneId, activeData.docId)
        return
      }

      // left/right — target pane이 이미 비어있으면(요구사항 9·10) 분할하지 않고
      // center와 똑같이 그 자리에서 열기(불필요한 빈 pane + 새 pane 조합 방지)
      if (targetPane.docId == null) {
        onOpenInPane?.(overData.paneId, activeData.docId)
        return
      }

      // 실제 문서가 열려있는 pane의 left/right → 그 옆에 새 pane 생성 후 문서 열기
      onSplitPane?.(overData.paneId, activeData.docId, position)
    },
    onDragCancel: () => setDropZone(null),
  })

  const handleSaved = useCallback(() => onDocSaved?.(), [onDocSaved])

  const activePane = panes.find(p => p.id === activePaneId) ?? panes[0]
  const docId      = activePane?.docId ?? null
  const splitMode  = panes.length > 1

  const toggleSplit = () => {
    if (splitMode) {
      onClosePane?.(panes[panes.length - 1].id)
    } else {
      onSplit?.()
    }
  }

  // F3: 일반 ↔ 마크다운
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setMode(p => p === '마크다운' ? '일반' : '마크다운')
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  // Ctrl+S
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        window.__activePaneSave?.()
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  if (!project) {
    return (
      <div className="editor-wrap">
        <MenuBar
          mode={mode} onModeChange={setMode}
          onNewProject={onNewProject}
          splitMode={splitMode} onToggleSplit={toggleSplit}
        />
        <div className="editor-empty">
          <p>먼저 프로젝트를 선택하거나 만들어주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-wrap">

      <MenuBar
        mode={mode}
        onModeChange={setMode}
        onSave={() => window.__activePaneSave?.()}
        onNewDoc={onNewDoc}
        onNewProject={onNewProject}
        splitMode={splitMode}
        onToggleSplit={toggleSplit}
      />

      <Breadcrumb
        project={project}
        docId={docId}
        tree={tree}
      />

      <Toolbar
        mode={mode}
        onModeChange={setMode}
        onSave={() => window.__activePaneSave?.()}
        splitMode={splitMode}
        onToggleSplit={toggleSplit}
      />

      {/* ★ 제목 입력창 없음 */}

      {/* pane은 항상 최소 1개 존재(App.jsx가 보장) — 문서 없는 pane도 여기서 렌더해야
          DroppablePane(Drop Zone)과 닫기 버튼이 빈 pane에서도 유지된다(요구사항 4) */}
      <div className="editor-panes">
        <PanelGroup orientation="horizontal">
          {panes.map((pane, idx) => (
            <Fragment key={pane.id}>
              {idx > 0 && <PanelResizeHandle className="editor-resize-handle" />}
              <Panel minSize="20%">
                <DroppablePane paneId={pane.id} dropZone={dropZone}>
                  <EditorPane
                    docId={pane.docId}
                    mode={mode}
                    onSaved={handleSaved}
                    isFocused={pane.id === activePaneId}
                    onFocus={() => onPaneFocus?.(pane.id)}
                    onClose={() => onClosePane?.(pane.id)}
                  />
                </DroppablePane>
              </Panel>
            </Fragment>
          ))}
        </PanelGroup>
      </div>
    </div>
  )
}

function DroppablePane({ paneId, dropZone, children }) {
  // 현재 드래그 중인 아이템이 document 타입인지 — 폴더 Drag 중엔 이 pane을 Drop Target으로 취급하지 않음(요구사항 5)
  const { active } = useDndContext()
  const isDraggingDocument = active?.data?.current?.type === 'document'

  const { isOver, setNodeRef } = useDroppable({
    id: `editor-drop-zone-${paneId}`,
    data: { type: 'editor-pane', paneId },
    disabled: !isDraggingDocument,
  })

  // 이 pane이 현재 dropZone의 대상일 때만 자신의 zone을 강조 — 분할된 다른 pane엔 영향 없음(요구사항 7)
  const activeZone = isDraggingDocument && dropZone?.paneId === paneId ? dropZone.position : null

  return (
    <div
      ref={setNodeRef}
      className={`editor-drop-zone
        ${isDraggingDocument ? 'drag-active' : ''}
        ${isOver && isDraggingDocument ? 'drag-over' : ''}`}
    >
      {isDraggingDocument && (
        <div className="drop-hint">
          <span>📄</span>
          <span>이 패널에서 열기</span>
        </div>
      )}
      {activeZone && <div className={`editor-drop-zone-overlay zone-${activeZone}`} />}
      {children}
    </div>
  )
}

export default Editor