import { useState } from 'react'
import './ProjectSelector.css'

/**
 * ProjectSelector
 * 사이드바 상단 — 현재 프로젝트 표시 및 전환
 */
function ProjectSelector({
  projects, currentProject,
  onSelect, onCreate, onRename, onDelete
}) {
  const [open, setOpen] = useState(false)

  const toggleDropdown = () => setOpen(o => !o)
  const close          = () => setOpen(false)

  const handleSelect = (project) => {
    onSelect(project)
    close()
  }

  return (
    <div className="ps-wrap">

      {/* 현재 프로젝트 버튼 */}
      <div className="ps-current" onClick={toggleDropdown}>
        <div className="ps-current-left">
          <span
            className="ps-dot"
            style={{ background: currentProject?.cover_color ?? '#5b4fcf' }}
          />
          <span className="ps-title">
            {currentProject?.title ?? '프로젝트 없음'}
          </span>
        </div>
        <span className="ps-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {/* 드롭다운 */}
      {open && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div className="ps-backdrop" onClick={close} />

          <div className="ps-dropdown">
            <div className="ps-dropdown-label">프로젝트 목록</div>

            {projects.map(p => (
              <div
                key={p.id}
                className={`ps-item ${currentProject?.id === p.id ? 'active' : ''}`}
              >
                <div className="ps-item-main" onClick={() => handleSelect(p)}>
                  <span className="ps-dot" style={{ background: p.cover_color }} />
                  <span className="ps-item-title">{p.title}</span>
                </div>
                <div className="ps-item-actions">
                  <button
                    title="이름 변경"
                    onClick={e => { e.stopPropagation(); onRename(p.id, p.title); close() }}
                  >✎</button>
                  <button
                    title="삭제"
                    className="danger"
                    onClick={e => { e.stopPropagation(); onDelete(p.id); close() }}
                  >✕</button>
                </div>
              </div>
            ))}

            <div className="ps-divider" />

            <button className="ps-create-btn" onClick={() => { onCreate(); close() }}>
              + 새 프로젝트
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ProjectSelector
