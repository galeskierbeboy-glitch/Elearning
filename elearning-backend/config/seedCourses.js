import { pool } from './db.js';

const seedCourses = async () => {
  const conn = await pool.getConnection();
  try {
    // Create instructor if not exists
    const [instructor] = await conn.query(`
      SELECT user_id FROM users WHERE role = 'instructor' LIMIT 1
    `);
    
    let instructorId;
    if (instructor.length === 0) {
      const [result] = await conn.query(`
        INSERT INTO users (full_name, email, password, role) 
        VALUES ('John Doe', 'instructor@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9PeYoKRWkYryAK', 'instructor')
      `);
      instructorId = result.insertId;
    } else {
      instructorId = instructor[0].user_id;
    }

    // Create sample courses
    const courses = [
      {
        title: 'Introduction to Web Development',
        description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript. Perfect for beginners looking to start their journey in web development.',
        instructor_id: instructorId
      },
      {
        title: 'React Fundamentals',
        description: 'Master the basics of React, including components, state, props, and hooks. Build real-world applications while learning.',
        instructor_id: instructorId
      },
      {
        title: 'Node.js Backend Development',
        description: 'Learn server-side development with Node.js and Express. Includes database integration, API development, and authentication.',
        instructor_id: instructorId
      }
    ];

    console.log('Creating courses...');
    for (const course of courses) {
      const [result] = await conn.query(`
        INSERT INTO courses (title, description, instructor_id) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description)
      `, [course.title, course.description, course.instructor_id]);
      
      // Create some lessons for each course
      const lessons = [
        { title: 'Introduction', content: 'Welcome to the course!' },
        { title: 'Getting Started', content: 'Setup your development environment' },
        { title: 'First Steps', content: 'Your first project' }
      ];

      for (const lesson of lessons) {
        await conn.query(`
          INSERT INTO lessons (course_id, title, content) 
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          content = VALUES(content)
        `, [result.insertId, lesson.title, lesson.content]);
      }
    }

    // Create course_enrollments table if it doesn't exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP NULL,
        progress INT DEFAULT 0,
        completed_lessons INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
        UNIQUE KEY unique_enrollment (user_id, course_id)
      )
    `);

    // Get a student user
    const [student] = await conn.query(`
      SELECT user_id FROM users WHERE role = 'student' LIMIT 1
    `);

    let studentId;
    if (student.length === 0) {
      const [result] = await conn.query(`
        INSERT INTO users (full_name, email, password, role) 
        VALUES ('Jane Smith', 'student@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9PeYoKRWkYryAK', 'student')
      `);
      studentId = result.insertId;
    } else {
      studentId = student[0].user_id;
    }

    // Get all courses
    const [allCourses] = await conn.query('SELECT course_id FROM courses');

    console.log('Enrolling student in courses...');
    // Enroll the student in all courses with different progress
    for (let i = 0; i < allCourses.length; i++) {
      const progress = i * 33; // 0%, 33%, 66% progress
      await conn.query(`
        INSERT INTO course_enrollments (user_id, course_id, progress, completed_lessons)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        progress = VALUES(progress),
        completed_lessons = VALUES(completed_lessons)
      `, [studentId, allCourses[i].course_id, progress, Math.floor(progress / 33)]);
    }

    console.log('Sample courses and enrollments created successfully!');
  } catch (error) {
    console.error('Error seeding courses:', error);
    throw error;
  } finally {
    conn.release();
  }
};

// Run the seed function
seedCourses()
  .then(() => {
    console.log('Database seeded successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  });