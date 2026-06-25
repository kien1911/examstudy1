const express = require('express');
const { pool } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Danh sách khóa học (lọc theo category nếu có)
router.get('/courses', async (req, res, next) => {
  try {
    const { category } = req.query;
    let result;
    if (category && ['TSA', 'HSA', 'THPT'].includes(category)) {
      result = await pool.query(`
        SELECT courses.*, users.full_name AS teacher_name
        FROM courses LEFT JOIN users ON courses.teacher_id = users.id
        WHERE category = $1 ORDER BY courses.created_at DESC
      `, [category]);
    } else {
      result = await pool.query(`
        SELECT courses.*, users.full_name AS teacher_name
        FROM courses LEFT JOIN users ON courses.teacher_id = users.id
        ORDER BY courses.created_at DESC
      `);
    }
    res.render('courses', { courses: result.rows, activeCategory: category || 'all' });
  } catch (err) {
    next(err);
  }
});

// Chi tiết khóa học
router.get('/courses/:id', async (req, res, next) => {
  try {
    const courseResult = await pool.query(`
      SELECT courses.*, users.full_name AS teacher_name
      FROM courses LEFT JOIN users ON courses.teacher_id = users.id
      WHERE courses.id = $1
    `, [req.params.id]);

    const course = courseResult.rows[0];
    if (!course) {
      return res.status(404).render('error', { message: 'Không tìm thấy khóa học.', user: req.session.user || null });
    }

    const exams = (await pool.query('SELECT * FROM exams WHERE course_id = $1', [course.id])).rows;

    let isEnrolled = false;
    if (req.session.user) {
      const enrollment = await pool.query(
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [req.session.user.id, course.id]
      );
      isEnrolled = enrollment.rows.length > 0;
    }

    res.render('course-detail', { course, exams, isEnrolled });
  } catch (err) {
    next(err);
  }
});

// Đăng ký học (enroll) - yêu cầu đăng nhập
router.post('/courses/:id/enroll', requireLogin, async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.session.user.id;

    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)',
        [userId, courseId]
      );
    }

    res.redirect(`/courses/${courseId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
