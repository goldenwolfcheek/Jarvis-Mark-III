import type { Tab } from '@/types'

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="relative z-10 flex items-center justify-center h-10 gap-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative px-4 h-full text-sm font-medium transition-all duration-200
            ${activeTab === tab.id
              ? 'text-jarvis-cyan'
              : 'text-jarvis-muted/70 hover:text-jarvis-text'}
          `}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-jarvis-cyan rounded-full shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
          )}
        </button>
      ))}
    </div>
  )
}
