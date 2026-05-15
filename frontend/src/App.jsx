import { useState } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Editor  from './components/editor/Editor'
import './App.css'

function App() {
  // 현재 선택된 프로젝트
  const [currentProject, setCurrentProject] = useState(null)

  // 현재 열린 문서 ID (DB 문서)
  const [currentDocId, setCurrentDocId] = useState(null)

  // 사이드바에서 문서 선택
  const handleDocSelect = (docId) => {
    setCurrentDocId(docId)
  }

  // 프로젝트 변경 시 문서 초기화
  const handleProjectChange = (project) => {
    setCurrentProject(project)
    setCurrentDocId(null)
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentProject={currentProject}
        onProjectChange={handleProjectChange}
        onDocSelect={handleDocSelect}
        currentDocId={currentDocId}
      />
      <Editor
        docId={currentDocId}
        project={currentProject}
      />
    </div>
  )
}

export default App
