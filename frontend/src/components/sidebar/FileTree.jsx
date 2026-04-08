import { useState } from 'react'
import './FileTree.css'

function FileTree({ tree, onOpenFolder }) {
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
      <div className="filetree-root-label">{tree.name?.toUpperCase()}</div>
      <TreeNode nodes={tree.children || []} depth={0} />
    </div>
  )
}

function TreeNode({ nodes, depth }) {
  return (
    <ul className="tree-list">
      {nodes.map(node => <TreeItem key={node.path} node={node} depth={depth} />)}
    </ul>
  )
}

function TreeItem({ node, depth }) {
  const [open, setOpen] = useState(false)
  const isFolder = node.type === 'folder'

  return (
    <li>
      <div
        className={`tree-item ${isFolder ? 'folder' : 'file'}`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={() => isFolder ? setOpen(o => !o) : console.log('파일:', node.path)}
      >
        <span className="tree-icon">{isFolder ? (open ? '📂' : '📁') : '📄'}</span>
        <span className="tree-name">{node.name}</span>
      </div>
      {isFolder && open && node.children?.length > 0 && (
        <TreeNode nodes={node.children} depth={depth + 1} />
      )}
    </li>
  )
}

export default FileTree
