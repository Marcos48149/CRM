import { SetMetadata } from '@nestjs/common';
import { TenantPlan } from '@autoclaw/shared';

export const PLAN_KEY = 'required_plan';
export const RequirePlan = (plan: TenantPlan) => SetMetadata(PLAN_KEY, plan);
