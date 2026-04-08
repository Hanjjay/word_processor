import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../api'
import Toolbar   from './Toolbar'
import A4Paper   from './A4Paper'
import StatusBar from './StatusBar'
import './Editor.css'

function Editor({ docId }) {
  const [doc,       setDoc]       = useState(null)
  const [content,   setContent]   = useState('')
  const [mode,      setMode]      = useState('일반')
  const [charCount, setCharCount] = useState(0)
  const [saveState, setSaveState] = useState('저장됨')
  const autosaveTimer = useRef(null)

  useEffect(() => {
    if (!docId) return
    api.document.get(docId)
      .then(res => {
        setDoc(res.data)
        setContent(res.data.content)
        setMode(res.data.mode)
        setSaveState('저장됨')
        setCharCount(res.data.content.replace(/\s/g, '').length)
      })
      .catch(console.error)
  }, [docId])

  const handleContentChange = useCallback((val) => {
    setContent(val)
    setSaveState('저장 안 됨')
    setCharCount(val.replace(/\s/g, '').length)

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      if (!docId) return
      api.document.autosave(docId, val)
        .then(() => setSaveState('저장됨'))
        .catch(console.error)
    }, 3000)
  }, [docId])

  const handleSave = useCallback(async () => {
    if (!docId || !doc) return
    try {
      await api.document.save(docId, doc.title, content, mode)
      setSaveState('저장됨')
    } catch (e) { alert(e.message) }
  }, [docId, doc, content, mode])

  const handleSnapshot = useCallback(async () => {
    if (!docId) return
    const memo = window.prompt('스냅샷 메모 (선택사항)') ?? ''
    try {
      await api.snapshot.take(docId, content, memo)
      alert('스냅샷이 저장되었습니다.')
    } catch (e) { alert(e.message) }
  }, [docId, content])

  if (!docId) {
    return (
      <div className="editor-empty">
        <p>왼쪽에서 문서를 선택하거나 새 문서를 만드세요</p>
      </div>
    )
  }

  return (
    <div className="editor-wrap">
      <Toolbar mode={mode} onModeChange={setMode} onSave={handleSave} onSnapshot={handleSnapshot} />
      <div className="editor-canvas">
        <A4Paper content={content} onChange={handleContentChange} mode={mode} />
      </div>
      <StatusBar charCount={charCount} mode={mode} saveState={saveState} />
    </div>
  )
}

export default Editor
