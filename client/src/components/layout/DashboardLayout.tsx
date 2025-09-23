import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatbot from '../AIChatbot';
import AIChatbotToggle from '../AIChatbotToggle';
import { useAuth } from '../../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const { user } = useAuth();

  // Show AI chatbot for students and admins
  const showAIChatbot = user?.role === 'STUDENT' || user?.role === 'ADMIN';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className={`
        flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${chatbotOpen && showAIChatbot ? 'mr-96' : ''}
      `}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Chatbot - For students and admins */}
      {showAIChatbot && (
        <>
          <AIChatbot 
            isOpen={chatbotOpen} 
            onToggle={() => setChatbotOpen(!chatbotOpen)} 
          />
          <AIChatbotToggle 
            isOpen={chatbotOpen} 
            onToggle={() => setChatbotOpen(!chatbotOpen)} 
          />
        </>
      )}
    </div>
  );
};

export default DashboardLayout;