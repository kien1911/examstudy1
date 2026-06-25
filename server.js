require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

const { pool, initDb } = require('./db/database');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const examRoutes = require('./routes/exams');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- View engine -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----- Middleware -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 ngày
}));

app.use(attachUser);

// ----- Trang chủ -----
app.get('/', async (req, res, next) => {
  try {
    const featuredCourses = (await pool.query(`
      SELECT courses.*, users.full_name AS teacher_name
      FROM courses LEFT JOIN users ON courses.teacher_id = users.id
      ORDER BY courses.created_at DESC LIMIT 6
    `)).rows;

    const totalCourses = (await pool.query('SELECT COUNT(*) AS c FROM courses')).rows[0].c;
    const totalStudents = (await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'student'")).rows[0].c;
    const totalExams = (await pool.query('SELECT COUNT(*) AS c FROM exams')).rows[0].c;

    res.render('home', {
      featuredCourses,
      stats: { totalCourses, totalStudents, totalExams }
    });
  } catch (err) {
    next(err);
  }
});

// ----- Routes -----
app.use('/', authRoutes);
app.use('/', courseRoutes);
app.use('/', examRoutes);
app.use('/', dashboardRoutes);

// ----- 404 -----
app.use((req, res) => {
  res.status(404).render('error', { message: 'Không tìm thấy trang yêu cầu.', user: req.session.user || null });
});

// ----- 500 -----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Đã có lỗi xảy ra ở server.', user: req.session.user || null });
});

// ----- Khởi động: chờ DB sẵn sàng rồi mới lắng nghe request -----
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Lỗi khởi tạo database:', err);
    process.exit(1);
  });
