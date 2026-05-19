import { useState, useCallback } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Editor  from './components/editor/Editor'
import './App.css'

function App() {
  const [currentProject, setCurrentProject] = useState(null)
  const [currentDocId,   setCurrentDocId]   = useState(null)
  const [tree,           setTree]           = useState(null)  // 빵부스러기용
  const [refreshKey,     setRefreshKey]     = useState(0)
  const [focusedPane,    setFocusedPane]    = useState(1)

  const handleDocSaved = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const handleProjectChange = (project) => {
    setCurrentProject(project)
    setCurrentDocId(null)
    setTree(null)
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

  return (
    <div className="app-layout">
      <Sidebar
        currentProject={currentProject}
        onProjectChange={handleProjectChange}
        onDocSelect={setCurrentDocId}
        onTreeLoaded={handleTreeLoaded}
        currentDocId={currentDocId}
        refreshKey={refreshKey}
      />
      <Editor
        docId={currentDocId}
        project={currentProject}
        tree={tree}
        focusedPane={focusedPane}
        setFocusedPane={setFocusedPane}
        onDocSaved={handleDocSaved}
        onNewDoc={handleNewDoc}
        onNewProject={() => setRefreshKey(k => k + 1)}
      />
    </div>
  )
}

export default App
