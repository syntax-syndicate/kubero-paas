import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.guard';
import { OKDTO } from '../common/dto/ok.dto';
import { User, UsersService } from './users.service';
import { GetAllUsersDTO } from './dto/users.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ReadonlyGuard } from '../common/guards/readonly.guard';

@Controller({ path: 'api/users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read', 'user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized or Forbidden',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'A List of Users',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get all Users' })
  async getPipelines() {
    return this.usersService.findAll();
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'The current User',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get current User' })
  async getMe() {
    return this.usersService.findByUsername(
      (this.usersService as any).request.user.username,
    );
  }

  @Get('/username/:username')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read', 'user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'A User by username',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get User by username' })
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get('/id/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('bearerAuth')
  @Permissions('user:read', 'user:write')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'A User by ID',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get User by ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get('/count')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Count of Users',
    type: OKDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get count of Users' })
  async getUserCount() {
    return this.usersService.count();
  }

  @Put('/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReadonlyGuard)
  @Permissions('user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Update User by ID',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Update User by ID' })
  async updateUser(@Param('id') id: string, @Body() body: Partial<User>) {
    return this.usersService.update(id, body);
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReadonlyGuard)
  @Permissions('user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Delete User by ID',
    type: OKDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Delete User by ID' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Put('/:id/password/')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReadonlyGuard)
  @Permissions('user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Update User password by ID',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Update User password by ID' })
  async updateUserPassword(
    @Param('id') id: string,
    @Body() body: Partial<User>,
  ) {
    if (
      !body.password ||
      typeof body.password !== 'string' ||
      body.password.length === 0
    ) {
      throw new HttpException(
        'Invalid password provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.usersService.updatePassword(id, body.password);
  }

  @Put('/update-my-password')
  @UseGuards(JwtAuthGuard, ReadonlyGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Update current User password',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Update current User password' })
  async updateMyPassword(@Param('password') password: string) {
    const user = (this.usersService as any).request.user;
    if (!user || !user.id) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    if (
      !password ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      throw new HttpException(
        'Invalid password provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.usersService.updatePassword(user.id, password);
  }

  @Post('/')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReadonlyGuard)
  @Permissions('user:write')
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Create a new User',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Create a new User' })
  async createUser(@Body() body: User) {
    try {
      return this.usersService.create(body);
    } catch (error) {
      throw new HttpException(
        `Error creating user: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Get current User profile',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Get current User profile' })
  async getProfile(@Request() req: any) {
    const user = req.user;
    return this.usersService.findById(user.userId);
  }

  @Post('/profile/avatar')
  @UseGuards(JwtAuthGuard, ReadonlyGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth('bearerAuth')
  @ApiForbiddenResponse({
    description: 'Error: Unauthorized',
    type: OKDTO,
    isArray: false,
  })
  @ApiOkResponse({
    description: 'Update current User avatar',
    type: GetAllUsersDTO,
    isArray: false,
  })
  @ApiOperation({ summary: 'Update current User avatar' })
  async updateProfileAvatar(@Request() req: any, @UploadedFile() file: any) {
    const user = req.user;
    if (!file) {
      throw new HttpException(
        'No avatar file uploaded',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size > 102400) {
      // 100KB
      throw new HttpException(
        'Avatar image too large (max 100KB)',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.usersService.updateAvatar(user.userId, file);
  }
}
