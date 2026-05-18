import { useDroppable } from '@dnd-kit/core'
import './EditorDropZone.css'

/**
 * EditorDropZone
 * 사이드바에서 문서를 드래그해서 이 영역에 드롭하면 해당 문서가 열립니다.
 * EditorPane 을 감싸는 래퍼로 사용합니다.
 *
 * props:
 *   paneId      — 'pane1' | 'pane2' (어느 패널인지)
 *   isDragging  — 현재 드래그 중 여부 (드롭존 하이라이트용)
 *   children    — EditorPane
 */
function EditorDropZone({ paneId, isDragging, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `editor-drop-zone-${paneId}`,
    data: { type: 'editor-pane', paneId },
  })

  return (
    <div
      ref={setNodeRef}
      className={`editor-drop-zone ${isDragging ? 'drag-active' : ''} ${isOver ? 'drag-over' : ''}`}
    >
      {/* 드래그 중 오버레이 힌트 */}
      {isDragging && (
        <div className="drop-hint">
          <span className="drop-hint-icon">📄</span>
          <span className="drop-hint-text">여기에 드롭해서 열기</span>
        </div>
      )}
      {children}
    </div>
  )
}

export default EditorDropZone
