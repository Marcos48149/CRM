import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  tenantId: string;
  createdAt: Date;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: Date;
}

interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();

  constructor(private jwtService: JwtService) {}

  async register(dto: { name: string; email: string; password: string; tenantName: string }) {
    const emailLower = dto.email.toLowerCase();

    for (const user of this.users.values()) {
      if (user.email === emailLower) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    const slug = dto.tenantName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const tenant: Tenant = {
      id: crypto.randomUUID(),
      name: dto.tenantName,
      slug,
      plan: 'STARTER',
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user: User = {
      id: crypto.randomUUID(),
      email: emailLower,
      password: hashedPassword,
      name: dto.name,
      role: 'OWNER',
      tenantId: tenant.id,
      createdAt: new Date(),
    };

    this.tenants.set(tenant.id, tenant);
    this.users.set(user.id, user);

    return this.generateAuthResult(user);
  }

  async login(dto: { email: string; password: string }) {
    const emailLower = dto.email.toLowerCase();

    let foundUser: User | undefined;
    for (const user of this.users.values()) {
      if (user.email === emailLower) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, foundUser.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateAuthResult(foundUser);
  }

  async refresh(refreshToken: string) {
    const stored = this.refreshTokens.get(refreshToken);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = this.users.get(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    this.refreshTokens.delete(refreshToken);

    return this.generateAuthResult(user);
  }

  async logout(refreshToken: string) {
    this.refreshTokens.delete(refreshToken);
  }

  async me(userId: string) {
    const user = this.users.get(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const tenant = this.tenants.get(user.tenantId);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status } : null,
    };
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  private async generateAuthResult(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshTokenValue = crypto.randomUUID();
    const refreshTokenRecord: RefreshToken = {
      id: crypto.randomUUID(),
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    this.refreshTokens.set(refreshTokenValue, refreshTokenRecord);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
