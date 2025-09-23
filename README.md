# College ERP System

A comprehensive Enterprise Resource Planning (ERP) system designed specifically for educational institutions. Built with React + TypeScript frontend, Node.js + Express backend, and Prisma + MySQL database.

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password reset functionality
- Secure session management

### Role-Based Dashboards
- **Admin**: Complete system oversight, user management, analytics
- **Faculty**: QR attendance, grading, student management
- **Student**: Personalized dashboard, QR code attendance, academic tracking
- **Accountant**: Fee management, financial reports
- **Librarian**: Book management, digital resources
- **Warden**: Hostel management, room allocation

### Core Workflows

#### E-Notice Board System
- Real-time notice distribution
- Targeted messaging (All, Students, Faculty, Department-specific)
- Rich text editor with file attachments
- WebSocket-based instant notifications
- Notice lifecycle management

#### QR Attendance System
- Faculty creates attendance sessions
- Students generate unique QR codes
- Faculty scans student QR codes for attendance
- Real-time attendance tracking
- Duplicate scan protection
- Comprehensive attendance reports

#### User Management
- Create, edit, and manage users across all roles
- Bulk user operations
- User activity tracking
- Profile management

### Additional Features
- Responsive design with mobile-first approach
- Real-time notifications via WebSockets
- Comprehensive audit logging
- Advanced analytics and reporting
- File upload and management
- Dark blue sidebar with professional UI theme

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Socket.IO Client** for real-time features
- **React Hook Form** for form management
- **Axios** for API calls
- **Recharts** for data visualization
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **Prisma ORM** with MySQL database
- **Socket.IO** for WebSocket connections
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Helmet** for security
- **Rate limiting** for API protection

### Database
- **MySQL** with Prisma ORM
- Comprehensive schema with audit logging
- Optimized queries and indexes
- Data integrity constraints

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd college-erp-system
```

### 2. Database Setup
1. Install and start MySQL server
2. Create a database named `college_erp`:
```sql
CREATE DATABASE college_erp;
```
3. Note your MySQL credentials (username, password, host, port)

### 3. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env file with your database credentials and other configurations
# Example .env:
# DATABASE_URL="mysql://root:password@localhost:3306/college_erp"
# JWT_ACCESS_SECRET="your-super-secret-access-key"
# JWT_REFRESH_SECRET="your-super-secret-refresh-key"
# PORT=5000

# Generate Prisma client
npx prisma generate

# Push database schema (creates tables)
npx prisma db push

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 4. Frontend Setup
```bash
# Navigate to client directory (from root)
cd client

# Install dependencies
npm install
```

### 5. Running the Application

#### Development Mode
Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
The backend will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
The frontend will start on `http://localhost:3000`

#### Production Mode
```bash
# Build frontend
cd client
npm run build

# Start backend (serves both API and frontend)
cd ../server
npm start
```

## 📱 Usage

### Initial Setup
1. Visit `http://localhost:3000`
2. Click "Register" to create your first admin account
3. Choose "Admin" role during registration
4. Login with your credentials

### Creating Users
1. Login as Admin
2. Navigate to User Management
3. Create users for different roles (Faculty, Students, etc.)
4. Provide role-specific information (Student ID, Employee ID, Department)

### Using QR Attendance
**For Faculty:**
1. Login and go to QR Attendance
2. Click "Start New Session"
3. Fill in class details (subject, time, location)
4. Use "Open QR Scanner" to scan student QR codes

**For Students:**
1. Login and visit dashboard
2. Click "Generate QR Code" 
3. Show QR code to faculty for scanning

### Managing Notices
1. Login as Admin or Faculty
2. Go to Notice Board
3. Create notice with title, content, and target audience
4. Publish immediately or schedule for later
5. Recipients get real-time notifications

## 🏗️ Project Structure

```
college-erp-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth, Socket)
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── prisma/           # Database schema
│   └── package.json
└── README.md
```

## 🔐 Default Roles & Permissions

### Admin
- Complete system access
- User management (create, edit, delete)
- Global notice management
- System analytics and reports
- All module access

### Faculty
- QR attendance management
- Grade and exam management
- Student progress tracking
- Class-specific notices
- Academic resource upload

### Student
- Personal dashboard
- QR code generation for attendance
- Academic progress viewing
- Fee status and payments
- Library and hostel access

### Accountant
- Fee management and collection
- Financial reports
- Scholarship management
- Payment tracking

### Librarian
- Book inventory management
- Student borrowing records
- Digital resource management
- Library analytics

### Warden
- Hostel room management
- Student allocation
- Visitor management
- Hostel reports

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- Audit logging for all critical actions
- Role-based access control

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user

### Notices
- `GET /api/notices` - Get notices for current user
- `POST /api/notices` - Create notice
- `POST /api/notices/:id/read` - Mark notice as read

### Attendance
- `POST /api/attendance/sessions` - Create attendance session
- `POST /api/attendance/student-qr` - Generate student QR
- `POST /api/attendance/mark` - Mark attendance

## 🚀 Deployment

### Environment Variables
Ensure these environment variables are set:
```
DATABASE_URL=your_mysql_connection_string
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
PORT=5000
NODE_ENV=production
FRONTEND_URL=your_frontend_url
```

### Database Migration
```bash
# Run in production
npx prisma migrate deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and queries:
- Create an issue in the repository
- Check existing documentation
- Review the code comments for implementation details

## 🔄 Version History

- **v1.0.0** - Initial release with core ERP functionality
- Authentication & authorization
- QR-based attendance system
- E-Notice board
- Role-based dashboards
- User management
- Responsive UI design

---

Made with ❤️ for educational institutions worldwide.