import './RSidebar.css'

// 향후 기능 연결 시 이 배열에 onClick 등을 추가하면 됨
const MENU_ITEMS = [
  { id: 'corkboard', icon: '🧵', label: '코르크보드' },
  { id: 'font',      icon: '🔤', label: '폰트' },
  { id: 'snapshot',  icon: '📸', label: '스냅샷' },
  { id: 'note',      icon: '📝', label: '메모' },
  { id: 'timer',     icon: '⏱', label: '타이머' },
  { id: 'settings',  icon: '⚙️', label: '설정' },
]

function RSidebar() {
  return (
    <aside className="rsidebar">
      {MENU_ITEMS.map(item => (
        <button key={item.id} className="rsidebar-item" type="button">
          <span className="rsidebar-icon">{item.icon}</span>
          <span className="rsidebar-label">{item.label}</span>
        </button>
      ))}
    </aside>
  )
}

export default RSidebar
