export class InstagramWebhookEntry {
  id!: string;
  time!: number;
  changes!: InstagramWebhookChange[];
}

export class InstagramWebhookChange {
  field!: string;
  value!: {
    media_id?: string;
    comment_id?: string;
    text?: string;
    from?: { id: string; username: string };
    id?: string;
  };
}

export class InstagramWebhookPayload {
  object!: string;
  entry!: InstagramWebhookEntry[];
}
