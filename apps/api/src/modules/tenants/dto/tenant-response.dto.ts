export class TenantResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  plan!: string;
  status!: string;
  containerName?: string;
  onboardingStep?: number;
  integrations?: { type: string; active: boolean }[];
  createdAt!: Date;
}

export class TenantStatsDto {
  totalMessages!: number;
  activeWorkflows!: number;
  integrations!: string[];
  containerStatus!: 'running' | 'stopped' | 'not_found';
}
