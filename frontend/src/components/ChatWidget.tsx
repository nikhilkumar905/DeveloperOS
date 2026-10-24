import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Send, X, Bot, User, RefreshCw } from 'lucide-react';
import { CHAT_API_URL, getErrorMessage } from '../lib/api';
import './ChatWidget.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: string[];
  // Status/error messages are shown but not sent back to the model as conversation history
  isStatus?: boolean;
}

const HISTORY_TURNS = 6;

export const ChatWidget: React.FC = () => {
  const { token, getValidToken } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: "Hi! I'm your DeveloperOS AI. I can answer questions about your skills, projects, weaknesses, and GitHub stats. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Separate axios instance: a 401 from the chat service must not trigger the global logout interceptor
  const chatRequest = async (path: string, body: object) => {
    const fresh = await getValidToken();
    return axios.create().post(`${CHAT_API_URL}${path}`, body, { headers: { Authorization: `Bearer ${fresh}` } });
  };

  const chatErrorText = (error: any, fallback: string) =>
    error?.response ? getErrorMessage(error, fallback) : `Sorry, I couldn't reach the chat service at ${CHAT_API_URL}. Is it running?`;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !token) return;

    const history = messages
      .filter(m => !m.isStatus && m.id !== '1')
      .slice(-HISTORY_TURNS)
      .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatRequest('/api/chat', { message: text, history });
      const botMsg: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: res.data.response, sources: res.data.sources };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', text: chatErrorText(error, 'Something went wrong. Please try again.'), isStatus: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async () => {
    if (!token) return;
    setIndexing(true);
    try {
      const res = await chatRequest('/api/index', {});
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: `Successfully indexed ${res.data.indexed_documents} documents from your profile!`, isStatus: true }]);
    } catch (error) {
      console.error('Index error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: chatErrorText(error, 'Failed to update your knowledge base index.'), isStatus: true }]);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button className="chat-fab" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="chat-window card widget-box">
          <div className="chat-header">
            <div className="chat-header-title">
              <Bot size={20} className="text-primary" />
              <h3>AI Assistant</h3>
            </div>
            <div className="chat-header-actions">
              <button 
                className="icon-btn" 
                onClick={handleIndex} 
                title="Update Knowledge Base"
                disabled={indexing}
              >
                <RefreshCw size={16} className={indexing ? 'spinning' : ''} />
              </button>
              <button className="icon-btn" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message-wrapper ${msg.sender}`}>
                <div className="chat-avatar">
                  {msg.sender === 'bot' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className={`chat-message bubble-${msg.sender}`}>
                  {msg.text}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">Sources: {msg.sources.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message-wrapper bot">
                <div className="chat-avatar"><Bot size={16} /></div>
                <div className="chat-message bubble-bot typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-area">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
              placeholder="Ask about your skills or projects..."
              className="form-control"
            />
            <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={!input.trim() || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
