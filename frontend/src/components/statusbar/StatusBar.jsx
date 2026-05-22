import './StatusBar.css'

function StatusBar({ charCount, mode, saveState }) {
  return (
    <div className="statusbar">
      <span>글자 수: {charCount.toLocaleString()}</span>
      <div className="statusbar-right">
        <span>{mode}</span>
        <span className={saveState === '저장됨' ? 'saved' : 'unsaved'}>{saveState}</span>
      </div>
    </div>
  )
}

export default StatusBar
