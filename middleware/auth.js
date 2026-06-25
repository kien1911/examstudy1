function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        message: 'Bạn không có quyền truy cập trang này.',
        user: req.session.user || null
      });
    }
    next();
  };
}

// Gắn user (nếu có) vào mọi response để view có thể dùng (hiển thị header đăng nhập/đăng xuất)
function attachUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = { requireLogin, requireRole, attachUser };
