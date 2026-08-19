import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { api } from '../../api'
import ProjectSelector from './ProjectSelector'
import ProjectTree     from './ProjectTree'
import './LSidebar.css'

function LSidebar({
  currentProject, onProjectChange,
  onDocSelect, currentDocId,
  refreshKey, onTreeLoaded,
}) {
  const [projects, setProjects] = useState([])
  const [tree,     setTree]     = useState(null)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    try {
      const res = await api.project.list()
      setProjects(res.data)
      if (res.data.length > 0 && !currentProject) selectProject(res.data[0])
    } catch (e) { console.error(e) }
  }

  const selectProject = async (project) => {
    onProjectChange(project)
    setLoading(true)
    try {
      const res = await api.project.tree(project.id)
      setTree(res.data)
      onTreeLoaded?.(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ★ 트리 새로고침 — 이름 변경 후에도 호출
  const refreshTree = useCallback(async (project = currentProject) => {
    if (!project) return
    try {
      const res = await api.project.tree(project.id)
      setTree(res.data)
      onTreeLoaded?.(res.data)
    } catch (e) { console.error(e) }
  }, [currentProject, onTreeLoaded])

  useEffect(() => {
    if (refreshKey > 0) refreshTree()
  }, [refreshKey])

  const handleCreateProject = async () => {
    const title = window.prompt('프로젝트 이름을 입력하세요', '새 프로젝트')
    if (!title?.trim()) return
    try {
      const res = await api.project.create(title.trim())
      setProjects(prev => [...prev, res.data])
      selectProject(res.data)
    } catch (e) { alert(e.message) }
  }

  const handleRenameProject = async (projectId, currentTitle) => {
    const title = window.prompt('프로젝트 이름', currentTitle)
    if (!title?.trim() || title === currentTitle) return
    try {
      const res = await api.project.update(projectId, { title: title.trim() })
      setProjects(prev => prev.map(p => p.id === projectId ? res.data : p))
      if (currentProject?.id === projectId) onProjectChange(res.data)
    } catch (e) { alert(e.message) }
  }

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('프로젝트를 삭제하면 모든 문서가 삭제됩니다. 계속할까요?')) return
    try {
      await api.project.delete(projectId)
      const remaining = projects.filter(p => p.id !== projectId)
      setProjects(remaining)
      if (currentProject?.id === projectId) {
        if (remaining.length > 0) selectProject(remaining[0])
        else { onProjectChange(null); setTree(null); onTreeLoaded?.(null) }
      }
    } catch (e) { alert(e.message) }
  }

  const handleCreateSection = async (parentId, type = 'folder') => {
    const name = window.prompt('섹션 이름을 입력하세요')
    if (!name?.trim() || !currentProject) return
    try {
      await api.section.create(currentProject.id, name.trim(), type, parentId)
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  // ★ 폴더 이름 변경
  const handleRenameSection = async (sectionId, currentName) => {
    const name = window.prompt('섹션 이름을 입력하세요', currentName)
    if (!name?.trim() || name.trim() === currentName) return
    try {
      await api.section.update(sectionId, { name: name.trim() })
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('섹션과 안의 모든 문서를 삭제할까요?')) return
    try {
      await api.section.delete(sectionId)
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  const handleCreateDocument = async (sectionId = null) => {
    if (!currentProject) return
    try {
      const res = await api.document.create(currentProject.id, sectionId)
      await refreshTree()
      onDocSelect(res.data.id)
    } catch (e) { alert(e.message) }
  }

  // ── 3단계: 같은 부모 형제끼리 순서 변경 (Frontend 상태만, Backend 저장 없음) ──
  const handleReorderSiblings = ({ itemType, parentKey, activeId, overId }) => {
    if (activeId === overId) return

    setTree(prev => {
      if (!prev) return prev

      if (itemType === 'doc') {
        if (parentKey === 'root') {
          const oldIndex = prev.root_docs.findIndex(d => d.id === activeId)
          const newIndex = prev.root_docs.findIndex(d => d.id === overId)
          if (oldIndex === -1 || newIndex === -1) return prev
          return { ...prev, root_docs: arrayMove(prev.root_docs, oldIndex, newIndex) }
        }
        const sectionId = Number(parentKey.replace('sec-', ''))
        return {
          ...prev,
          sections: prev.sections.map(s => {
            if (s.id !== sectionId) return s
            const oldIndex = s.documents.findIndex(d => d.id === activeId)
            const newIndex = s.documents.findIndex(d => d.id === overId)
            if (oldIndex === -1 || newIndex === -1) return s
            return { ...s, documents: arrayMove(s.documents, oldIndex, newIndex) }
          }),
        }
      }

      if (itemType === 'section') {
        const oldIndex = prev.sections.findIndex(s => s.id === activeId)
        const newIndex = prev.sections.findIndex(s => s.id === overId)
        if (oldIndex === -1 || newIndex === -1) return prev
        if (prev.sections[oldIndex].parent_id !== prev.sections[newIndex].parent_id) return prev
        return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) }
      }

      return prev
    })
  }

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('문서를 삭제할까요?')) return
    try {
      await api.document.delete(docId)
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  return (
    <aside className="lsidebar">
      <ProjectSelector
        projects={projects}
        currentProject={currentProject}
        onSelect={selectProject}
        onCreate={handleCreateProject}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      <div className="lsidebar-tree-wrap">
        {!currentProject ? (
          <div className="lsidebar-empty">
            <p>프로젝트를 선택하거나</p>
            <p>새로 만들어주세요</p>
            <button onClick={handleCreateProject}>+ 새 프로젝트</button>
          </div>
        ) : loading ? (
          <div className="lsidebar-loading">불러오는 중...</div>
        ) : (
          <ProjectTree
            tree={tree}
            currentDocId={currentDocId}
            onDocSelect={onDocSelect}
            onCreateSection={handleCreateSection}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDocument}
            onRefresh={refreshTree}   // ★ 문서 이름 변경 후 새로고침
            onReorderSiblings={handleReorderSiblings}
          />
        )}
      </div>

    </aside>
  )
}

export default LSidebar