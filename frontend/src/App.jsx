import { useState } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Editor  from './components/editor/Editor'
import './App.css'

function App() {
  const [currentDocId, setCurrentDocId] = useState(null)

  return (
    <div className="app-layout">
      <Sidebar onDocSelect={setCurrentDocId} />
      <Editor  docId={currentDocId} />
    </div>
  )
}

export default App
