import { useState, useEffect } from 'react'
import { api } from '../../api'
import FileTree from './FileTree'
import DocList  from './DocList'
import './Sidebar.css'

/**
 * props:
 *   onDocSelect(docId)          — DB 문서 선택
 *   onFileOpen(path, content, mode, filename) — 탐색기 파일 열기
 */
function Sidebar({ onDocSelect, onFileOpen }) {
  const [tab,    setTab]    = useState('explorer')
  const [tree,   setTree]   = useState(null)
  const [folder, setFolder] = useState('')
  const [docs,   setDocs]   = useState([])

  // 앱 시작 시 workspace + 문서 목록 로드
  useEffect(() => {
    fetch('/api/workspace')
      .then(r => r.json())
      .then(async res => {
        const path = res.data.path
        setFolder(path)
        const treeRes = await api.explorer.open(path)
        setTree(treeRes.data)
      })
      .catch(console.error)

    api.document.list()
      .then(res => setDocs(res.data))
      .catch(console.error)
  }, [])

  // 폴더 열기
  const handleOpenFolder = async () => {
    const path = window.prompt('폴더 경로를 입력하세요', folder || '')
    if (!path) return
    try {
      const res = await api.explorer.open(path)
      setFolder(path)
      setTree(res.data)
      setTab('explorer')
    } catch (e) { alert(e.message) }
  }

  // 새로고침
  const handleRefresh = async () => {
    if (!folder) return
    try {
      const res = await api.explorer.open(folder)
      setTree(res.data)
    } catch (e) { console.error(e) }
  }

  // ★ 파일 트리에서 파일 클릭 → 내용 읽어서 에디터로 전달
  const handleFileSelect = async (path) => {
    try {
      const res = await fetch(
        `/api/explorer/read?path=${encodeURIComponent(path)}`
      )
      const data = await res.json()
      if (data.status !== 'ok') throw new Error(data.detail)
      // 부모(App)에 파일 정보 전달
      onFileOpen?.(
        path,
        data.data.content,
        data.data.mode,
        data.data.filename
      )
    } catch (e) {
      alert(`파일을 열 수 없습니다: ${e.message}`)
    }
  }

  // 새 문서 생성
  const handleNewDoc = async () => {
    try {
      const res = await api.document.create()
      setDocs(prev => [res.data, ...prev])
      onDocSelect(res.data.id)
      if (folder) {
        const treeRes = await api.explorer.open(folder)
        setTree(treeRes.data)
      }
    } catch (e) { alert(e.message) }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          className={`tab-btn ${tab === 'explorer' ? 'active' : ''}`}
          onClick={() => setTab('explorer')}
        >탐색기</button>
        <button
          className={`tab-btn ${tab === 'docs' ? 'active' : ''}`}
          onClick={() => setTab('docs')}
        >문서</button>
        <button className="icon-btn" onClick={handleOpenFolder} title="폴더 변경">⋯</button>
      </div>

      <div className="sidebar-body">
        {tab === 'explorer' && (
          <FileTree
            tree={tree}
            onOpenFolder={handleOpenFolder}
            onRefresh={handleRefresh}
            onFileSelect={handleFileSelect}   // ★ 연결
          />
        )}
        {tab === 'docs' && (
          <DocList docs={docs} onSelect={onDocSelect} onNew={handleNewDoc} />
        )}
      </div>

      <div className="sidebar-footer">
        <button className="footer-btn" onClick={handleOpenFolder}>폴더 변경...</button>
      </div>
    </aside>
  )
}

export default Sidebar
