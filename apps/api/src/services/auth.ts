import bcrypt from 'bcryptjs';
import { db } from '@secretaria/db';
import { clinics, users, clinicSettings } from '@secretaria/db';
import { eq } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import { signToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import type { RegisterInput, LoginInput } from '../validators/auth.js';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function register(input: RegisterInput) {
  // Check if email already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    throw new AppError('EMAIL_EXISTS', 'Este email ja esta cadastrado', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = slugify(input.clinicName) + '-' + Date.now().toString(36);

  // Transaction: create clinic + settings + user
  const result = await db.transaction(async (tx) => {
    const [clinic] = await tx.insert(clinics).values({
      name: input.clinicName,
      slug,
      segment: input.segment,
      phone: input.phone,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
    }).returning();

    await tx.insert(clinicSettings).values({
      clinicId: clinic.id,
    });

    const [user] = await tx.insert(users).values({
      clinicId: clinic.id,
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: 'owner',
    }).returning();

    return { clinic, user };
  });

  const token = signToken({
    userId: result.user.id,
    clinicId: result.clinic.id,
    email: result.user.email,
    role: result.user.role,
  });

  const refreshToken = signRefreshToken({
    userId: result.user.id,
    clinicId: result.clinic.id,
  });

  return {
    token,
    refreshToken,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
    clinic: { id: result.clinic.id, name: result.clinic.name, slug: result.clinic.slug, segment: result.clinic.segment, plan: result.clinic.plan },
  };
}

export async function login(input: LoginInput) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user || !user.isActive) {
    throw new AppError('AUTH_INVALID', 'Email ou senha incorretos', 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('AUTH_INVALID', 'Email ou senha incorretos', 401);
  }

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, user.clinicId)).limit(1);

  const token = signToken({
    userId: user.id,
    clinicId: user.clinicId,
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    clinicId: user.clinicId,
  });

  return {
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    clinic: clinic ? { id: clinic.id, name: clinic.name, slug: clinic.slug, segment: clinic.segment, plan: clinic.plan } : null,
  };
}

// Gera novo par de tokens a partir de um refresh token valido
export async function refreshAccessToken(refreshTokenValue: string) {
  const payload = verifyRefreshToken(refreshTokenValue);

  // Buscar dados atualizados do usuario no banco
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw new AppError('AUTH_INVALID', 'Usuario inativo ou nao encontrado', 401);
  }

  const token = signToken({
    userId: user.id,
    clinicId: user.clinicId,
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    clinicId: user.clinicId,
  });

  return { token, refreshToken };
}

export async function getMe(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError('USER_NOT_FOUND', 'Usuario nao encontrado', 404);

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, user.clinicId)).limit(1);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    clinic: clinic ? { id: clinic.id, name: clinic.name, slug: clinic.slug, segment: clinic.segment, plan: clinic.plan, phone: clinic.phone, address: clinic.address } : null,
  };
}
