import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Send, 
  Loader, 
  User, 
  Bot,
  RotateCcw,
  Lightbulb,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    type: 'navigate' | 'create_notice';
    data?: any;
  };
}

const AdminAIChatbot: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addWelcomeMessage();
      loadSuggestions();
    }
  }, []);

  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hi ${user?.firstName}! 👋 I'm your AI admin assistant. I can help you navigate the system, create content, and manage college operations. 

I can:
• Navigate to any section (just ask "open notice board" or "go to user management")
• Help create notices with suggested content
• Answer questions about system operations
• Provide analytics and insights

What would you like to do today?`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  };

  const loadSuggestions = () => {
    setSuggestions([
      "Open notice board",
      "Go to user management",
      "Create a new notice about exam schedule",
      "Show me system statistics",
      "Help me manage admissions",
      "Navigate to fee management"
    ]);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // Process navigation commands locally first
      const navigationResult = processNavigationCommand(text);
      if (navigationResult) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: navigationResult.message,
          timestamp: new Date().toISOString(),
          action: navigationResult.action
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Execute navigation after a short delay
        if (navigationResult.action) {
          setTimeout(() => {
            executeAction(navigationResult.action);
          }, 1000);
        }
        return;
      }

      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await axios.post('/api/ai-chatbot/admin-chat', {
        message: text,
        chatHistory
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Let me help you with navigation or basic tasks instead.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const processNavigationCommand = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    // Navigation commands
    if (lowerMessage.includes('open notice') || lowerMessage.includes('notice board')) {
      return {
        message: "I'll take you to the Notice Board management page where you can create and manage notices. 🚀",
        action: { type: 'navigate', data: '/dashboard/notices' }
      };
    }
    
    if (lowerMessage.includes('user management') || lowerMessage.includes('manage users')) {
      return {
        message: "Navigating to User Management where you can add, edit, and manage all users. 👥",
        action: { type: 'navigate', data: '/dashboard/users' }
      };
    }
    
    if (lowerMessage.includes('fee management') || lowerMessage.includes('fees')) {
      return {
        message: "Opening Fee Management to handle student fees and payments. 💰",
        action: { type: 'navigate', data: '/dashboard/fees' }
      };
    }
    
    if (lowerMessage.includes('admissions') || lowerMessage.includes('admission')) {
      return {
        message: "Taking you to Admissions Management for reviewing applications. 📝",
        action: { type: 'navigate', data: '/dashboard/admissions' }
      };
    }
    
    if (lowerMessage.includes('reports') || lowerMessage.includes('analytics')) {
      return {
        message: "Opening Reports & Analytics for system insights. 📊",
        action: { type: 'navigate', data: '/dashboard/reports' }
      };
    }

    if (lowerMessage.includes('hostel') || lowerMessage.includes('accommodation')) {
      return {
        message: "Navigating to Hostel Management for room allocations and facilities. 🏠",
        action: { type: 'navigate', data: '/dashboard/hostel' }
      };
    }

    // Notice creation commands
    if (lowerMessage.includes('create notice') || lowerMessage.includes('new notice')) {
      return {
        message: "I'll switch to the Notice Agent where I can help you create notices with suggested content! ✍️",
        action: { type: 'switch_tab', data: 'notice-agent' }
      };
    }
    
    return null;
  };

  const executeAction = (action: any) => {
    if (action.type === 'navigate') {
      // Close the AI agent and navigate
      window.dispatchEvent(new CustomEvent('close-ai-agent'));
      navigate(action.data);
    } else if (action.type === 'switch_tab') {
      window.dispatchEvent(new CustomEvent('switch-ai-tab', { detail: action.data }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    addWelcomeMessage();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Admin AI Assistant</h2>
          <p className="text-sm text-gray-600">Ask me to navigate or help with admin tasks</p>
        </div>
        <button
          onClick={clearChat}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Clear chat"
        >
          <RotateCcw className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                message.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
              }`}>
                {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.action && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => executeAction(message.action)}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-700"
                    >
                      {message.action.type === 'navigate' ? <Navigation className="h-3 w-3 mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                      Execute Action
                    </button>
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader className="h-4 w-4 animate-spin text-gray-600" />
                  <p className="text-sm text-gray-600">Thinking...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">Quick suggestions:</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded p-3 transition-colors border border-blue-200"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to navigate or help with admin tasks..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Try: "Open notice board", "Go to user management", "Create a new notice"
        </p>
      </div>
    </div>
  );
};

export default AdminAIChatbot;
