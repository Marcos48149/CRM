import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantPlan } from '@autoclaw/shared';
import { PLAN_KEY } from '../decorators/require-plan.decorator';
import { TENANT_REPOSITORY, TenantRepository } from '../../modules/tenants/tenants.service';

const PLAN_ORDER: Record<string, number> = {
  [TenantPlan.STARTER]: 0,
  [TenantPlan.PRO]: 1,
  [TenantPlan.ENTERPRISE]: 2,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new ForbiddenException('Tenant no encontrado');
    }

    const userLevel = PLAN_ORDER[tenant.plan] ?? -1;
    const requiredLevel = PLAN_ORDER[requiredPlan] ?? -1;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Se requiere plan ${requiredPlan}. Tu plan actual es ${tenant.plan}. Actualizalo en autoclaw.app`,
      );
    }

    return true;
  }
}
