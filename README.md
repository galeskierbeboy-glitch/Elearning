# E-Learning Platform

A full-stack e-learning platform built with React and Node.js, featuring course management, quiz systems, and notifications.

## Project Structure

```
elearning/
├── elearning-backend/     # Node.js/Express backend
└── elearning-frontend/    # React frontend
```

## Features

- 🔐 Role-based authentication (Admin, Instructor, Student, Security Analyst)
- 📚 Course management
- 📝 Quiz creation and submission
- 📊 Grade tracking
- 🔔 Notification system
- 📱 Responsive design

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Getting Started

### Backend Setup

```bash
cd elearning-backend
npm install
# Create .env file with your database credentials
npm run dev
```

### Frontend Setup

```bash
cd elearning-frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=elearning_db
JWT_SECRET=your_jwt_secret
```

## API Documentation

The API documentation is available at `/api-docs` when running the backend server.

## Database Schema

Check the SQL migration files in `elearning-backend/config/migrations/` for the complete database structure.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.