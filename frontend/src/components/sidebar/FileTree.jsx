import { useState } from 'react'
import './FileTree.css'

/**
 * 파일 트리
 * props:
 *   tree         — API 트리 데이터
 *   onOpenFolder — 폴더 열기 버튼
 *   onRefresh    — 새로고침
 *   onFileSelect — 파일 클릭 시 호출 (path 전달)
 */
function FileTree({ tree, onOpenFolder, onRefresh, onFileSelect }) {
  if (!tree) {
    return (
      <div className="filetree-empty">
        <p>폴더를 열어주세요</p>
        <button onClick={onOpenFolder}>폴더 열기</button>
      </div>
    )
  }

  return (
    <div className="filetree">
      <div className="filetree-root-label">
        <span>{tree.name?.toUpperCase()}</span>
        <button
          className="filetree-refresh"
          onClick={onRefresh}
          title="새로고침"
        >↺</button>
      </div>
      <TreeNode
        nodes={tree.children || []}
        depth={0}
        onFileSelect={onFileSelect}
      />
    </div>
  )
}

function TreeNode({ nodes, depth, onFileSelect }) {
  return (
    <ul className="tree-list">
      {nodes.map(node => (
        <TreeItem
          key={node.path}
          node={node}
          depth={depth}
          onFileSelect={onFileSelect}
        />
      ))}
    </ul>
  )
}

function TreeItem({ node, depth, onFileSelect }) {
  const [open, setOpen] = useState(false)
  const isFolder = node.type === 'folder'

  const handleClick = () => {
    if (isFolder) {
      setOpen(o => !o)
    } else {
      // ★ 파일 클릭 → 상위로 경로 전달
      if (onFileSelect) onFileSelect(node.path)
    }
  }

  return (
    <li>
      <div
        className={`tree-item ${isFolder ? 'folder' : 'file'}`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={handleClick}
        title={node.path}
      >
        <span className="tree-icon">
          {isFolder ? (open ? '📂' : '📁') : _fileIcon(node.name)}
        </span>
        <span className="tree-name">{node.name}</span>
      </div>

      {isFolder && open && node.children?.length > 0 && (
        <TreeNode
          nodes={node.children}
          depth={depth + 1}
          onFileSelect={onFileSelect}
        />
      )}
    </li>
  )
}

// 확장자별 아이콘
function _fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const map = {
    md:   '📝', txt: '📄', docx: '📘', pdf: '📕',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼',
    js:  '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    py:  '🐍', json: '{}', html: '🌐', css: '🎨',
  }
  return map[ext] || '📄'
}

export default FileTree
