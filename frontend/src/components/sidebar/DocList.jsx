import './DocList.css'

function DocList({ docs, onSelect, onNew }) {
  return (
    <div className="doclist">
      <button className="doclist-new-btn" onClick={onNew}>＋ 새 문서</button>
      {docs.length === 0 && <p className="doclist-empty">문서가 없습니다</p>}
      <ul className="doclist-items">
        {docs.map(doc => (
          <li key={doc.id} className="doclist-item" onClick={() => onSelect(doc.id)}>
            <span className="doc-title">{doc.title || '제목 없음'}</span>
            <span className="doc-meta">{doc.mode} · {doc.updated_at?.slice(0, 16)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DocList
