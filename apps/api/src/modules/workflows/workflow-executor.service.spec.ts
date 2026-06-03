import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowExecutorService } from './workflow-executor.service';

describe('WorkflowExecutorService', () => {
  let service: WorkflowExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowExecutorService],
    }).compile();

    service = module.get<WorkflowExecutorService>(WorkflowExecutorService);
  });

  describe('evaluateConditions', () => {
    it('retorna true si no hay condiciones', () => {
      const result = service.evaluateConditions([], { message: { text: 'hola' } });
      expect(result).toBe(true);
    });

    it('operator contains: retorna true si el campo contiene el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'contains', value: 'pedido' }],
        { message: { text: 'Quiero saber el estado de mi pedido' } },
      );
      expect(result).toBe(true);
    });

    it('operator contains: retorna false si el campo no contiene el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'contains', value: 'reclamo' }],
        { message: { text: 'Quiero saber el estado de mi pedido' } },
      );
      expect(result).toBe(false);
    });

    it('operator equals: retorna true si el campo es exactamente el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'equals', value: 'hola' }],
        { message: { text: 'hola' } },
      );
      expect(result).toBe(true);
    });

    it('operator equals: retorna false si el campo no es exactamente el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'equals', value: 'hola' }],
        { message: { text: 'hola mundo' } },
      );
      expect(result).toBe(false);
    });

    it('operator startsWith: retorna true si el campo empieza con el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'startsWith', value: 'hola' }],
        { message: { text: 'hola mundo' } },
      );
      expect(result).toBe(true);
    });

    it('operator startsWith: retorna false si el campo no empieza con el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'startsWith', value: 'adiós' }],
        { message: { text: 'hola mundo' } },
      );
      expect(result).toBe(false);
    });

    it('operator endsWith: retorna true si el campo termina con el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'endsWith', value: 'mundo' }],
        { message: { text: 'hola mundo' } },
      );
      expect(result).toBe(true);
    });

    it('operator endsWith: retorna false si el campo no termina con el valor', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.text', operator: 'endsWith', value: 'amigo' }],
        { message: { text: 'hola mundo' } },
      );
      expect(result).toBe(false);
    });

    it('retorna false si el campo no existe en los datos del evento', () => {
      const result = service.evaluateConditions(
        [{ field: 'message.nonexistent', operator: 'contains', value: 'test' }],
        { message: { text: 'hola' } },
      );
      expect(result).toBe(false);
    });

    it('todas las condiciones deben matchear (AND)', () => {
      const result = service.evaluateConditions(
        [
          { field: 'message.text', operator: 'contains', value: 'pedido' },
          { field: 'message.from', operator: 'equals', value: '123' },
        ],
        { message: { text: 'mi pedido', from: '123' } },
      );
      expect(result).toBe(true);
    });

    it('retorna false si alguna condición no matchea (AND)', () => {
      const result = service.evaluateConditions(
        [
          { field: 'message.text', operator: 'contains', value: 'pedido' },
          { field: 'message.from', operator: 'equals', value: '999' },
        ],
        { message: { text: 'mi pedido', from: '123' } },
      );
      expect(result).toBe(false);
    });
  });

  describe('executeWorkflow', () => {
    it('ejecuta correctamente con condición que matchea', async () => {
      const workflow = {
        id: 'wf-1',
        conditions: [{ field: 'message.text', operator: 'contains' as const, value: 'pedido' }],
        actions: [
          { type: 'QUERY_OPENCLAW' as const, prompt: 'El usuario pregunta: {{message.text}}' },
        ],
      };

      const sendReply = jest.fn();

      const result = await service.executeWorkflow(
        workflow,
        { type: 'WHATSAPP_MESSAGE', data: { message: { text: 'mi pedido' } } },
        sendReply,
      );

      expect(result.matched).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].success).toBe(false);
      expect(result.steps[0].actionType).toBe('QUERY_OPENCLAW');
    });

    it('no ejecuta si condición no matchea', async () => {
      const workflow = {
        id: 'wf-1',
        conditions: [{ field: 'message.text', operator: 'contains' as const, value: 'reclamo' }],
        actions: [{ type: 'QUERY_OPENCLAW' as const }],
      };

      const sendReply = jest.fn();

      const result = await service.executeWorkflow(
        workflow,
        { type: 'WHATSAPP_MESSAGE', data: { message: { text: 'hola' } } },
        sendReply,
      );

      expect(result.matched).toBe(false);
      expect(result.steps).toHaveLength(0);
      expect(sendReply).not.toHaveBeenCalled();
    });

    it('ejecuta action SEND_REPLY correctamente', async () => {
      const workflow = {
        id: 'wf-1',
        conditions: [],
        actions: [
          { type: 'SEND_REPLY' as const, channel: 'whatsapp' },
        ],
      };

      const sendReply = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeWorkflow(
        workflow,
        { type: 'WHATSAPP_MESSAGE', data: { message: { text: 'hola' } } },
        sendReply,
      );

      expect(result.matched).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].success).toBe(false);
    });
  });

  describe('executeAction QUERY_OPENCLAW', () => {
    it('interpola variables del evento en el prompt', () => {
      const prompt = service['interpolateVariables'](
        'El mensaje del usuario es: {{message.text}}',
        { message: { text: 'hola mundo' } },
      );
      expect(prompt).toBe('El mensaje del usuario es: hola mundo');
    });

    it('deja la variable sin interpolar si no existe en los datos', () => {
      const prompt = service['interpolateVariables'](
        'Valor: {{message.nonexistent}}',
        { message: { text: 'hola' } },
      );
      expect(prompt).toBe('Valor: {{message.nonexistent}}');
    });
  });
});
