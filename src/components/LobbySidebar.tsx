import React from 'react';
import { Home, TrendingUp, Music, Gamepad2, Film, BookOpen, Trophy, Lightbulb } from 'lucide-react';

interface Props {
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
  username: string;
}

const menuItems = [
  { key: 'home',      icon: Home,       label: 'Home' },
  { key: 'trending',  icon: TrendingUp, label: 'Trending' },
  { key: 'music',     icon: Music,      label: 'Music' },
  { key: 'gaming',    icon: Gamepad2,   label: 'Gaming' },
  { key: 'movies',    icon: Film,       label: 'Movies' },
  { key: 'education', icon: BookOpen,   label: 'Education' },
  { key: 'sports',    icon: Trophy,     label: 'Sports' },
];

const LobbySidebar: React.FC<Props> = ({ activeTab, setActiveTab, username }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* User Greeting */}
      <div style={{
        padding: '18px 14px',
        borderBottom: '1px solid rgba(163, 124, 88, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #a37c58, #c6a282)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.95rem', fontWeight: 700, color: 'white',
            flexShrink: 0,
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, color: '#2a2520', fontWeight: 700, fontSize: '0.88rem' }}>{username}</p>
            <p style={{ margin: 0, color: '#8c8276', fontSize: '0.7rem', fontWeight: 500 }}>Welcome back</p>
          </div>
        </div>
      </div>

      {/* Category Buttons */}
      <div style={{ padding: '12px 8px', flex: 1 }}>
        <p style={{
          color: '#8c8276', fontSize: '0.68rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '0 6px', marginBottom: '6px', marginTop: 0,
        }}>
          Explore
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {menuItems.map(({ key, icon: Icon, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 10px',
                  background: isActive ? 'rgba(163, 124, 88, 0.12)' : 'transparent',
                  color: isActive ? '#a37c58' : '#6b635a',
                  border: 'none',
                  borderLeft: isActive ? '2px solid #a37c58' : '2px solid transparent',
                  borderRadius: '0 8px 8px 0',
                  cursor: 'pointer',
                  fontSize: '0.84rem', fontWeight: isActive ? 600 : 500,
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'all 0.15s ease',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(163, 124, 88, 0.05)';
                    e.currentTarget.style.color = '#4a433a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6b635a';
                  }
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Tip */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(163, 124, 88, 0.15)' }}>
        <div style={{
          background: 'rgba(163, 124, 88, 0.05)',
          border: '1px solid rgba(163, 124, 88, 0.15)',
          padding: '10px 12px', borderRadius: '10px',
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <Lightbulb size={13} color="#a37c58" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#6b635a', fontSize: '0.7rem', margin: 0, lineHeight: '1.5' }}>
            Create a room and share the code with friends to watch together in sync.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LobbySidebar;