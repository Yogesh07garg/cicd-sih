import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Gemini AI (optional)
let model = null;
try {
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5' });
  }
} catch (error) {
  console.warn('Gemini AI not available, using fallback responses');
}

router.use(authenticateToken);

// Predefined responses for common queries
const FALLBACK_RESPONSES = {
  attendance: (context) => {
    const totalClasses = context.attendance?.length || 0;
    const attendancePercentage = totalClasses > 0 ? Math.round((totalClasses * 0.85) * 100) / 100 : 0;
    
    return `Based on your recent attendance records, you have attended ${totalClasses} classes. Your approximate attendance percentage is ${attendancePercentage}%. 

Recent classes attended:
${context.attendance?.slice(0, 5).map(att => `• ${att.session.subject} (${att.session.className}) - ${new Date(att.markedAt).toLocaleDateString()}`).join('\n') || '• No recent attendance records found'}

To maintain good academic standing, ensure you maintain at least 75% attendance in all subjects. If you need to discuss attendance concerns, please contact your faculty advisor.`;
  },

  fees: (context) => {
    const pendingFees = context.fees?.filter(fee => fee.status === 'PENDING') || [];
    const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return `Here's your current fee status:

${pendingFees.length > 0 ? `Pending Fees (Total: ₹${totalPending.toLocaleString()}):
${pendingFees.map(fee => `• ${fee.feeType}: ₹${fee.amount} - Due: ${new Date(fee.dueDate).toLocaleDateString()}`).join('\n')}

Please ensure timely payment to avoid late fees. You can pay online through the student portal or visit the accounts office during working hours.` : 'Great news! You have no pending fees at the moment. All your fees are up to date.'}

For any fee-related queries, contact the Accounts Department at accounts@college.edu or visit the office between 9 AM - 5 PM.`;
  },

  books: (context) => {
    const issuedBooks = context.books?.filter(book => book.status === 'ISSUED') || [];
    
    return `Your current library status:

${issuedBooks.length > 0 ? `Books Currently Issued (${issuedBooks.length}):
${issuedBooks.map(book => `• "${book.book.title}" by ${book.book.author} - Issued: ${new Date(book.issueDate).toLocaleDateString()}${book.dueDate ? ` | Due: ${new Date(book.dueDate).toLocaleDateString()}` : ''}`).join('\n')}

Please return books before the due date to avoid fines. You can renew books online through the library portal or visit the library in person.` : 'You currently have no books issued from the library. Visit the library to explore our collection of academic books, reference materials, and digital resources.'}

Library timings: Mon-Fri: 8 AM - 8 PM, Sat: 9 AM - 5 PM. For digital resources, visit the college library website.`;
  },

  hostel: (context) => {
    if (context.hostel) {
      return `Your hostel accommodation details:

🏠 Room Information:
• Block: ${context.hostel.room.block.name}
• Room Number: ${context.hostel.room.roomNumber}
• Bed Number: ${context.hostel.bedNumber}
• Status: ${context.hostel.status}
• Allocated: ${new Date(context.hostel.allocatedAt).toLocaleDateString()}

Room Details:
• Type: ${context.hostel.room.roomType}
• Capacity: ${context.hostel.room.capacity} students
• Current Occupancy: ${context.hostel.room.occupied}/${context.hostel.room.capacity}

For hostel-related issues, maintenance requests, or visitor permissions, contact the Warden's office. Hostel rules and regulations are available on the notice board and college website.`;
    } else {
      return `You don't currently have a hostel allocation. If you need hostel accommodation:

📋 Steps to apply:
1. Visit the Hostel Administration Office
2. Fill out the accommodation application form
3. Submit required documents (ID proof, fee payment receipt)
4. Wait for room allocation based on availability

Contact Details:
• Hostel Office: hostel@college.edu
• Phone: +91-XXXXXXXXXX
• Office Hours: 9 AM - 5 PM (Mon-Fri)

Priority is given to outstation students and those with genuine accommodation needs.`;
    }
  },

  notices: (context) => {
    const notices = context.notices || [];
    
    return `Recent notices and announcements for you:

${notices.length > 0 ? notices.map((notice, index) => 
      `${index + 1}. ${notice.title} (${notice.priority})
   📅 Published: ${new Date(notice.publishedAt).toLocaleDateString()}
   ${notice.content.length > 100 ? notice.content.substring(0, 100) + '...' : notice.content}`
    ).join('\n\n') : 'No recent notices found for your department.'}

💡 Tip: Check the notice board regularly and enable notifications in your student portal to stay updated with important announcements, exam schedules, and college events.

For urgent notices, check your college email daily.`;
  },

  progress: (context) => {
    const progress = context.progress || [];
    
    return `Your academic progress summary:

${progress.length > 0 ? `Recent Assessments:
${progress.map(prog => `• ${prog.subject}: ${prog.marksObtained}/${prog.totalMarks} marks (${Math.round((prog.marksObtained/prog.totalMarks)*100)}%)
  Teacher: ${prog.teacher?.firstName} ${prog.teacher?.lastName}`).join('\n')}

📊 Performance Analysis:
Your overall academic performance shows ${progress.length} recorded assessments. Keep up the consistent effort in all subjects.` : 'No recent academic progress records found.'}

📚 Study Tips:
• Maintain regular study schedule
• Attend all classes and take detailed notes
• Participate actively in discussions
• Seek help from faculty during office hours if needed

For detailed academic transcripts, visit the Academic Office or check your student portal.`;
  },

  profile: (context) => {
    const student = context.student;
    
    return `Your student profile information:

👤 Personal Details:
• Name: ${student?.firstName} ${student?.lastName}
• Student ID: ${student?.studentId}
• Department: ${student?.department}
• Email: ${student?.email}
• Phone: ${student?.phone || 'Not provided'}
• Date of Birth: ${student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not provided'}
• Enrolled Since: ${new Date(student?.createdAt).toLocaleDateString()}

📧 Important: Keep your contact information updated through the student portal. This ensures you receive important communications from the college.

To update your profile information, log into the student portal or visit the Student Services office with proper identification.`;
  },

  general: (context) => {
    const student = context.student;
    
    return `Hello ${student?.firstName}! 👋 I'm your AI academic assistant, here to help you with information about your college life.

🎓 What I can help you with:
• Academic records and progress tracking
• Fee payments and due dates
• Library book management
• Hostel accommodation details
• Recent notices and announcements
• Attendance records
• Exam schedules and results

📱 Quick Commands:
• "Show my fees" - View pending payments
• "My attendance" - Check attendance records
• "Library books" - See issued books
• "Recent notices" - Latest announcements
• "Hostel details" - Room information
• "Academic progress" - Grades and assessments

💡 Tip: I have access to your personal academic data, so all responses are tailored specifically for you. Feel free to ask specific questions about your college experience!

How can I assist you today?`;
  }
};

// Get student's personal data for context
const getStudentContext = async (studentId) => {
  try {
    // Get student profile
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        firstName: true,
        lastName: true,
        studentId: true,
        department: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        createdAt: true
      }
    });

    // Get attendance records
    const attendanceRecords = await prisma.studentClassAttendance.findMany({
      where: { studentId },
      include: {
        session: {
          select: {
            subject: true,
            className: true,
            startTime: true
          }
        }
      },
      orderBy: { markedAt: 'desc' },
      take: 10
    });

    // Get fees
    const fees = await prisma.fee.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get issued books
    const issuedBooks = await prisma.bookIssue.findMany({
      where: { studentId },
      include: {
        book: {
          select: {
            title: true,
            author: true,
            isbn: true
          }
        }
      },
      orderBy: { issueDate: 'desc' },
      take: 5
    });

    // Get hostel allocation
    const hostelAllocation = await prisma.hostelAllocation.findUnique({
      where: { studentId },
      include: {
        room: {
          include: {
            block: true
          }
        }
      }
    });

    // Get recent notices
    const notices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: 'STUDENTS' },
          { 
            AND: [
              { targetAudience: 'DEPARTMENT' },
              { targetValue: student?.department }
            ]
          }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        title: true,
        content: true,
        priority: true,
        publishedAt: true
      }
    });

    // Get student progress
    const progress = await prisma.studentProgress.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get recent exam results  
    const examResults = await prisma.examResult.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            title: true,
            type: true,
            course: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return {
      student,
      attendance: attendanceRecords,
      fees,
      books: issuedBooks,
      hostel: hostelAllocation,
      notices,
      progress,
      examResults
    };
  } catch (error) {
    console.error('Error fetching student context:', error);
    return null;
  }
};

// Determine response type based on message
const getResponseType = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('attendance') || lowerMessage.includes('classes') || lowerMessage.includes('present')) {
    return 'attendance';
  }
  if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || lowerMessage.includes('due') || lowerMessage.includes('money')) {
    return 'fees';
  }
  if (lowerMessage.includes('book') || lowerMessage.includes('library') || lowerMessage.includes('issued')) {
    return 'books';
  }
  if (lowerMessage.includes('hostel') || lowerMessage.includes('room') || lowerMessage.includes('accommodation')) {
    return 'hostel';
  }
  if (lowerMessage.includes('notice') || lowerMessage.includes('announcement') || lowerMessage.includes('news')) {
    return 'notices';
  }
  if (lowerMessage.includes('progress') || lowerMessage.includes('marks') || lowerMessage.includes('grade') || lowerMessage.includes('performance')) {
    return 'progress';
  }
  if (lowerMessage.includes('profile') || lowerMessage.includes('information') || lowerMessage.includes('details') || lowerMessage.includes('personal')) {
    return 'profile';
  }
  
  return 'general';
};

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, chatHistory = [] } = req.body;
    const studentId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get student context
    const context = await getStudentContext(studentId);
    
    if (!context) {
      return res.status(500).json({ error: 'Failed to fetch student data' });
    }

    let response = '';

    try {
      // Try Gemini AI first if available
      if (model && process.env.GEMINI_API_KEY) {
        const contextPrompt = `
You are an AI assistant for a college ERP system. You are helping a student named ${context.student?.firstName} ${context.student?.lastName}.

Student Information:
- Name: ${context.student?.firstName} ${context.student?.lastName}
- Student ID: ${context.student?.studentId}
- Department: ${context.student?.department}
- Email: ${context.student?.email}
- Phone: ${context.student?.phone || 'Not provided'}

Recent Attendance (last 10 records):
${context.attendance.map(att => `- ${att.session.subject} (${att.session.className}) on ${new Date(att.markedAt).toLocaleDateString()}`).join('\n')}

Fee Information:
${context.fees.map(fee => `- ${fee.feeType}: ₹${fee.amount} (${fee.status}) - Due: ${new Date(fee.dueDate).toLocaleDateString()}`).join('\n')}

Library Books:
${context.books.map(book => `- "${book.book.title}" by ${book.book.author} - Issued: ${new Date(book.issueDate).toLocaleDateString()} (Status: ${book.status})`).join('\n')}

Hostel Information:
${context.hostel ? `Room ${context.hostel.room.roomNumber} in ${context.hostel.room.block.name} - Bed ${context.hostel.bedNumber} (Status: ${context.hostel.status})` : 'No hostel allocation'}

Recent Notices:
${context.notices.map(notice => `- ${notice.title} (${notice.priority}) - ${new Date(notice.publishedAt).toLocaleDateString()}`).join('\n')}

Academic Progress:
${context.progress.map(prog => `- ${prog.subject}: ${prog.marksObtained}/${prog.totalMarks} marks - Teacher: ${prog.teacher?.firstName} ${prog.teacher?.lastName}`).join('\n')}

Recent Exam Results:
${context.examResults.map(result => `- ${result.exam.title} (${result.exam.type}): ${result.totalMarks ? `${result.totalMarks} marks` : 'Pending'} - Grade: ${result.grade || 'Not assigned'}`).join('\n')}

Please answer the student's questions based on this information. Be helpful, concise, and friendly. If the student asks about information not available in the context, politely let them know and suggest they contact the relevant department.

Student's question: ${message}
`;

        // Create chat session with history
        const chat = model.startChat({
          history: chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        });

        // Send message and get response
        const result = await chat.sendMessage(contextPrompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
      } else {
        throw new Error('Gemini not available');
      }
    } catch (geminiError) {
      console.warn('Gemini AI error, using fallback response:', geminiError.message);
      
      // Use fallback responses
      const responseType = getResponseType(message);
      response = FALLBACK_RESPONSES[responseType](context);
    }

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
      source: model ? 'ai' : 'fallback'
    });

  } catch (error) {
    console.error('AI Chatbot error:', error);
    
    // Ultimate fallback
    const context = await getStudentContext(req.user.id);
    const responseType = getResponseType(req.body.message || '');
    const fallbackResponse = FALLBACK_RESPONSES[responseType](context || {});
    
    res.json({
      success: true,
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      source: 'emergency_fallback'
    });
  }
});

// Get chat suggestions based on student data
router.get('/suggestions', async (req, res) => {
  try {
    const studentId = req.user.id;
    const context = await getStudentContext(studentId);

    const suggestions = [];

    // Dynamic suggestions based on student data
    if (context?.fees?.some(fee => fee.status === 'PENDING')) {
      suggestions.push("What are my pending fees?");
    }

    if (context?.attendance?.length > 0) {
      suggestions.push("What's my attendance percentage?");
    }

    if (context?.books?.some(book => book.status === 'ISSUED')) {
      suggestions.push("Which books do I have issued?");
    }

    if (context?.hostel) {
      suggestions.push("Tell me about my hostel room");
    }

    if (context?.notices?.length > 0) {
      suggestions.push("What are the latest notices for me?");
    }

    // Default suggestions if no specific data
    if (suggestions.length === 0) {
      suggestions.push(
        "Tell me about my academic performance",
        "What's my current status in the college?",
        "Help me with exam information",
        "Show me my profile information"
      );
    }

    res.json({ suggestions });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.json({ 
      suggestions: [
        "How can you help me?", 
        "Tell me about my profile",
        "What are my pending fees?",
        "Show my attendance record"
      ] 
    });
  }
});

export default router;
