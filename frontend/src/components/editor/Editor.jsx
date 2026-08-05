import { useState, useEffect, useCallback, Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import MenuBar    from '../menubar/MenuBar'
import Breadcrumb from '../breadcrumb/Breadcrumb'
import Toolbar    from '../toolbar/Toolbar'
import EditorPane from './EditorPane'
import './Editor.css'
import './EditorDropZone.css'
//import StatusBar  from '../statusbar/StatusBar'

/**
 * Editor
 * - 제목 입력창 없음 (사이드바에서 관리)
 * - pane 배열 기반 좌우 분할 화면 지원 (1차: 최대 2분할)
 */
function Editor({
  panes, activePaneId, onPaneFocus, onSplit, onClosePane,
  project, tree,
  onDocSaved, onNewDoc, onNewProject,
  isDragging,
}) {
  const [mode, setMode] = useState('일반')

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

      {!docId && !splitMode ? (
        <div className="editor-empty">
          <div className="editor-empty-inner">
            <p>왼쪽 트리에서 문서를 선택하세요</p>
            <p className="editor-empty-hint">
              💡 문서를 드래그해서 에디터로 드롭할 수도 있어요
            </p>
          </div>
        </div>
      ) : (
        <div className="editor-panes">
          <PanelGroup orientation="horizontal">
            {panes.map((pane, idx) => (
              <Fragment key={pane.id}>
                {idx > 0 && <PanelResizeHandle className="editor-resize-handle" />}
                <Panel minSize="20%">
                  <DroppablePane paneId={pane.id} isDragging={isDragging}>
                    <EditorPane
                      docId={pane.docId}
                      mode={mode}
                      onSaved={handleSaved}
                      isFocused={pane.id === activePaneId}
                      onFocus={() => onPaneFocus?.(pane.id)}
                    />
                  </DroppablePane>
                </Panel>
              </Fragment>
            ))}
          </PanelGroup>
        </div>
      )}
    </div>
  )
}

function DroppablePane({ paneId, isDragging, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `editor-drop-zone-${paneId}`,
    data: { type: 'editor-pane', paneId },
  })

  return (
    <div
      ref={setNodeRef}
      className={`editor-drop-zone
        ${isDragging ? 'drag-active' : ''}
        ${isOver     ? 'drag-over'   : ''}`}
    >
      {isDragging && (
        <div className="drop-hint">
          <span>📄</span>
          <span>이 패널에서 열기</span>
        </div>
      )}
      {children}
    </div>
  )
}

export default Editor