import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Send, X, Bot, User, RefreshCw } from 'lucide-react';
import './ChatWidget.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export const ChatWidget: React.FC = () => {
  const { user } = useContext(AuthContext);
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

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send to FastAPI Chat Service
      const res = await axios.post('http://localhost:8000/api/chat', { message: userMsg.text });
      const botMsg: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: res.data.response };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: "Sorry, I couldn't reach the chat service. Is the FastAPI server running on port 8000?" };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async () => {
    if (!user) return;
    setIndexing(true);
    try {
      const res = await axios.post('http://localhost:8000/api/index', { user_id: user._id });
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: `Successfully indexed ${res.data.indexed_documents} documents from your profile!` }]);
    } catch (error) {
      console.error('Index error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: "Failed to update your knowledge base index." }]);
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
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
