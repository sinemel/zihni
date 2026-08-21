import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";

export const PLAN_ORDER: Record<string, number> = { FREE: 0, PRO: 1, EXPERT: 2, ENTERPRISE: 3 };

export const REQUIRED_PLAN_KEY = "requiredPlan";
export const RequiresPlan = (plan: keyof typeof PLAN_ORDER) => SetMetadata(REQUIRED_PLAN_KEY, plan);

/**
 * Kullanım:
 *   @UseGuards(JwtAuthGuard, PlanGuard)
 *   @RequiresPlan("EXPERT")
 *   @Post("experts/clients") ...
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.id) return false;

    const sub = await this.prisma.subscription.findUnique({ where: { userId: user.id } });
    const effectivePlan = sub && sub.status === "ACTIVE" ? sub.plan : "FREE";

    if ((PLAN_ORDER[effectivePlan] ?? 0) < (PLAN_ORDER[required] ?? 0)) {
      throw new ForbiddenException({
        code: "PLAN_REQUIRED",
        message: `Bu özellik ${required} planı gerektirir.`,
      });
    }
    return true;
  }
}
