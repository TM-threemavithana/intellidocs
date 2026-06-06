import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile
   * GET /users/me
   */
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * Update current user profile
   * PUT /users/me
   */
  @Put('me')
  async updateMe(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  /**
   * Change password
   * PUT /users/me/password
   */
  @Put('me/password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Delete own account
   * DELETE /users/me
   */
  @Delete('me')
  async deleteMe(@CurrentUser() user: any) {
    return this.usersService.deleteAccount(user.id);
  }

  /**
   * Get all users (admin only)
   * GET /users
   */
  @Get()
  @Roles('admin')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  /**
   * Get user by ID (admin only)
   * GET /users/:id
   */
  @Get(':id')
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  /**
   * Update user (admin only)
   * PUT /users/:id
   */
  @Put(':id')
  @Roles('admin')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  /**
   * Delete user (admin only)
   * DELETE /users/:id
   */
  @Delete(':id')
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  /**
   * Change user role (admin only)
   * PUT /users/:id/role
   */
  @Put(':id/role')
  @Roles('admin')
  async changeUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.changeUserRole(id, role);
  }
}
