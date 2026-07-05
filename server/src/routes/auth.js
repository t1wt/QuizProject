import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, signAuthToken } from '../lib/auth.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя'),
  email: z.string().trim().email('Введите корректный email').toLowerCase(),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов'),
  role: z.enum(['organizer', 'participant']),
});

const loginSchema = z.object({
  email: z.string().trim().email('Введите корректный email').toLowerCase(),
  password: z.string().min(1, 'Введите пароль'),
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function sendZodError(res, error) {
  const issue = error.issues?.[0];
  return res.status(400).json({
    message: issue?.message || 'Проверьте данные формы',
  });
}

export function createAuthRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const existingUser = db
      .prepare('select id from users where email = ?')
      .get(parsed.data.email);

    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким email уже есть' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const result = db
      .prepare(
        `insert into users (name, email, password_hash, role)
         values (?, ?, ?, ?)`,
      )
      .run(parsed.data.name, parsed.data.email, passwordHash, parsed.data.role);

    const user = db
      .prepare('select id, name, email, role from users where id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      token: signAuthToken(user),
      user: publicUser(user),
    });
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const user = db
      .prepare('select id, name, email, password_hash, role from users where email = ?')
      .get(parsed.data.email);

    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    return res.json({
      token: signAuthToken(user),
      user: publicUser(user),
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db
      .prepare('select id, name, email, role from users where id = ?')
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.json({ user: publicUser(user) });
  });

  return router;
}
