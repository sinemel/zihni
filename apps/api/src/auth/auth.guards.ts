import {
  Injectable,
  ExecutionContext,
  CanActivate,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}

// Kullanım: @Roles("ADMIN", "SUPER_ADMIN")  @UseGuards(JwtAuthGuard, RolesGuard)

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  // @CurrentUser("id") gibi alan adı verilirse yalnızca o alanı döndür (program/sessions/content denetleyicileri buna dayanır)
  return data ? request.user?.[data] : request.user;
});
