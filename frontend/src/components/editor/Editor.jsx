import { useState, useEffect, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import MenuBar    from '../menubar/MenuBar'       // ← 변경
import Breadcrumb from '../breadcrumb/Breadcrumb' // ← 변경
import Toolbar    from '../toolbar/Toolbar'       // ← 변경
import EditorPane from './EditorPane'
import './Editor.css'
import './EditorDropZone.css'
//import StatusBar  from '../statusbar/StatusBar'   // ← 변경

/**
 * Editor
 * - 제목 입력창 없음 (사이드바에서 관리)
 * - 분할 화면 지원
 */
function Editor({
  docId, project, tree,
  onDocSaved, onNewDoc, onNewProject,
  splitMode, setSplitMode,
  docId2, setDocId2,
  focusedPane, setFocusedPane,
  isDragging,
}) {
  const [mode, setMode] = useState('일반')

  const handleSaved = useCallback(() => onDocSaved?.(), [onDocSaved])

  const toggleSplit = () => {
    setSplitMode(p => {
      if (p) { setDocId2(null); setFocusedPane(1) }
      return !p
    })
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
        docId={focusedPane === 1 ? docId : docId2}
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

      {!docId ? (
        <div className="editor-empty">
          <div className="editor-empty-inner">
            <p>왼쪽 트리에서 문서를 선택하세요</p>
            <p className="editor-empty-hint">
              💡 문서를 드래그해서 에디터로 드롭할 수도 있어요
            </p>
          </div>
        </div>
      ) : (
        <div className={`editor-panes ${splitMode ? 'split' : ''}`}>

          <DroppablePane paneId="pane1" isDragging={isDragging}>
            <EditorPane
              docId={docId}
              mode={mode}
              onSaved={handleSaved}
              isFocused={focusedPane === 1}
              onFocus={() => setFocusedPane(1)}
            />
          </DroppablePane>

          {splitMode && <div className="editor-split-divider" />}

          {splitMode && (
            <DroppablePane paneId="pane2" isDragging={isDragging}>
              <EditorPane
                docId={docId2}
                mode={mode}
                onSaved={handleSaved}
                isFocused={focusedPane === 2}
                onFocus={() => setFocusedPane(2)}
              />
            </DroppablePane>
          )}
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
          <span>{paneId === 'pane2' ? '패널 2에서 열기' : '이 패널에서 열기'}</span>
        </div>
      )}
      {children}
    </div>
  )
}

export default Editor