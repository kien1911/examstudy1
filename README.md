# ExamStudy — Demo nền tảng luyện thi trực tuyến

Đây là một **dự án demo** lấy cảm hứng từ mô hình các nền tảng luyện thi TSA/HSA/THPT
(không phải bản sao mã nguồn của bất kỳ website nào). Dự án dùng **Node.js + Express +
PostgreSQL**, có lưu trữ dữ liệu thật, bền vững (không bị mất khi deploy lại).

## Tính năng

- Trang chủ giới thiệu, danh sách khóa học theo danh mục TSA / HSA / THPT
- Đăng ký / đăng nhập / đăng xuất (mật khẩu được hash bằng bcrypt)
- Phân quyền: học sinh (student), giáo viên (teacher), quản trị (admin)
- Đăng ký học (enroll) một khóa học
- Làm bài thi trắc nghiệm có đồng hồ đếm giờ, tự nộp bài khi hết giờ
- Chấm điểm tự động, lưu kết quả và từng câu trả lời vào database
- Xem lại chi tiết bài làm kèm giải thích đáp án
- Dashboard học sinh: khóa học đã đăng ký, lịch sử làm bài, điểm trung bình
- Dashboard giáo viên: danh sách khóa học giảng dạy, số học sinh
- Dashboard admin: thống kê tổng quan, danh sách người dùng

## Cách chạy ở máy local (VS Code)

Cần có PostgreSQL chạy ở máy bạn (hoặc dùng database miễn phí trên Render/Supabase, xem mục Deploy dưới đây).

1. Mở thư mục này trong VS Code.
2. Tạo file `.env` với nội dung:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/examstudy
   SESSION_SECRET=mot-chuoi-bi-mat-cua-ban
   PORT=3000
   ```
3. Mở Terminal (`Ctrl + ~`) và chạy:
   ```bash
   npm install
   npm start
   ```
4. Mở trình duyệt vào: `http://localhost:3000`

Lần đầu chạy, hệ thống sẽ tự tạo các bảng và thêm dữ liệu mẫu (khóa học, đề thi, câu hỏi,
tài khoản demo).

## Cách deploy lên Render.com (miễn phí)

1. Tạo **PostgreSQL database** miễn phí trên Render: Dashboard → **New** → **PostgreSQL** →
   đặt tên, chọn Free → **Create Database**. Sau khi tạo xong, copy giá trị **Internal
   Database URL**.
2. Tạo **Web Service**: Dashboard → **New** → **Web Service** → chọn repo này.
   - Language: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Vào tab **Environment**, thêm 2 biến:
   - `DATABASE_URL` = giá trị Internal Database URL vừa copy ở bước 1
   - `SESSION_SECRET` = một chuỗi bất kỳ
4. Bấm **Deploy**. Web sẽ có link dạng `https://ten-app.onrender.com`.

Vì dữ liệu lưu trên PostgreSQL (không phải file trên đĩa), tài khoản và dữ liệu **sẽ
không bị mất** khi bạn deploy lại hoặc khi Render tự khởi động lại service.

## Tài khoản demo có sẵn

| Vai trò   | Email              | Mật khẩu     |
|-----------|---------------------|--------------|
| Học sinh  | student@demo.com    | student123   |
| Giáo viên | teacher@demo.com    | teacher123   |
| Admin     | admin@demo.com      | admin123     |

## Cấu trúc thư mục

```
examstudy/
├── server.js              # điểm khởi động chính
├── db/
│   └── database.js        # kết nối PostgreSQL, khởi tạo schema + seed dữ liệu mẫu
├── middleware/
│   └── auth.js             # kiểm tra đăng nhập / phân quyền
├── routes/
│   ├── auth.js              # đăng ký / đăng nhập / đăng xuất
│   ├── courses.js           # khóa học
│   ├── exams.js              # làm bài thi, nộp bài, kết quả
│   └── dashboard.js          # dashboard học sinh/giáo viên/admin
├── views/                   # template EJS (HTML)
└── public/css/style.css     # toàn bộ giao diện
```

## Lưu ý quan trọng

Đây là bản demo phục vụ mục đích học tập/tham khảo cách xây dựng một nền tảng luyện
thi trực tuyến hoàn chỉnh (auth, database, làm bài thi, chấm điểm). Đây **không phải**
là bản sao nội dung, thiết kế hay mã nguồn của hethonglab.com hay bất kỳ nền tảng nào
khác — nội dung câu hỏi, khóa học trong demo này là mẫu tự tạo.
