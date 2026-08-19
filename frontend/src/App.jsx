import { useState, useCallback } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import LSidebar from './components/lsidebar/LSidebar'
import Editor  from './components/editor/Editor'
import RSidebar from './components/rsidebar/RSidebar'
//import MenuBar     from './components/menubar/MenuBar'       // ← 변경
import './App.css'

const INITIAL_PANES = [{ id: 'pane-1', docId: null }]

function App() {
  const [currentProject, setCurrentProject] = useState(null)
  const [tree,           setTree]           = useState(null)  // 빵부스러기용
  const [refreshKey,     setRefreshKey]     = useState(0)

  // 분할 편집 영역 — pane 배열 + 활성 pane id
  const [panes,        setPanes]        = useState(INITIAL_PANES)
  const [activePaneId, setActivePaneId] = useState(INITIAL_PANES[0].id)

  const handleDocSaved = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const handleProjectChange = (project) => {
    setCurrentProject(project)
    setTree(null)
    setPanes(INITIAL_PANES)
    setActivePaneId(INITIAL_PANES[0].id)
  }

  // LSidebar가 트리를 로드하면 App에도 공유
  const handleTreeLoaded = useCallback((loadedTree) => {
    setTree(loadedTree)
  }, [])

  // 새 문서 생성 — LSidebar 내부 함수를 직접 호출하기 어려우므로
  // refreshKey 증가로 LSidebar 측에서 처리
  const handleNewDoc = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // 특정 pane의 docId를 바꾸는 단일 지점 — 사이드바 클릭(handleDocSelect)과
  // ProjectTree → EditorPane Drag&Drop이 이 함수 하나를 공유해서 재사용한다.
  // pane.docId만 바뀌면 EditorPane의 기존 useEffect(문서 로드 + Yjs acquire)가
  // 그대로 실행되므로, 여기서 별도의 문서 로딩 로직을 새로 만들지 않는다.
  const setPaneDocument = useCallback((paneId, docId) => {
    setPanes(prev => {
      const target = prev.find(p => p.id === paneId)
      if (!target || target.docId === docId) return prev // 이미 같은 문서면 불필요한 재로딩 방지
      return prev.map(p => p.id === paneId ? { ...p, docId } : p)
    })
  }, [])

  // 사이드바에서 문서 선택 → activePane의 docId만 변경
  const handleDocSelect = useCallback((docId) => {
    setPaneDocument(activePaneId, docId)
  }, [activePaneId, setPaneDocument])

  // 분할 버튼 → active pane의 docId를 복제한 새 pane 추가 (1차: 좌우 2분할까지)
  const handleSplit = useCallback(() => {
    setPanes(prev => {
      if (prev.length >= 2) return prev
      const active = prev.find(p => p.id === activePaneId) ?? prev[0]
      return [...prev, { id: `pane-${Date.now()}`, docId: active.docId }]
    })
  }, [activePaneId])

  // EditorPane left/right Drop → target pane 옆에 새 pane 삽입, 그 자리에 docId 설정.
  // handleSplit과 목적은 비슷하지만 (a) 임의 위치(target 옆)에 끼워 넣어야 하고
  // (b) activePane이 아니라 "드롭된 문서"의 docId를 써야 하고 (c) 2개 제한도 없어야 해서
  // handleSplit을 그대로 호출할 수는 없다 — 대신 그 함수가 쓰던 것과 같은 paneId 생성 규칙
  // (`pane-${Date.now()}`)과 setPanes 불변 배열 패턴을 그대로 재사용한다.
  // 빈 pane(docId === null)에 떨어진 경우는 이 함수를 타지 않고 Editor.jsx가 기존
  // onOpenInPane(=setPaneDocument, center Drop과 동일 경로)으로 처리한다.
  const handleSplitPane = useCallback((targetPaneId, docId, side) => {
    setPanes(prev => {
      const idx = prev.findIndex(p => p.id === targetPaneId)
      if (idx === -1) return prev

      const newPane = { id: `pane-${Date.now()}`, docId }
      const insertAt = side === 'left' ? idx : idx + 1
      const next = [...prev]
      next.splice(insertAt, 0, newPane)
      return next
    })
  }, [])

  // pane 닫기 — 2개 이상이면 그 pane만 제거, 마지막 1개 남았을 때는 배열을 비우지 않고
  // 같은 paneId를 유지한 채 docId만 null로 비운다("문서 없음" ≠ "Editor 영역 없음").
  // docId를 null로 바꾸는 것만으로 EditorPane의 기존 docId effect가 releaseYDoc까지 그대로 처리한다.
  const handleClosePane = useCallback((paneId) => {
    setPanes(prev => {
      if (prev.length <= 1) {
        const only = prev[0]
        if (!only || only.docId == null) return prev // 이미 빈 pane이면 변화 없음
        return [{ ...only, docId: null }]
      }
      const next = prev.filter(p => p.id !== paneId)
      if (activePaneId === paneId) setActivePaneId(next[0].id)
      return next
    })
  }, [activePaneId])

  const activePane    = panes.find(p => p.id === activePaneId) ?? panes[0]
  const currentDocId  = activePane?.docId ?? null

  // ProjectTree(파일 draggable)와 Editor(EditorPane droppable)가 같은 Drag 세션을
  // 공유해야 하므로 DndContext를 여기(둘의 공통 상위)에 둔다 — 기존에 ProjectTree.jsx
  // 안에만 있던 DndContext를 재사용하는 것이지 새로 만드는 것이 아니다.
  // ProjectTree.jsx는 useDndMonitor로, Editor.jsx는 useDroppable/useDndContext로 이 컨텍스트를 구독한다.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  return (
    <DndContext sensors={sensors}>
      <div className="app-layout">
        <LSidebar
          currentProject={currentProject}
          onProjectChange={handleProjectChange}
          onDocSelect={handleDocSelect}
          onTreeLoaded={handleTreeLoaded}
          currentDocId={currentDocId}
          refreshKey={refreshKey}
        />
        <Editor
          panes={panes}
          activePaneId={activePaneId}
          onPaneFocus={setActivePaneId}
          onSplit={handleSplit}
          onClosePane={handleClosePane}
          project={currentProject}
          tree={tree}
          onDocSaved={handleDocSaved}
          onNewDoc={handleNewDoc}
          onNewProject={() => setRefreshKey(k => k + 1)}
          onOpenInPane={setPaneDocument}
          onSplitPane={handleSplitPane}
        />
        <RSidebar />
      </div>
    </DndContext>
  )
}

export default App
