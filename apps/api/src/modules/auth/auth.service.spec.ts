import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('crea usuario y tenant correctamente', async () => {
      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Mi Negocio',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('OWNER');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      await service.register({
        name: 'User 1',
        email: 'dup@example.com',
        password: 'password123',
        tenantName: 'Tenant 1',
      });

      await expect(
        service.register({
          name: 'User 2',
          email: 'dup@example.com',
          password: 'password123',
          tenantName: 'Tenant 2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('retorna tokens con credenciales válidas', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.register({
        name: 'Test',
        email: 'login@example.com',
        password: 'password123',
        tenantName: 'Tenant',
      });

      const result = await service.login({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('lanza UnauthorizedException con credenciales inválidas', async () => {
      await expect(
        service.login({
          email: 'no-existe@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('retorna nuevos tokens con refreshToken válido', async () => {
      const reg = await service.register({
        name: 'Test',
        email: 'refresh@example.com',
        password: 'password123',
        tenantName: 'Tenant',
      });

      const result = await service.refresh(reg.refreshToken);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('lanza UnauthorizedException con refreshToken inexistente', async () => {
      await expect(
        service.refresh('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('retorna datos del usuario autenticado', async () => {
      const reg = await service.register({
        name: 'Test',
        email: 'me@example.com',
        password: 'password123',
        tenantName: 'Tenant',
      });

      const result = await service.me(reg.user.id);
      expect(result.user.email).toBe('me@example.com');
      expect(result.tenant).toBeDefined();
    });
  });
});
