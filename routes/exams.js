const express = require('express');
const { pool } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Trang làm bài thi
router.get('/exams/:id/take', requireLogin, async (req, res, next) => {
  try {
    const examResult = await pool.query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    const exam = examResult.rows[0];
    if (!exam) {
      return res.status(404).render('error', { message: 'Không tìm thấy đề thi.', user: req.session.user });
    }

    const questions = (await pool.query(
      `SELECT id, content, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = $1`,
      [exam.id]
    )).rows;

    res.render('exam-take', { exam, questions });
  } catch (err) {
    next(err);
  }
});

// Nộp bài thi -> tính điểm, lưu kết quả vào DB
router.post('/exams/:id/submit', requireLogin, async (req, res, next) => {
  try {
    const examResult = await pool.query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    const exam = examResult.rows[0];
    if (!exam) {
      return res.status(404).render('error', { message: 'Không tìm thấy đề thi.', user: req.session.user });
    }

    const questions = (await pool.query('SELECT * FROM questions WHERE exam_id = $1', [exam.id])).rows;

    const attemptResult = await pool.query(
      `INSERT INTO attempts (user_id, exam_id, total_questions, finished_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [req.session.user.id, exam.id, questions.length]
    );
    const attemptId = attemptResult.rows[0].id;

    let correctCount = 0;

    for (const q of questions) {
      const selected = req.body[`question_${q.id}`] || null;
      const isCorrect = selected === q.correct_option ? 1 : 0;
      if (isCorrect) correctCount++;
      await pool.query(
        `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, q.id, selected, isCorrect]
      );
    }

    const score = questions.length > 0 ? (correctCount / questions.length) * 10 : 0;

    await pool.query(
      'UPDATE attempts SET score = $1, correct_count = $2 WHERE id = $3',
      [score, correctCount, attemptId]
    );

    res.redirect(`/attempts/${attemptId}/result`);
  } catch (err) {
    next(err);
  }
});

// Xem kết quả chi tiết của 1 lần làm bài
router.get('/attempts/:id/result', requireLogin, async (req, res, next) => {
  try {
    const attemptResult = await pool.query(`
      SELECT attempts.*, exams.title AS exam_title, exams.category
      FROM attempts JOIN exams ON attempts.exam_id = exams.id
      WHERE attempts.id = $1
    `, [req.params.id]);

    const attempt = attemptResult.rows[0];
    if (!attempt || attempt.user_id !== req.session.user.id) {
      return res.status(404).render('error', { message: 'Không tìm thấy kết quả.', user: req.session.user });
    }
    attempt.score = attempt.score !== null ? parseFloat(attempt.score) : 0;

    const answers = (await pool.query(`
      SELECT attempt_answers.*, questions.content, questions.option_a, questions.option_b,
             questions.option_c, questions.option_d, questions.correct_option, questions.explanation
      FROM attempt_answers
      JOIN questions ON attempt_answers.question_id = questions.id
      WHERE attempt_answers.attempt_id = $1
    `, [attempt.id])).rows;

    res.render('exam-result', { attempt, answers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
