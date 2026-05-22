import { useState, useEffect } from 'react'
import { api } from '../../api'
import './Breadcrumb.css'

/**
 * Breadcrumb
 * 현재 문서의 프로젝트 → 섹션 → 문서 경로를 표시
 *
 * 예) DRAFT > 초고 V1 > Act 1 > 클로디어스의 연설과 햄릿의 고립
 *
 * props:
 *   project    — 현재 프로젝트 { id, title }
 *   docId      — 현재 문서 ID
 *   docTitle   — 현재 문서 제목 (실시간 반영용)
 *   tree       — 프로젝트 트리 { sections }
 */
function Breadcrumb({ project, docId, docTitle, tree }) {
  const [crumbs, setCrumbs] = useState([])

  useEffect(() => {
    if (!project || !docId || !tree) {
      setCrumbs([])
      return
    }
    const path = buildPath(tree, docId, docTitle, project)
    setCrumbs(path)
  }, [project, docId, docTitle, tree])

  if (crumbs.length === 0) return <div className="breadcrumb" />

  return (
    <div className="breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="breadcrumb-item">
          {idx > 0 && <span className="breadcrumb-sep">›</span>}
          <span
            className={`breadcrumb-label ${idx === crumbs.length - 1 ? 'current' : ''}`}
          >
            {crumb}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * 트리에서 docId를 찾아 루트까지의 경로를 반환
 * 예) ['DRAFT', '초고 V1', 'Act 1', '1.2 클로디어스의 연설...']
 */
function buildPath(tree, docId, docTitle, project) {
  if (!tree?.sections) return []

  // flat 배열 → id 기준 map
  const sectionMap = {}
  tree.sections.forEach(s => { sectionMap[s.id] = s })

  // 문서가 속한 섹션 찾기
  let targetSectionId = null
  for (const s of tree.sections) {
    if (s.documents?.some(d => d.id === docId)) {
      targetSectionId = s.id
      break
    }
  }

  // 루트까지 섹션 경로 역추적
  const sectionPath = []
  let current = targetSectionId ? sectionMap[targetSectionId] : null
  while (current) {
    sectionPath.unshift(current.name)
    current = current.parent_id ? sectionMap[current.parent_id] : null
  }

  // 문서 제목 추가
  const docLabel = docTitle || '제목 없음'

  return [...sectionPath, docLabel]
}

export default Breadcrumb
