import { useState, useEffect } from 'react'
import { api } from '../../api'
import FileTree from './FileTree'
import DocList  from './DocList'
import './Sidebar.css'

function Sidebar({ onDocSelect }) {
  const [tab,    setTab]   = useState('explorer')
  const [tree,   setTree]  = useState(null)
  const [folder, setFolder]= useState('')
  const [docs,   setDocs]  = useState([])

  useEffect(() => {
    api.document.list()
      .then(res => setDocs(res.data))
      .catch(console.error)
  }, [])

  const handleOpenFolder = async () => {
    const path = window.prompt('폴더 경로를 입력하세요\n예) C:\\Users\\user\\Documents')
    if (!path) return
    try {
      const res = await api.explorer.open(path)
      setFolder(path)
      setTree(res.data)
      setTab('explorer')
    } catch (e) { alert(e.message) }
  }

  const handleNewDoc = async () => {
    try {
      const res = await api.document.create()
      setDocs(prev => [res.data, ...prev])
      onDocSelect(res.data.id)
    } catch (e) { alert(e.message) }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className={`tab-btn ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>탐색기</button>
        <button className={`tab-btn ${tab === 'docs'     ? 'active' : ''}`} onClick={() => setTab('docs')}>문서</button>
        <button className="icon-btn" onClick={handleOpenFolder} title="폴더 열기">＋</button>
      </div>

      <div className="sidebar-body">
        {tab === 'explorer' && <FileTree tree={tree} onOpenFolder={handleOpenFolder} />}
        {tab === 'docs'     && <DocList  docs={docs} onSelect={onDocSelect} onNew={handleNewDoc} />}
      </div>

      <div className="sidebar-footer">
        <button className="footer-btn" onClick={handleOpenFolder}>폴더 열기...</button>
      </div>
    </aside>
  )
}

export default Sidebar
