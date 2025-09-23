import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Send, 
  Loader, 
  User, 
  Bot,
  FileText,
  Edit3,
  Save,
  Eye,
  Lightbulb,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedNotice?: {
    title: string;
    content: string;
    priority: string;
    targetAudience: string;
  };
}

const NoticeAgent: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNotice, setCurrentNotice] = useState<any>(null);
  const [editingNotice, setEditingNotice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    addWelcomeMessage();
  }, []);

  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hi ${user?.firstName}! 👋 I'm your Notice Creation Assistant. I can help you create professional notices with suggested content.

Here's what I can help you with:
• Generate notice content based on your requirements
• Suggest appropriate titles and formatting
• Recommend target audience and priority levels
• Create notices for exams, events, announcements, etc.

Just tell me what kind of notice you want to create! For example:
"Create a notice about upcoming semester exams"
"Write a notice for hostel maintenance"
"Generate an announcement for college fest"`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
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

    try {
      // Generate notice content based on user input
      const noticeContent = generateNoticeContent(text);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: noticeContent.message,
        timestamp: new Date().toISOString(),
        suggestedNotice: noticeContent.notice
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentNotice(noticeContent.notice);
    } catch (error: any) {
      console.error('Notice generation error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error generating the notice. Let me try with a basic template instead.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNoticeContent = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    
    // Exam-related notices
    if (lowerInput.includes('exam') || lowerInput.includes('test') || lowerInput.includes('assessment')) {
      return {
        message: "I've generated a professional exam notice for you. You can edit the content as needed and publish it directly to the notice board. 📝",
        notice: {
          title: "Important: Upcoming Semester Examinations",
          content: `Dear Students,

This is to inform you that the End Semester Examinations for the current academic session will be conducted as per the following schedule:

📅 Examination Period: [Start Date] to [End Date]
⏰ Time: 10:00 AM to 1:00 PM (Morning Session)
         2:00 PM to 5:00 PM (Afternoon Session)

Important Instructions:
• Students must carry their valid ID cards and Hall Tickets
• Entry to examination hall will be closed 15 minutes after commencement
• Mobile phones and electronic devices are strictly prohibited
• Use of unfair means will result in disqualification

Detailed examination timetable and hall allocation will be published separately on the college notice board and website.

For any queries, contact the Examination Department.

Best Regards,
Controller of Examinations
[College Name]`,
          priority: "HIGH",
          targetAudience: "STUDENTS"
        }
      };
    }

    // Event-related notices
    if (lowerInput.includes('fest') || lowerInput.includes('event') || lowerInput.includes('celebration')) {
      return {
        message: "I've created an engaging event announcement notice. Feel free to customize the details! 🎉",
        notice: {
          title: "College Annual Fest 2024 - Registration Open!",
          content: `Dear Students and Faculty,

We are excited to announce the much-awaited Annual College Fest 2024!

🎊 Event Name: [Fest Name]
📅 Dates: [Start Date] - [End Date]
📍 Venue: College Campus
🎯 Theme: [Festival Theme]

Event Categories:
• Cultural Events (Dance, Music, Drama, Art)
• Technical Events (Coding, Robotics, Innovation)
• Sports Events (Indoor & Outdoor Games)
• Literary Events (Debate, Quiz, Creative Writing)

Registration Details:
• Registration Fee: ₹[Amount] per event
• Last Date to Register: [Date]
• Registration Link: [URL]

Prizes worth ₹[Total Prize Money] to be won!

For more information and updates, follow our social media pages or contact the Student Activities Committee.

Let's make this fest memorable together! 🌟

Organizing Committee
Student Activities Department`,
          priority: "NORMAL",
          targetAudience: "ALL"
        }
      };
    }

    // Hostel-related notices
    if (lowerInput.includes('hostel') || lowerInput.includes('accommodation') || lowerInput.includes('maintenance')) {
      return {
        message: "Here's a hostel maintenance notice template. You can modify the specific details as needed! 🏠",
        notice: {
          title: "Hostel Maintenance Schedule - Important Notice",
          content: `Dear Hostel Residents,

This is to inform you about the scheduled maintenance work in the hostel premises.

🔧 Maintenance Type: [Electrical/Plumbing/General]
📅 Date: [Date]
⏰ Time: [Start Time] - [End Time]
🏢 Affected Areas: [Block Names/Room Numbers]

Maintenance Activities:
• [Activity 1]
• [Activity 2]
• [Activity 3]

Important Points:
• Water supply may be disrupted during maintenance hours
• Power backup will be available for essential services
• Students are advised to plan accordingly
• Emergency contact: [Phone Number]

We apologize for any inconvenience caused. Your cooperation is highly appreciated.

For any urgent issues, please contact the Hostel Office immediately.

Best Regards,
Hostel Warden
[Hostel Name]`,
          priority: "HIGH",
          targetAudience: "STUDENTS"
        }
      };
    }

    // Fee-related notices
    if (lowerInput.includes('fee') || lowerInput.includes('payment') || lowerInput.includes('tuition')) {
      return {
        message: "I've prepared a fee payment reminder notice. You can adjust the amounts and dates! 💰",
        notice: {
          title: "Fee Payment Reminder - Last Date Approaching",
          content: `Dear Students and Parents,

This is a gentle reminder regarding the payment of academic fees for the current semester.

💰 Fee Details:
• Tuition Fee: ₹[Amount]
• Development Fee: ₹[Amount]
• Library Fee: ₹[Amount]
• Laboratory Fee: ₹[Amount]
• Total Amount: ₹[Total]

📅 Last Date for Payment: [Date]
⚠️ Late Fee Charges: ₹[Amount] per day after due date

Payment Methods:
• Online Payment: [Portal Link/QR Code]
• Bank Transfer: [Account Details]
• DD/Cheque: Payable to "[College Name]"

Important Notes:
• Students with pending fees will not be allowed to appear for examinations
• Fee receipts must be preserved for future reference
• For scholarship students, contact the Accounts Department

For any queries regarding fees, contact:
📞 Phone: [Number]
📧 Email: accounts@[college].edu
🕒 Office Hours: 9:00 AM - 5:00 PM (Mon-Fri)

Accounts Department
[College Name]`,
          priority: "HIGH",
          targetAudience: "STUDENTS"
        }
      };
    }

    // Default general notice
    return {
      message: "I've created a general notice template. You can customize it based on your specific requirements! 📋",
      notice: {
        title: "Important College Announcement",
        content: `Dear Students and Faculty,

This is to inform you about [Main Subject/Topic].

Details:
• Date: [Date]
• Time: [Time]
• Venue: [Location]
• Contact Person: [Name and Designation]

Important Points:
• [Point 1]
• [Point 2]
• [Point 3]

For more information, please contact the [Department Name] at [Contact Details].

Your cooperation is highly appreciated.

Best Regards,
[Authority Name]
[Designation]
[College Name]`,
        priority: "NORMAL",
        targetAudience: "ALL"
      }
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const saveNotice = async (notice: any) => {
    try {
      const response = await axios.post('/api/notices', {
        ...notice,
        isPublished: false // Save as draft first
      });
      toast.success('Notice saved as draft successfully!');
    } catch (error) {
      console.error('Save notice error:', error);
      toast.error('Failed to save notice');
    }
  };

  const publishNotice = async (notice: any) => {
    try {
      const response = await axios.post('/api/notices', {
        ...notice,
        isPublished: true,
        publishedAt: new Date().toISOString()
      });
      toast.success('Notice published successfully!');
    } catch (error) {
      console.error('Publish notice error:', error);
      toast.error('Failed to publish notice');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentNotice(null);
    addWelcomeMessage();
  };

  return (
    <div className="flex h-full">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Notice Creation Agent
            </h2>
            <p className="text-sm text-gray-600">Tell me what notice you want to create</p>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
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
                    <p className="text-sm text-gray-600">Generating notice content...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {['Create exam notice', 'Generate event announcement', 'Write hostel maintenance notice', 'Fee payment reminder'].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me what notice you want to create..."
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
        </div>
      </div>

      {/* Notice Preview Section */}
      {currentNotice && (
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-green-600" />
              Notice Preview
            </h3>
            <p className="text-sm text-gray-600">Review and edit before publishing</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={currentNotice.title}
                  onChange={(e) => setCurrentNotice(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={currentNotice.content}
                  onChange={(e) => setCurrentNotice(prev => ({ ...prev, content: e.target.value }))}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={currentNotice.priority}
                    onChange={(e) => setCurrentNotice(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                  <select
                    value={currentNotice.targetAudience}
                    onChange={(e) => setCurrentNotice(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All</option>
                    <option value="STUDENTS">Students</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t space-y-2">
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(currentNotice.content)}
                className="flex-1 flex items-center justify-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </button>
              <button
                onClick={() => saveNotice(currentNotice)}
                className="flex-1 flex items-center justify-center px-3 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </button>
            </div>
            <button
              onClick={() => publishNotice(currentNotice)}
              className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Publish Notice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeAgent;
