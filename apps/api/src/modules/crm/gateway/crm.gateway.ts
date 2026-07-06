import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';

const WS_NAMESPACE = '/ws/crm';

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: '*', credentials: true },
})
export class CrmGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(CrmGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.logger.log(`WebSocket gateway initialized on ${WS_NAMESPACE}`);
  }

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string | undefined;

    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    // JWT payload is decoded and attached by a middleware in production
    const tenantId = this.extractTenantFromToken(token);
    if (!tenantId) {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
      return;
    }

    (client as any).data.tenantId = tenantId;
    client.join(`tenant:${tenantId}`);
    this.logger.log(`Client ${client.id} connected to tenant ${tenantId}`);
  }

  // ── Server → Client events ────────────────────────────────────────

  emitConversationUpdated(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('conversation.updated', data);
  }

  emitMessageNew(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('message.new', data);
  }

  emitHandoffRequested(tenantId: string, data: { conversationId: string; contactId: string }) {
    this.server.to(`tenant:${tenantId}`).emit('handoff.requested', data);
  }

  emitHandoffTaken(tenantId: string, data: { conversationId: string; agentId: string }) {
    this.server.to(`tenant:${tenantId}`).emit('handoff.taken', data);
  }

  // ── Client → Server events ────────────────────────────────────────

  @SubscribeMessage('agent.typing')
  handleTyping(client: Socket, payload: { conversationId: string; agentName: string }) {
    this.server.to(`conversation:${payload.conversationId}`).emit('agent.typing', {
      agentName: payload.agentName,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage('handoff.taken')
  handleHandoffTaken(client: Socket, payload: { conversationId: string; agentId: string }) {
    this.server.to(`tenant:${(client as any).data.tenantId}`).emit('handoff.taken', {
      conversationId: payload.conversationId,
      agentId: payload.agentId,
    });
  }

  @SubscribeMessage('join.conversation')
  handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    client.join(`conversation:${payload.conversationId}`);
  }

  private extractTenantFromToken(_token: string): string | null {
    // In production, verify JWT and extract tenantId from payload
    // For now, accept any non-empty token for development
    return _token ? 'default-tenant' : null;
  }
}
