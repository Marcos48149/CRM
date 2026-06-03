import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import Docker from 'dockerode';
import { TENANT_REPOSITORY } from '../tenants/tenants.service';
import type { TenantRepository } from '../tenants/tenants.service';

@Injectable()
export class ProvisionerService implements OnModuleInit {
  private readonly logger = new Logger(ProvisionerService.name);
  private readonly docker: Docker;
  private templatesDir!: string;

  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    private readonly configService: ConfigService,
  ) {
    this.docker = new Docker({
      socketPath: this.configService.get<string>('DOCKER_SOCKET', '/var/run/docker.sock'),
    });
  }

  async onModuleInit() {
    const candidates = [
      path.join(__dirname, 'openclaw-template'),
      path.resolve(process.cwd(), 'src', 'modules', 'provisioner', 'openclaw-template'),
      path.resolve(process.cwd(), 'dist', 'modules', 'provisioner', 'openclaw-template'),
    ];

    for (const dir of candidates) {
      try {
        await fs.access(dir);
        this.templatesDir = dir;
        return;
      } catch {
        continue;
      }
    }

    this.templatesDir = candidates[0];
    this.logger.warn(`Could not find templates directory, using ${this.templatesDir}`);
  }

  async createContainer(tenantId: string, tenantSlug: string): Promise<void> {
    const dataDir = this.configService.get<string>(
      'TENANTS_DATA_DIR',
      '/opt/autoclaw/tenants',
    );
    const tenantDir = path.join(dataDir, tenantSlug);
    const image = this.configService.get<string>(
      'OPENCLAW_IMAGE',
      'openclaw/openclaw:latest',
    );
    const containerName = `openclaw-${tenantSlug}`;

    try {
      await fs.mkdir(tenantDir, { recursive: true });

      await Promise.all([
        this.copyTemplate('SOUL.md', tenantDir),
        this.copyTemplate('AGENTS.md', tenantDir),
        this.copyTemplate('TOOLS.md', tenantDir),
      ]);

      const container = await this.docker.createContainer({
        name: containerName,
        Image: image,
        Env: [
          `TENANT_ID=${tenantId}`,
          `TENANT_SLUG=${tenantSlug}`,
        ],
        HostConfig: {
          Binds: [`${tenantDir}:/workspace`],
        },
      });

      await container.start();

      await this.tenantRepository.update(tenantId, { containerName });

      this.logger.log(`Container ${containerName} created for tenant ${tenantSlug}`);
    } catch (error) {
      this.logger.error(
        `Failed to create container for tenant ${tenantSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.tenantRepository.update(tenantId, { containerName: undefined });
      throw error;
    }
  }

  async stopContainer(tenantId: string): Promise<void> {
    const container = await this.getContainer(tenantId);
    if (!container) return;

    try {
      await container.stop();
      this.logger.log(`Container stopped for tenant ${tenantId}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already stopped')) {
        return;
      }
      throw error;
    }
  }

  async startContainer(tenantId: string): Promise<void> {
    const container = await this.getContainer(tenantId);
    if (!container) return;

    try {
      await container.start();
      this.logger.log(`Container started for tenant ${tenantId}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already started')) {
        return;
      }
      throw error;
    }
  }

  async removeContainer(tenantId: string): Promise<void> {
    const dataDir = this.configService.get<string>(
      'TENANTS_DATA_DIR',
      '/opt/autoclaw/tenants',
    );
    const container = await this.getContainer(tenantId);
    if (container) {
      try {
        await container.remove({ force: true });
      } catch {
        // ignore if already removed
      }
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (tenant) {
      const tenantDir = path.join(dataDir, tenant.slug);
      try {
        await fs.rm(tenantDir, { recursive: true, force: true });
      } catch {
        // ignore if directory doesn't exist
      }
    }

    await this.tenantRepository.update(tenantId, { containerName: undefined });

    this.logger.log(`Container removed for tenant ${tenantId}`);
  }

  async getContainerStatus(
    tenantId: string,
  ): Promise<'running' | 'stopped' | 'not_found'> {
    const container = await this.getContainer(tenantId);
    if (!container) return 'not_found';

    try {
      const info = await container.inspect();
      if (info.State.Running) return 'running';
      return 'stopped';
    } catch {
      return 'not_found';
    }
  }

  private async getContainer(
    tenantId: string,
  ): Promise<Docker.Container | null> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant?.containerName) return null;

    try {
      return this.docker.getContainer(tenant.containerName);
    } catch {
      return null;
    }
  }

  private async copyTemplate(fileName: string, destDir: string): Promise<void> {
    const sourcePath = path.join(this.templatesDir, fileName);
    const destPath = path.join(destDir, fileName);

    try {
      await fs.copyFile(sourcePath, destPath);
    } catch (error) {
      this.logger.warn(
        `Could not copy template ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
