const express = require('express');
const { pool } = require('../db/database');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Dashboard học sinh
router.get('/dashboard', requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const enrolledCourses = (await pool.query(`
      SELECT courses.*, enrollments.progress, enrollments.enrolled_at
      FROM enrollments JOIN courses ON enrollments.course_id = courses.id
      WHERE enrollments.user_id = $1
      ORDER BY enrollments.enrolled_at DESC
    `, [userId])).rows;

    const recentAttempts = (await pool.query(`
      SELECT attempts.*, exams.title AS exam_title, exams.category
      FROM attempts JOIN exams ON attempts.exam_id = exams.id
      WHERE attempts.user_id = $1
      ORDER BY attempts.started_at DESC
      LIMIT 10
    `, [userId])).rows.map(a => ({ ...a, score: a.score !== null ? parseFloat(a.score) : null }));

    const statsResult = await pool.query(`
      SELECT COUNT(*) AS total_attempts, AVG(score) AS avg_score
      FROM attempts WHERE user_id = $1 AND score IS NOT NULL
    `, [userId]);

    const stats = {
      total_attempts: parseInt(statsResult.rows[0].total_attempts, 10) || 0,
      avg_score: statsResult.rows[0].avg_score !== null ? parseFloat(statsResult.rows[0].avg_score) : null
    };

    res.render('dashboard', { enrolledCourses, recentAttempts, stats });
  } catch (err) {
    next(err);
  }
});

// Dashboard giáo viên
router.get('/teacher/dashboard', requireLogin, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;

    const myCourses = (await pool.query(`
      SELECT courses.*,
        (SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = courses.id) AS student_count
      FROM courses WHERE teacher_id = $1
      ORDER BY created_at DESC
    `, [teacherId])).rows;

    res.render('teacher-dashboard', { myCourses });
  } catch (err) {
    next(err);
  }
});

// Dashboard admin
router.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res, next) => {
  try {
    const totalUsers = (await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'student'")).rows[0].c;
    const totalTeachers = (await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher'")).rows[0].c;
    const totalCourses = (await pool.query('SELECT COUNT(*) AS c FROM courses')).rows[0].c;
    const totalAttempts = (await pool.query('SELECT COUNT(*) AS c FROM attempts')).rows[0].c;

    const recentUsers = (await pool.query(`
      SELECT id, full_name, email, role, created_at FROM users
      ORDER BY created_at DESC LIMIT 10
    `)).rows;

    res.render('admin-dashboard', {
      totalUsers, totalTeachers, totalCourses, totalAttempts, recentUsers
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
