import React, { useState } from 'react';
import { Brain, MessageCircle } from 'lucide-react';

interface AIChatbotToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  hasUnread?: boolean;
}

const AIChatbotToggle: React.FC<AIChatbotToggleProps> = ({ 
  isOpen, 
  onToggle, 
  hasUnread = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-6 z-40
        w-14 h-14 rounded-full
        bg-gradient-to-r from-purple-600 to-blue-600
        text-white shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        ${isHovered ? 'scale-110' : 'scale-100'}
        ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
      title="AI Assistant"
    >
      {isHovered ? (
        <MessageCircle className="h-6 w-6" />
      ) : (
        <Brain className="h-6 w-6" />
      )}
      
      {hasUnread && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </div>
      )}
    </button>
  );
};

export default AIChatbotToggle;
