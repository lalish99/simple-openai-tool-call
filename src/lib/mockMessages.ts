export interface ChatMessage {
  message: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
}

export const mockMessages: ChatMessage[] = [];
