import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const seedDatabase = async () => {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['Admin User', 'admin@example.com', adminPassword, 'admin']);

    // Create instructor
    const instructorPassword = await bcrypt.hash('instructor123', 10);
    const [instructorResult] = await pool.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['John Doe', 'instructor@example.com', instructorPassword, 'instructor']);

    // Create student
    const studentPassword = await bcrypt.hash('student123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['Jane Smith', 'student@example.com', studentPassword, 'student']);

    // Create sample courses
    const courses = [
      {
        title: 'Introduction to Web Development',
        description: 'Learn the basics of HTML, CSS, and JavaScript',
        price: 99.99
      },
      {
        title: 'Advanced React Programming',
        description: 'Master React.js with advanced concepts and real projects',
        price: 149.99
      }
    ];

    for (const course of courses) {
      await pool.query(`
        INSERT INTO courses (title, description, instructor_id, price) 
        VALUES (?, ?, ?, ?)
      `, [course.title, course.description, instructorResult.insertId, course.price]);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();