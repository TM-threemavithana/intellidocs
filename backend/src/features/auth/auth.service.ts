import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: 'user', // Default role
      },
    });

    this.logger.log(`New user registered: ${email}`);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${email}`);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'If the email exists, a password reset link will be sent',
      };
    }

    // Generate reset token
    const resetToken = this.generateRandomToken();
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

    // Store reset token
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
      },
    });

    this.logger.log(`Password reset requested for: ${email}`);

    // Deliver the raw token through a configured email provider. Never log it.

    return {
      message: 'If the email exists, a password reset link will be sent',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find valid reset token
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: this.hashResetToken(token) },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetRecord.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    this.logger.log(`Password reset completed for user: ${resetRecord.user.email}`);

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }

  /**
   * Generate complete auth response with tokens
   */
  private generateAuthResponse(user: any): AuthResponse {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: any): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(user: any): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: '7d', // 7 days
    });
  }

  /**
   * Hash password with bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  private async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate random token for password reset
   */
  private generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET must be configured');
    return secret;
  }
}
