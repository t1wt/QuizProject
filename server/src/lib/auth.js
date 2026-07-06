import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'project_quiz_local_secret';

export function signAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    jwtSecret,
    {
      expiresIn: '7d',
    },
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Сессия истекла, войдите снова' });
  }
}
