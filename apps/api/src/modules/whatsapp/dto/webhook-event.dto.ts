export class WebhookEntry {
  id!: string;
  changes!: WebhookChange[];
}

export class WebhookChange {
  field!: string;
  value!: WebhookValue;
}

export class WebhookValue {
  messaging_product!: string;
  metadata!: { phone_number_id: string; display_phone_number: string };
  contacts?: { wa_id: string; profile: { name: string } }[];
  messages?: WebhookMessage[];
}

export class WebhookMessage {
  from!: string;
  id!: string;
  timestamp!: string;
  type!: 'text';
  text?: { body: string };
}

export class WebhookPayload {
  object!: string;
  entry!: WebhookEntry[];
}
