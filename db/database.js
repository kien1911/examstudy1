const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
});

// ---------- SCHEMA + SEED (chạy 1 lần lúc khởi động server) ----------
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      teacher_id INTEGER REFERENCES users(id),
      thumbnail TEXT,
      price INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      enrolled_at TIMESTAMP DEFAULT NOW(),
      progress INTEGER DEFAULT 0,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      course_id INTEGER REFERENCES courses(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id),
      content TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      explanation TEXT
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      exam_id INTEGER NOT NULL REFERENCES exams(id),
      score REAL,
      total_questions INTEGER,
      correct_count INTEGER,
      started_at TIMESTAMP DEFAULT NOW(),
      finished_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attempt_answers (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER NOT NULL REFERENCES attempts(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_option TEXT,
      is_correct INTEGER
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (parseInt(rows[0].c, 10) === 0) {
    console.log('Đang tạo dữ liệu mẫu...');

    const teacherHash = bcrypt.hashSync('teacher123', 10);
    const studentHash = bcrypt.hashSync('student123', 10);
    const adminHash = bcrypt.hashSync('admin123', 10);

    const teacherRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Cô Lan Anh', 'teacher@demo.com', teacherHash, 'teacher']
    );
    const teacherId = teacherRes.rows[0].id;

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4)`,
      ['Học sinh Demo', 'student@demo.com', studentHash, 'student']
    );
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4)`,
      ['Quản trị viên', 'admin@demo.com', adminHash, 'admin']
    );

    const c1 = (await pool.query(
      `INSERT INTO courses (title, description, category, teacher_id, thumbnail, price)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['Luyện thi TSA - Tư duy Toán học',
       'Khóa học giúp học sinh làm quen và luyện tập các dạng câu hỏi tư duy Toán học trong bài thi đánh giá tư duy (TSA).',
       'TSA', teacherId, '/img/course-tsa.svg', 0]
    )).rows[0].id;

    const c2 = (await pool.query(
      `INSERT INTO courses (title, description, category, teacher_id, thumbnail, price)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['Luyện thi HSA - Đánh giá năng lực',
       'Tổng hợp kiến thức và kỹ năng làm bài thi đánh giá năng lực (HSA) theo cấu trúc mới nhất.',
       'HSA', teacherId, '/img/course-hsa.svg', 0]
    )).rows[0].id;

    const c3 = (await pool.query(
      `INSERT INTO courses (title, description, category, teacher_id, thumbnail, price)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['Ôn thi THPT Quốc gia - Toán',
       'Hệ thống hóa kiến thức Toán THPT, luyện đề theo từng chuyên đề bám sát cấu trúc đề thi THPT Quốc gia.',
       'THPT', teacherId, '/img/course-thpt.svg', 0]
    )).rows[0].id;

    const e1 = (await pool.query(
      `INSERT INTO exams (course_id, title, category, duration_minutes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [c1, 'Đề luyện tập TSA số 1', 'TSA', 30]
    )).rows[0].id;

    const e2 = (await pool.query(
      `INSERT INTO exams (course_id, title, category, duration_minutes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [c2, 'Đề luyện tập HSA số 1', 'HSA', 30]
    )).rows[0].id;

    const e3 = (await pool.query(
      `INSERT INTO exams (course_id, title, category, duration_minutes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [c3, 'Đề luyện tập THPT - Toán số 1', 'THPT', 45]
    )).rows[0].id;

    const insertQ = async (examId, q) => {
      await pool.query(
        `INSERT INTO questions (exam_id, content, option_a, option_b, option_c, option_d, correct_option, explanation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [examId, q.content, q.a, q.b, q.c, q.d, q.correct, q.explanation]
      );
    };

    const tsaQuestions = [
      { content: 'Một hình chữ nhật có chiều dài gấp 2 lần chiều rộng. Nếu chu vi của hình chữ nhật là 36cm, diện tích của hình chữ nhật là bao nhiêu?', a: '54 cm²', b: '60 cm²', c: '72 cm²', d: '48 cm²', correct: 'C', explanation: 'Gọi chiều rộng là x, chiều dài là 2x. Chu vi = 2(x + 2x) = 6x = 36 => x = 6. Diện tích = x × 2x = 6 × 12 = 72 cm².' },
      { content: 'Dãy số 2, 6, 12, 20, 30, ... có quy luật là cộng thêm số chẵn tăng dần. Số tiếp theo trong dãy là?', a: '40', b: '42', c: '44', d: '38', correct: 'B', explanation: 'Hiệu giữa các số liên tiếp là 4, 6, 8, 10, 12 => số tiếp theo = 30 + 12 = 42.' },
      { content: 'Nếu x + y = 10 và x − y = 4, giá trị của x là?', a: '5', b: '6', c: '7', d: '8', correct: 'C', explanation: 'Cộng hai phương trình: 2x = 14 => x = 7.' }
    ];
    for (const q of tsaQuestions) await insertQ(e1, q);

    const hsaQuestions = [
      { content: 'Trong các từ sau, từ nào không cùng nhóm nghĩa với các từ còn lại: "vui vẻ", "hân hoan", "phấn khởi", "ưu tư"?', a: 'vui vẻ', b: 'hân hoan', c: 'phấn khởi', d: 'ưu tư', correct: 'D', explanation: '"Ưu tư" mang nghĩa lo lắng, buồn bã, khác với 3 từ còn lại đều thể hiện sự vui vẻ, tích cực.' },
      { content: 'Một người đi xe máy với vận tốc 40km/h trong 1.5 giờ. Quãng đường người đó đi được là?', a: '50km', b: '55km', c: '60km', d: '65km', correct: 'C', explanation: 'Quãng đường = vận tốc × thời gian = 40 × 1.5 = 60km.' },
      { content: 'Hiện tượng nào sau đây là hiện tượng vật lý (không phải hóa học)?', a: 'Đốt cháy giấy', b: 'Nước đá tan thành nước', c: 'Sắt bị gỉ', d: 'Nến cháy', correct: 'B', explanation: 'Nước đá tan thành nước chỉ là sự thay đổi trạng thái, không tạo ra chất mới nên là hiện tượng vật lý.' }
    ];
    for (const q of hsaQuestions) await insertQ(e2, q);

    const thptQuestions = [
      { content: 'Tập nghiệm của phương trình x² − 5x + 6 = 0 là?', a: '{1, 6}', b: '{2, 3}', c: '{-2, -3}', d: '{2, -3}', correct: 'B', explanation: 'Phân tích: x² − 5x + 6 = (x−2)(x−3) = 0 => x = 2 hoặc x = 3.' },
      { content: 'Đạo hàm của hàm số y = x³ − 3x² + 2 là?', a: '3x² − 6x', b: '3x² − 3x', c: 'x² − 6x', d: '3x² − 6x + 2', correct: 'A', explanation: "y' = 3x² − 6x (đạo hàm của hằng số 2 là 0)." },
      { content: 'Giới hạn lim(x→0) (sin x)/x bằng?', a: '0', b: '1', c: '∞', d: 'không xác định', correct: 'B', explanation: 'Đây là giới hạn cơ bản trong giải tích, lim(x→0) sin(x)/x = 1.' }
    ];
    for (const q of thptQuestions) await insertQ(e3, q);

    console.log('Đã tạo xong dữ liệu mẫu.');
    console.log('--- Tài khoản demo ---');
    console.log('Học sinh: student@demo.com / student123');
    console.log('Giáo viên: teacher@demo.com / teacher123');
    console.log('Admin:    admin@demo.com / admin123');
  }
}

module.exports = { pool, initDb };
