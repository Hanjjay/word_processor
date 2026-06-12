import { useState, useCallback } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Editor  from './components/editor/Editor'
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

  // Sidebar가 트리를 로드하면 App에도 공유
  const handleTreeLoaded = useCallback((loadedTree) => {
    setTree(loadedTree)
  }, [])

  // 새 문서 생성 — Sidebar 내부 함수를 직접 호출하기 어려우므로
  // refreshKey 증가로 Sidebar 측에서 처리
  const handleNewDoc = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // 사이드바에서 문서 선택 → activePane의 docId만 변경
  const handleDocSelect = useCallback((docId) => {
    setPanes(prev => prev.map(p => p.id === activePaneId ? { ...p, docId } : p))
  }, [activePaneId])

  // 분할 버튼 → active pane의 docId를 복제한 새 pane 추가 (1차: 좌우 2분할까지)
  const handleSplit = useCallback(() => {
    setPanes(prev => {
      if (prev.length >= 2) return prev
      const active = prev.find(p => p.id === activePaneId) ?? prev[0]
      return [...prev, { id: `pane-${Date.now()}`, docId: active.docId }]
    })
  }, [activePaneId])

  // pane 닫기 (분할 닫기)
  const handleClosePane = useCallback((paneId) => {
    setPanes(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(p => p.id !== paneId)
      if (activePaneId === paneId) setActivePaneId(next[0].id)
      return next
    })
  }, [activePaneId])

  const activePane    = panes.find(p => p.id === activePaneId) ?? panes[0]
  const currentDocId  = activePane?.docId ?? null

  return (
    <div className="app-layout">
      <Sidebar
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
      />
    </div>
  )
}

export default App
