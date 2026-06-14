import React from 'react';
import AgentBadge from './AgentBadge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

interface ChatPanelProps {
  messages: Message[];
  loading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, loading }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-lg p-4 ${msg.role === 'user' ? 'bg-coffee-muted/20 text-white' : 'bg-coffee-dark/40 border border-coffee-muted/20 text-gray-200'}`}>
            <p className="whitespace-pre-wrap break-words">{String(msg.content)}</p>
            {msg.role === 'assistant' && (
              <div className="mt-2">
                <AgentBadge agent={msg.agent} />
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="text-sm text-coffee-muted animate-pulse">
          Agents are orchestrating...
        </div>
      )}
    </div>
  );
};
export default ChatPanel;
