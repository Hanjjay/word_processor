import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import ProjectSelector from './ProjectSelector'
import ProjectTree     from './ProjectTree'
import './Sidebar.css'

/**
 * Sidebar
 * - 상단: 프로젝트 선택기 (ProjectSelector)
 * - 하단: 선택된 프로젝트의 섹션·문서 트리 (ProjectTree)
 *
 * props:
 *   currentProject   — 현재 프로젝트 객체
 *   onProjectChange  — 프로젝트 변경 콜백
 *   onDocSelect      — 문서 선택 콜백 (docId)
 *   currentDocId     — 현재 열린 문서 ID (활성 표시용)
 */
function Sidebar({ currentProject, onProjectChange, onDocSelect, currentDocId }) {
  const [projects,    setProjects]    = useState([])
  const [tree,        setTree]        = useState(null)   // { sections, root_docs }
  const [loading,     setLoading]     = useState(false)

  // ── 프로젝트 목록 로드 ──────────────────────────────
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await api.project.list()
      setProjects(res.data)
      // 프로젝트가 있으면 첫 번째 자동 선택
      if (res.data.length > 0 && !currentProject) {
        selectProject(res.data[0])
      }
    } catch (e) { console.error(e) }
  }

  // ── 프로젝트 선택 → 트리 로드 ──────────────────────
  const selectProject = async (project) => {
    onProjectChange(project)
    setLoading(true)
    try {
      const res = await api.project.tree(project.id)
      setTree(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── 트리 새로고침 ────────────────────────────────────
  const refreshTree = useCallback(async () => {
    if (!currentProject) return
    try {
      const res = await api.project.tree(currentProject.id)
      setTree(res.data)
    } catch (e) { console.error(e) }
  }, [currentProject])

  // ── 새 프로젝트 생성 ─────────────────────────────────
  const handleCreateProject = async () => {
    const title = window.prompt('프로젝트 이름을 입력하세요', '새 프로젝트')
    if (!title?.trim()) return
    try {
      const res = await api.project.create(title.trim())
      const newProject = res.data
      setProjects(prev => [...prev, newProject])
      selectProject(newProject)
    } catch (e) { alert(e.message) }
  }

  // ── 프로젝트 이름 수정 ───────────────────────────────
  const handleRenameProject = async (projectId, currentTitle) => {
    const title = window.prompt('프로젝트 이름', currentTitle)
    if (!title?.trim() || title === currentTitle) return
    try {
      const res = await api.project.update(projectId, { title: title.trim() })
      setProjects(prev => prev.map(p => p.id === projectId ? res.data : p))
      if (currentProject?.id === projectId) onProjectChange(res.data)
    } catch (e) { alert(e.message) }
  }

  // ── 프로젝트 삭제 ────────────────────────────────────
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('프로젝트를 삭제하면 모든 문서가 삭제됩니다. 계속할까요?')) return
    try {
      await api.project.delete(projectId)
      const remaining = projects.filter(p => p.id !== projectId)
      setProjects(remaining)
      if (currentProject?.id === projectId) {
        if (remaining.length > 0) selectProject(remaining[0])
        else { onProjectChange(null); setTree(null) }
      }
    } catch (e) { alert(e.message) }
  }

  // ── 새 섹션 생성 ─────────────────────────────────────
  const handleCreateSection = async (parentId, sectionType = 'folder') => {
    const name = window.prompt('섹션 이름을 입력하세요')
    if (!name?.trim() || !currentProject) return
    try {
      await api.section.create(
        currentProject.id, name.trim(), sectionType, parentId
      )
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  // ── 섹션 이름 수정 ───────────────────────────────────
  const handleRenameSection = async (sectionId, currentName) => {
    const name = window.prompt('섹션 이름', currentName)
    if (!name?.trim() || name === currentName) return
    try {
      await api.section.update(sectionId, { name: name.trim() })
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  // ── 섹션 삭제 ────────────────────────────────────────
  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('섹션과 안의 모든 문서를 삭제할까요?')) return
    try {
      await api.section.delete(sectionId)
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  // ── 새 문서 생성 ─────────────────────────────────────
  const handleCreateDocument = async (sectionId = null) => {
    if (!currentProject) return
    try {
      const res = await api.document.create(currentProject.id, sectionId)
      await refreshTree()
      onDocSelect(res.data.id)
    } catch (e) { alert(e.message) }
  }

  // ── 문서 삭제 ────────────────────────────────────────
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('문서를 삭제할까요?')) return
    try {
      await api.document.delete(docId)
      refreshTree()
    } catch (e) { alert(e.message) }
  }

  return (
    <aside className="sidebar">

      {/* 프로젝트 선택기 */}
      <ProjectSelector
        projects={projects}
        currentProject={currentProject}
        onSelect={selectProject}
        onCreate={handleCreateProject}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      {/* 프로젝트 트리 */}
      <div className="sidebar-tree-wrap">
        {!currentProject ? (
          <div className="sidebar-empty">
            <p>프로젝트를 선택하거나</p>
            <p>새로 만들어주세요</p>
            <button onClick={handleCreateProject}>+ 새 프로젝트</button>
          </div>
        ) : loading ? (
          <div className="sidebar-loading">불러오는 중...</div>
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
          />
        )}
      </div>

    </aside>
  )
}

export default Sidebar
