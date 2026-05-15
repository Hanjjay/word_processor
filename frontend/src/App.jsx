import { useState } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Editor  from './components/editor/Editor'
import './App.css'

function App() {
  // DB 문서 ID (null이면 미선택)
  const [currentDocId, setCurrentDocId] = useState(null)

  // 탐색기에서 연 파일 정보 (null이면 파일 모드 아님)
  const [fileData, setFileData] = useState(null)
  // { path, content, mode, filename }

  // 탐색기 파일 클릭 → 파일 모드로 전환
  const handleFileOpen = (path, content, mode, filename) => {
    setCurrentDocId(null)          // DB 문서 모드 해제
    setFileData({ path, content, mode, filename })
  }

  // DB 문서 선택 → 파일 모드 해제
  const handleDocSelect = (docId) => {
    setFileData(null)              // 파일 모드 해제
    setCurrentDocId(docId)
  }

  return (
    <div className="app-layout">
      <Sidebar
        onDocSelect={handleDocSelect}
        onFileOpen={handleFileOpen}
      />
      <Editor
        docId={currentDocId}
        fileData={fileData}
      />
    </div>
  )
}

export default App
