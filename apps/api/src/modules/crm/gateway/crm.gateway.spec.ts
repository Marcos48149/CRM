import { Test, TestingModule } from '@nestjs/testing';
import { CrmGateway } from './crm.gateway';
import { UnauthorizedException } from '@nestjs/common';

describe('CrmGateway', () => {
  let gateway: CrmGateway;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      query: { token: 'valid-jwt-token' },
    },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    data: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrmGateway],
    }).compile();

    gateway = module.get<CrmGateway>(CrmGateway);
    gateway['server'] = mockServer as any;
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('rejects connection without a token', () => {
      const socketNoToken = {
        ...mockSocket,
        handshake: { query: {} },
      };

      gateway.handleConnection(socketNoToken as any);

      expect(socketNoToken.emit).toHaveBeenCalledWith('error', expect.any(Object));
      expect(socketNoToken.disconnect).toHaveBeenCalled();
    });

    it('accepts connection with a valid token', () => {
      gateway.handleConnection(mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalled();
    });
  });

  describe('emitConversationUpdated', () => {
    it('emits conversation.updated event to tenant room', () => {
      const data = { id: 'conv-1', status: 'human_takeover' };

      gateway.emitConversationUpdated('tenant-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockServer.emit).toHaveBeenCalledWith('conversation.updated', data);
    });
  });

  describe('emitMessageNew', () => {
    it('emits message.new event to tenant room', () => {
      const data = { id: 'msg-1', content: 'Hello' };

      gateway.emitMessageNew('tenant-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockServer.emit).toHaveBeenCalledWith('message.new', data);
    });
  });

  describe('emitHandoffRequested', () => {
    it('emits handoff.requested event when a conversation is escalated', () => {
      const data = { conversationId: 'conv-1', contactId: 'contact-1' };

      gateway.emitHandoffRequested('tenant-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockServer.emit).toHaveBeenCalledWith('handoff.requested', data);
    });
  });

  describe('emitHandoffTaken', () => {
    it('emits handoff.taken event when an agent takes over', () => {
      const data = { conversationId: 'conv-1', agentId: 'agent-1' };

      gateway.emitHandoffTaken('tenant-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockServer.emit).toHaveBeenCalledWith('handoff.taken', data);
    });
  });

  describe('handleTyping', () => {
    it('broadcasts agent.typing to the correct conversation room', () => {
      const payload = { conversationId: 'conv-1', agentName: 'Alice' };

      gateway.handleTyping(mockSocket as any, payload);

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(mockServer.emit).toHaveBeenCalledWith('agent.typing', {
        agentName: 'Alice',
        conversationId: 'conv-1',
      });
    });
  });

  describe('handleJoinConversation', () => {
    it('joins the socket to a conversation room', () => {
      gateway.handleJoinConversation(mockSocket as any, { conversationId: 'conv-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-1');
    });
  });
});
