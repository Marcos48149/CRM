import { Injectable, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Injectable()
export class JwtGuard extends JwtAuthGuard {
  constructor(@Inject(Reflector) reflector: Reflector) {
    super(reflector);
  }
}
