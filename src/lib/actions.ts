'use server';

import { openai } from './openAi';
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

export interface ToolCall {
  id: string;
  type: 'function';
  function?: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
}

// Define the tools available to the AI agent
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_product',
      description: 'Search for a product by name in the product database',
      parameters: {
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'The name of the product to search for',
          },
        },
        required: ['product_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_user',
      description: 'Search for a user by their user ID',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The unique identifier of the user to search for',
          },
        },
        required: ['user_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_user_record',
      description: 'Update a specific field in a user record',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The unique identifier of the user to update',
          },
          field: {
            type: 'string',
            description: 'The field name to update (e.g., email, name, status)',
          },
          value: {
            type: 'string',
            description: 'The new value to set for the specified field',
          },
        },
        required: ['user_id', 'field', 'value'],
      },
    },
  },
];

const systemPrompt = `You are a query generator assistant. Your job is to analyze user messages and determine the appropriate tool to call based on their request.

IMPORTANT RULES:
1. You MUST always use one of the available tools to respond - NEVER provide free text responses
2. Analyze the user's message carefully and choose the most appropriate tool
3. Only output valid JSON function calls - no explanations or additional text
4. If the user's request doesn't clearly match a tool, use the most relevant one based on context

Available tools:
- search_product: Use when the user wants to find or look up a product
- search_user: Use when the user wants to find information about a specific user
- update_user_record: Use when the user wants to modify or update user information

Always respond with a tool call that best matches the user's intent.`;

export async function callOpenAI(messages: Message[]): Promise<{
  role: 'assistant';
  content: string | null;
  tool_calls: ToolCall[];
}> {
  try {
    // Convert our Message format to OpenAI's format
    const messagesWithSystem: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_calls && { tool_calls: msg.tool_calls as ChatCompletionMessageToolCall[] }),
      } as ChatCompletionMessageParam)),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messagesWithSystem,
      tools: tools,
      tool_choice: 'required', // Force the model to use a tool
      temperature: 0.1,
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    // Return the complete assistant message including tool calls
    return {
      role: 'assistant',
      content: assistantMessage.content || '',
      tool_calls: (assistantMessage.tool_calls || []).map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: tc.type === 'function' ? tc.function : undefined,
      })),
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to get response from AI assistant');
  }
}
