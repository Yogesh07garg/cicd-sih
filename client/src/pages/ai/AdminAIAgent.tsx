import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Navigation, FileText, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminAIChatbot from '../../components/AdminAIChatbot';
import NoticeAgent from './NoticeAgent';

const AdminAIAgent: React.FC = () => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('chatbot');

  useEffect(() => {
    // Listen for close event from AI chatbot
    const handleCloseAgent = () => {
      navigate('/dashboard/home');
    };

    // Listen for tab switching from AI chatbot
    const handleSwitchTab = (event: any) => {
      setActiveSubTab(event.detail);
    };

    window.addEventListener('close-ai-agent', handleCloseAgent);
    window.addEventListener('switch-ai-tab', handleSwitchTab);

    return () => {
      window.removeEventListener('close-ai-agent', handleCloseAgent);
      window.removeEventListener('switch-ai-tab', handleSwitchTab);
    };
  }, [navigate]);

  const subTabs = [
    {
      id: 'chatbot',
      label: 'AI Chatbot',
      icon: MessageSquare,
      component: AdminAIChatbot,
      description: 'Navigate system and get AI assistance'
    },
    {
      id: 'notice-agent',
      label: 'Notice Agent',
      icon: FileText,
      component: NoticeAgent,
      description: 'Generate and publish notices with AI'
    },
    {
      id: 'navigation',
      label: 'Navigation Agent',
      icon: Navigation,
      component: () => (
        <div className="p-8 text-center text-gray-500">
          <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Navigation Agent</h3>
          <p>Advanced navigation assistance - Coming Soon</p>
        </div>
      ),
      description: 'Advanced system navigation assistance'
    },
    {
      id: 'user-agent',
      label: 'User Management Agent',
      icon: Users,
      component: () => (
        <div className="p-8 text-center text-gray-500">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">User Management Agent</h3>
          <p>Intelligent user management assistance - Coming Soon</p>
        </div>
      ),
      description: 'AI-powered user management tasks'
    }
  ];

  const ActiveComponent = subTabs.find(tab => tab.id === activeSubTab)?.component;
  const activeTabInfo = subTabs.find(tab => tab.id === activeSubTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/home')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Screen Agent</h1>
                <p className="text-sm opacity-90">
                  {activeTabInfo?.description || 'Intelligent assistant for admin operations'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="pb-6">
            <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
              {subTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-all duration-200 ${
                      activeSubTab === tab.id
                        ? 'bg-white bg-opacity-20 text-white shadow-lg transform scale-105'
                        : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {activeSubTab === tab.id && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                activeSubTab === 'chatbot' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`} />
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTabInfo?.label}
              </h2>
              <span className="text-sm text-gray-500">
                • {activeTabInfo?.description}
              </span>
            </div>
          </div>
        </div>

        {/* Component Content */}
        <div className="min-h-[calc(100vh-240px)]">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default AdminAIAgent;
