import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordReset: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-jwt-secret-key-at-least-32-characters-long',
          JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-at-least-32-characters-long',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'usr-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw ConflictException if user email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'usr-existing', email: 'test@example.com' });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Existing',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
        isActive: true,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.access_token).toBeDefined();
      expect(result.user.id).toBe('usr-1');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user record if user exists and is active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
      });

      const user = await authService.validateUser('usr-1');

      expect(user).toBeDefined();
      expect(user.id).toBe('usr-1');
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'test@example.com',
        role: 'user',
        isActive: false,
      });

      await expect(
        authService.validateUser('usr-1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
