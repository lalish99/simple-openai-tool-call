import { Message, ToolCall } from './actions';

const MESSAGES_KEY = 'chat_messages';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  timestamp: Date;
}

// Convert ChatMessage to Message format for OpenAI API
export function chatMessageToMessage(chatMessage: ChatMessage): Message {
  return {
    role: chatMessage.role,
    content: chatMessage.content,
    tool_calls: chatMessage.tool_calls,
  };
}

// Convert Message from OpenAI API to ChatMessage format
export function messageToChatMessage(message: Message): ChatMessage {
  return {
    role: message.role === 'system' ? 'assistant' : message.role,
    content: message.content,
    tool_calls: message.tool_calls,
    timestamp: new Date(),
  };
}

// Get all messages from localStorage
export function getMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(MESSAGES_KEY);
    if (!stored) return [];

    const messages = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return messages.map((msg: ChatMessage) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
    return [];
  }
}

// Save all messages to localStorage
export function saveMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
}

// Add a new message to localStorage
export function addMessage(message: ChatMessage): ChatMessage[] {
  const messages = getMessages();
  const updatedMessages = [...messages, message];
  saveMessages(updatedMessages);
  return updatedMessages;
}

// Add a user message and return updated messages array
export function addUserMessage(content: string): ChatMessage[] {
  const userMessage: ChatMessage = {
    role: 'user',
    content,
    timestamp: new Date(),
  };
  return addMessage(userMessage);
}

// Add an assistant message and return updated messages array
export function addAssistantMessage(content: string, tool_calls?: ToolCall[]): ChatMessage[] {
  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content,
    tool_calls,
    timestamp: new Date(),
  };
  return addMessage(assistantMessage);
}

// Clear all messages from localStorage
export function clearMessages(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(MESSAGES_KEY);
  } catch (error) {
    console.error('Error clearing messages from localStorage:', error);
  }
}

// Get messages in OpenAI API format (excluding system messages)
export function getMessagesForAPI(): Message[] {
  const chatMessages = getMessages();
  return chatMessages.map(chatMessageToMessage);
}
