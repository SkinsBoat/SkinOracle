import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { NegotiationChatMessage } from '../../types/negotiation.types';
import { formatChatTime } from './negotiationUi';

interface ActivityFeedCardProps {
  chat: NegotiationChatMessage[];
  chatEnabled: boolean;
  onSendChat: (text: string) => void;
}

/** Sidebar card: live negotiation messages and quick composer. */
export const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({
  chat,
  chatEnabled,
  onSendChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length]);

  const handleSendChat = (event: React.FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !chatEnabled) return;
    onSendChat(text);
    setChatInput('');
  };

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <MessageSquare size={14} style={styles.cardIcon} />
        <span style={styles.cardTitle}>Activity Feed</span>
        {chatEnabled && (
          <span style={styles.liveDot} title="Live P2P channel" />
        )}
      </div>
      <div style={styles.chatFeed}>
        {chat.length === 0 ? (
          <p style={styles.chatEmpty}>
            {chatEnabled
              ? 'Channel open. Negotiation events and messages appear here.'
              : 'Messages unlock when the seller connects to the live channel.'}
          </p>
        ) : (
          chat.map((entry) => (
            <div key={entry.id} style={styles.chatEntry}>
              <div style={styles.chatMeta}>
                <span
                  style={
                    entry.role === 'trader'
                      ? styles.chatSenderTrader
                      : styles.chatSenderSeller
                  }
                >
                  {entry.sender}
                </span>
                <span style={styles.chatTime}>
                  {formatChatTime(entry.timestamp)}
                </span>
              </div>
              <p style={styles.chatText}>{entry.text}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendChat} style={styles.chatForm}>
        <input
          type="text"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          maxLength={500}
          disabled={!chatEnabled}
          placeholder={
            chatEnabled
              ? 'Message the seller…'
              : 'Chat requires a live P2P channel'
          }
          aria-label="Negotiation message"
          style={getChatInputStyle(!chatEnabled)}
        />
        <button
          type="submit"
          disabled={!chatEnabled || !chatInput.trim()}
          aria-label="Send message"
          style={getSendBtnStyle(!chatEnabled || !chatInput.trim())}
        >
          <Send size={14} />
        </button>
      </form>
    </section>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    minHeight: '17px',
  },
  cardIcon: { color: '#38bdf8' },
  cardTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '0.2px',
    flex: 1,
  },
  liveDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.16)',
  },
  chatFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    height: '170px',
    overflowY: 'auto',
    padding: '2px',
  },
  chatEmpty: {
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.45,
    color: '#64748b',
  },
  chatEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '7px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  chatMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  chatSenderTrader: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#38bdf8',
  },
  chatSenderSeller: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#fbbf24',
  },
  chatTime: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#475569',
  },
  chatText: {
    margin: 0,
    fontSize: '11.5px',
    lineHeight: 1.4,
    color: '#cbd5e1',
    wordBreak: 'break-word',
  },
  chatForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chatInput: {
    flex: 1,
    minWidth: 0,
    height: '32px',
    padding: '0 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #2a3342',
    color: '#f8fafc',
    fontSize: '11.5px',
    fontWeight: 600,
    outline: 'none',
  },
  sendBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '7px',
    backgroundColor: '#2563eb',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

function getChatInputStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.chatInput,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  };
}

function getSendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.sendBtn,
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.35)' : '#2563eb',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
