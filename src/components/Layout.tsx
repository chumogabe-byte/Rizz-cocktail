import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
      ) : <span className="icon-btn-spacer" />}
      {title && <h1 className="topbar-title">{title}</h1>}
      <div className="topbar-right">{right ?? <span className="icon-btn-spacer" />}</div>
    </header>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return <button className={`chip ${active ? 'chip-active' : ''}`} onClick={onClick}>{children}</button>;
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease"><Icon name="minus" size={16} /></button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label="Increase"><Icon name="plus" size={16} /></button>
    </div>
  );
}
