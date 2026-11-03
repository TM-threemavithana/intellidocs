import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    const authenticatedUser = super.handleRequest<TUser>(err, user, info, context, status) as TUser & { id: string };
    const request = context.switchToHttp().getRequest();
    // Compatibility for legacy controllers: identity always comes from the verified JWT.
    if (request.query) request.query.userId = authenticatedUser.id;
    if (request.body && typeof request.body === 'object') request.body.userId = authenticatedUser.id;
    return authenticatedUser as TUser;
  }
}
