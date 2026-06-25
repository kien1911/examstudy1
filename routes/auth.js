const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/database');

const router = express.Router();

// ----- Trang đăng ký -----
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;

    if (!full_name || !email || !password) {
      return res.render('register', { error: 'Vui lòng điền đầy đủ thông tin.' });
    }
    if (password !== confirm_password) {
      return res.render('register', { error: 'Mật khẩu xác nhận không khớp.' });
    }
    if (password.length < 6) {
      return res.render('register', { error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.render('register', { error: 'Email này đã được đăng ký.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,'student') RETURNING id`,
      [full_name, email, hash]
    );

    req.session.user = {
      id: result.rows[0].id,
      full_name,
      email,
      role: 'student'
    };

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

// ----- Trang đăng nhập -----
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.render('login', { error: 'Email hoặc mật khẩu không đúng.' });
    }

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    if (user.role === 'teacher') return res.redirect('/teacher/dashboard');
    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

// ----- Đăng xuất -----
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
