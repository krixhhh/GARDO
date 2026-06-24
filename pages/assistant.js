import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

export default function AssistantPage({ currentUser, userProfile, logoutUser }) {
  const [messages, setMessages] = useState([
    {
      sender: 'gardo',
      text: "Hello! I am your GARDO Styling Intelligence Assistant. Ask me anything about outfit matching, fabrics, dress codes, leather matching, or sweat comfort options. \n\n*Note: I do not provide coding, political, or news responses.*",
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    if (!currentUser) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/assistant/chat?userId=${currentUser.id}`);
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            // Reformat key keys to match what UI expects (created_at vs timestamp)
            const formattedHistory = history.map(item => ({
              ...item,
              timestamp: item.created_at
            }));
            setMessages(formattedHistory);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    loadHistory();
  }, [currentUser]);

  const handleSend = async (textToSend) => {
    if (!textToSend.trim() || !currentUser) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          userId: currentUser.id
        })
      });
      
      if (res.ok) {
        const responseMsg = await res.json();
        setMessages(prev => [...prev, {
          ...responseMsg,
          timestamp: responseMsg.created_at
        }]);
      } else {
        throw new Error('Failed to post message');
      }
    } catch (err) {
      console.error('Error posting chat message', err);
      setMessages(prev => [...prev, {
        sender: 'gardo',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const samplePrompts = [
    { text: "How should I style a navy shirt?", icon: '👔' },
    { text: "What should I wear to a wedding in hot weather?", icon: '💒' },
    { text: "Explain accessory leather matching rules.", icon: '👞' },
    { text: "How does outfit rotation work in GARDO?", icon: '🔄' },
    { text: "Can you write a JavaScript function?", icon: '💻' } // Negative test template
  ];

  return (
    <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
      <Head>
        <title>GARDO | Styling Assistant</title>
      </Head>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', height: 'calc(100vh - 100px)' }} className="assistant-layout-split">
        
        {/* LEFT PANEL: Chat Window */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(26,26,26,0.6)', overflow: 'hidden', borderRadius: '18px' }}>
          
          {/* Assistant Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(20,20,20,0.4)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#D4AF37', boxShadow: '0 0 10px #D4AF37' }}></div>
            <div>
              <div style={{ fontWeight: '600', color: '#FFF', fontSize: '1rem' }}>GARDO Stylist AI</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Closet Intelligence Protocol Active</div>
            </div>
          </div>

          {/* Conversation history area */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, index) => {
              const isGardo = msg.sender === 'gardo';
              const isDeflection = msg.text.includes('focuses only on fashion') || msg.text.includes('programmed exclusively');
              
              return (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: isGardo ? 'flex-start' : 'flex-end',
                    width: '100%'
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    background: isGardo 
                      ? (isDeflection ? 'rgba(234, 67, 53, 0.1)' : 'rgba(255, 255, 255, 0.03)')
                      : 'rgba(212, 175, 55, 0.15)',
                    border: isGardo 
                      ? (isDeflection ? '1px solid rgba(234, 67, 53, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)')
                      : '1px solid rgba(212, 175, 55, 0.25)',
                    padding: '16px 20px',
                    borderRadius: isGardo ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {isDeflection && (
                      <div style={{ fontSize: '0.65rem', background: '#EA4335', color: '#FFF', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px', fontWeight: 'bold' }}>
                        GUARDRAIL INTERCEPTED
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: isGardo ? (isDeflection ? '#FF9999' : '#FFF') : '#FFF', 
                      lineHeight: '1.6', 
                      whiteSpace: 'pre-wrap' 
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '6px', textAlign: 'right' }}>
                      {msg.timestamp || msg.created_at}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* User Input bar form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', background: 'rgba(20,20,20,0.4)' }}
          >
            <input
              type="text"
              placeholder="Ask GARDO about matching colors, fabrics, or dress codes..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="form-input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '0.8rem' }}>
              Send
            </button>
          </form>

        </div>

        {/* RIGHT PANEL: Suggestions & Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="assistant-right-panel">
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.1rem', color: '#FFF', fontWeight: '400', marginBottom: '12px' }}>
              Suggested Styling Queries
            </h3>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>
              Tap any item below to automatically send the request to your personal assistant.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#B3B3B3',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'var(--transition-smooth)'
                  }}
                  className="prompt-card-button"
                >
                  <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                  <span style={{ flex: 1 }}>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid #D4AF37' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guardrail Protocol Active</h4>
            <p style={{ color: '#888', fontSize: '0.75rem', marginTop: '8px', lineHeight: '1.4' }}>
              GARDO is dedicated to sustainable wardrobe utilization. It cannot solve algorithms, query database structures, explain government politics, or search general encyclopedia details.
            </p>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .prompt-card-button:hover {
          border-color: #D4AF37 !important;
          background: rgba(212, 175, 55, 0.06) !important;
          color: #FFF !important;
          transform: translateX(3px);
        }
        @media (min-width: 1024px) {
          .assistant-layout-split {
            grid-template-columns: 1fr 320px !important;
          }
        }
        @media (max-width: 1023px) {
          .assistant-layout-split {
            height: auto !important;
          }
          .assistant-right-panel {
            margin-top: 20px;
          }
        }
      `}</style>
    </Layout>
  );
}
