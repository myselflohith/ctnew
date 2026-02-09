# CardinalTalent - Job Search Platform

A modern job search and talent management platform built with React, TypeScript, and PostgreSQL.

## 🚀 Features

- **Multi-Role Support**: Separate dashboards for Job Seekers, Employers, Recruiters, and Admins
- **Custom Authentication**: Secure email/password authentication with bcrypt
- **Resume Management**: Upload, manage, and set default resumes
- **Password Reset**: Forgot password functionality with email-based reset
- **Session Management**: JWT-based authentication with secure sessions
- **Local File Storage**: Resume files stored locally on the server

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **TanStack Query** for data fetching
- **shadcn/ui** for beautiful UI components
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** for database
- **bcrypt** for password hashing
- **JWT** for authentication tokens
- **Multer** for file uploads
- **Nodemailer** for email functionality

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/cardinalhire/ctnew.git
cd ctnew
git checkout sk
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

#### Create Database

Open PostgreSQL command line (psql) or use a GUI tool like pgAdmin:

```sql
CREATE DATABASE cardinaltalent;
```

#### Update Database Credentials

Edit the `.env` file in the root directory and update the database credentials:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=cardinaltalent
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

**Important**: Replace `your_postgres_password` with your actual PostgreSQL password.

#### Run Database Migration

This will create all necessary tables and insert a default admin user:

```bash
npm run migrate
```

You should see output confirming the migration was successful, including:
- Default admin user created: `admin@cardinaltalent.com` / `admin123`
- ⚠️ **Important**: Change the admin password immediately after first login!

### 4. Configure Environment Variables

Review and update the `.env` file as needed:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=cardinaltalent
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret - CHANGE THIS IN PRODUCTION!
JWT_SECRET=your-secret-key-change-in-production-use-long-random-string

# Client Configuration
CLIENT_URL=http://localhost:5173
APP_URL=http://localhost:5173

# Email Configuration (optional for development)
EMAIL_FROM=noreply@cardinaltalent.com
```

**Security Notes**:
- Generate a strong, random JWT_SECRET for production
- Never commit the `.env` file with real credentials to version control
- The `.env` file is already in `.gitignore`

## 🚀 Running the Application

### Development Mode

Start both the backend server and frontend client concurrently:

```bash
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001/api
- **Frontend Client**: http://localhost:5173

### Run Backend Only

```bash
npm run server:dev
```

### Run Frontend Only

```bash
npm run client:dev
```

### Production Build

```bash
npm run build
```

This creates optimized production builds for both frontend and backend.

## 🔐 Default Login Credentials

After running the migration, you can log in with:

- **Email**: `admin@cardinaltalent.com`
- **Password**: `admin123`
- **Role**: Admin

⚠️ **Important**: Change this password immediately after first login!

## 📁 Project Structure

```
ctnew/
├── server/                    # Backend Express server
│   ├── database/             # Database configuration and schema
│   │   ├── connection.ts     # PostgreSQL connection pool
│   │   └── schema.sql        # Database schema
│   ├── middleware/           # Express middleware
│   │   └── auth.middleware.ts
│   ├── routes/               # API routes
│   │   ├── auth.routes.ts    # Authentication endpoints
│   │   └── resume.routes.ts  # Resume management endpoints
│   ├── services/             # Business logic
│   │   ├── auth.service.ts   # Authentication service
│   │   ├── email.service.ts  # Email service
│   │   └── resume.service.ts # Resume service
│   ├── scripts/              # Utility scripts
│   │   └── migrate.js        # Database migration script
│   └── index.ts              # Main server entry point
│
├── src/                       # Frontend React application
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and helpers
│   │   ├── api.ts            # API client
│   │   └── auth.ts           # Auth utilities
│   ├── pages/                # Page components
│   │   ├── Auth.tsx          # Login/Register page
│   │   ├── talent/           # Talent dashboard pages
│   │   ├── employer/         # Employer dashboard pages
│   │   ├── recruiter/        # Recruiter dashboard pages
│   │   └── admin/            # Admin dashboard pages
│   └── App.tsx               # Main app component
│
├── uploads/                   # Local file storage (created automatically)
│   └── resumes/              # Resume files
│
├── .env                       # Environment variables (not committed)
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Resume Management

- `GET /api/resumes` - Get all resumes for authenticated user
- `POST /api/resumes/upload` - Upload a new resume
- `PUT /api/resumes/:id/default` - Set default resume
- `DELETE /api/resumes/:id` - Delete a resume
- `GET /api/resumes/:id/download` - Download a resume

### Health Check

- `GET /api/health` - Check server status

## 🎯 User Roles

The application supports four user roles:

1. **Talent (Job Seeker)**
   - Browse and apply to jobs
   - Manage resume uploads
   - Track applications
   - Save favorite jobs

2. **Employer**
   - Post job listings
   - Review candidates
   - Manage company profile
   - Track applications

3. **Recruiter**
   - Manage multiple clients
   - Post jobs for clients
   - Source and recommend candidates
   - Track placements

4. **Admin**
   - Full system access
   - User management
   - Organization management
   - Security settings

## 🔒 Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Session Management**: Server-side session tracking with expiration
- **HTTP-Only Cookies**: Tokens stored in HTTP-only cookies to prevent XSS
- **CORS Protection**: Configured CORS to allow only trusted origins
- **Input Validation**: All user inputs are validated
- **File Upload Security**: Restricted file types and size limits for resume uploads

## 📧 Email Configuration (Production)

For production, configure SMTP settings in `.env`:

```env
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

In development mode, password reset emails are logged to the console instead of being sent.

## 🐛 Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure PostgreSQL is running:
   ```bash
   # Windows
   pg_ctl status -D "C:\Program Files\PostgreSQL\14\data"
   
   # macOS (Homebrew)
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify database credentials in `.env`
3. Check if the database exists:
   ```sql
   \l  -- List all databases in psql
   ```

### Port Already in Use

If ports 3001 or 5173 are already in use:

1. Change the PORT in `.env` for the backend
2. Update the `vite.config.ts` for the frontend port
3. Update the proxy configuration in `vite.config.ts` to match the new backend port

### Migration Errors

If the migration fails:

1. Drop the database and recreate it:
   ```sql
   DROP DATABASE IF EXISTS cardinaltalent;
   CREATE DATABASE cardinaltalent;
   ```

2. Run the migration again:
   ```bash
   npm run migrate
   ```

### Module Not Found Errors

If you see "Cannot find module" errors:

1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🚢 Deployment to AWS (Future)

The application is designed to be AWS-ready:

- **Frontend**: Deploy to AWS Amplify or S3 + CloudFront
- **Backend**: Deploy to AWS Elastic Beanstalk or ECS
- **Database**: Use AWS RDS for PostgreSQL
- **File Storage**: Migrate to AWS S3 for resume storage
- **Email**: Configure AWS SES for email functionality

## 📝 Development Notes

### Adding New Features

1. **Backend**: Add routes in `server/routes/`, services in `server/services/`
2. **Frontend**: Add pages in `src/pages/`, components in `src/components/`
3. **Database**: Update `server/database/schema.sql` and create migration scripts

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Note**: This application is configured for local development. For production deployment, ensure you:
- Change all default passwords and secrets
- Configure proper SMTP for emails
- Set up SSL/TLS certificates
- Configure a production-grade database with backups
- Implement proper logging and monitoring
- Set up a CDN for static assets
- Configure proper CORS origins
