import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Marca una ruta como pública (sin token). */
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restringe una ruta a ciertos roles. */
export const ROLES = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES, roles);

export interface AuthUser {
  sub: number;
  username: string;
  role: string;
}

/** Inyecta el usuario autenticado en el handler. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
