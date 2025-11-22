import { ModelMessage } from "ai";

export type GetMessagesParams = {
  agentId: number;
  limit?: number;
};

export type InsertMessageParams = {
  agentId: number;
  message: ModelMessage;
};

export type InsertMessagesParams = {
  agentId: number;
  messages: ModelMessage[];
};

export interface MessageStore {
  getMessages(params: GetMessagesParams): Promise<ModelMessage[]>;
  insertMessage(params: InsertMessageParams): Promise<void>;
  insertMessages(params: InsertMessagesParams): Promise<void>;
}

export class InMemoryMessageStore implements MessageStore {
  messageHistory: Record<number, ModelMessage[]> = {};

  async getMessages({ agentId, limit = 0 }: GetMessagesParams) {
    const messages = this.messageHistory[agentId] || [];
    return Promise.resolve(messages.slice(-limit));
  }

  async insertMessage({ agentId, message }: InsertMessageParams) {
    this.messageHistory[agentId] = this.messageHistory[agentId] || [];
    this.messageHistory[agentId].push(message);
    return Promise.resolve();
  }

  async insertMessages({ agentId, messages }: InsertMessagesParams) {
    this.messageHistory[agentId] = this.messageHistory[agentId] || [];
    this.messageHistory[agentId].push(...messages);
    return Promise.resolve();
  }
}
