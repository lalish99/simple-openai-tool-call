"use server";

import { openai } from "./openAi";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import {
  listProducts,
  listUsers,
  resetDb,
  searchProduct,
  searchUser as findUser,
  searchUsersByName,
  updateUserRecord as updateUser,
  snapshot as dbSnapshot,
} from "./mockDb";

export interface ToolCall {
  id: string;
  type: "function";
  function?: {
    name: string;
    arguments: string;
  };
  // Optional fields added at runtime to surface tool execution to the UI
  status?: "ok" | "error";
  result?: unknown;
  durationMs?: number;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
}

// Define the tools available to the AI agent
const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_product",
      description: "Search for a product by name in the product database",
      parameters: {
        type: "object",
        properties: {
          product_name: {
            type: "string",
            description: "The name of the product to search for",
          },
          product_price: {
            type: "number",
            description: "The price of the product to search for",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_user",
      description: "Search for a user by their user ID",
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            description: "The unique identifier of the user to search for",
          },
        },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_users_by_name",
      description: "Search for users whose name contains the given substring",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name or partial name to search for",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_user_record",
      description: "Update a specific field in a user record",
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            description: "The unique identifier of the user to update",
          },
          field: {
            type: "string",
            description: "The field name to update (e.g., email, name, status)",
          },
          value: {
            type: "string",
            description: "The new value to set for the specified field",
          },
        },
        required: ["user_id", "field", "value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_users",
      description: "List all users in the database",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_products",
      description: "List all products in the database",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_db",
      description: "Reset the mock database to its initial state",
      parameters: {
        type: "object",
        properties: {},
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
 - search_user: Use when the user wants to find information about a specific user
 - search_users_by_name: Use when the user wants to find users by a name or partial name
- update_user_record: Use when the user wants to modify or update user information
- list_users: Use to list all users
- list_products: Use to list all products
- reset_db: Use to reset the demo database

Always respond with a tool call that best matches the user's intent.`;

export async function callOpenAI(messages: Message[]): Promise<{
  role: "assistant";
  content: string | null;
  tool_calls: ToolCall[];
  db?: ReturnType<typeof dbSnapshot>;
}> {
  try {
    // Convert our Message format to OpenAI's format
    const messagesWithSystem: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(
        (msg) =>
          ({
            role: msg.role,
            content: msg.content,
            ...(msg.tool_calls && {
              tool_calls: msg.tool_calls as ChatCompletionMessageToolCall[],
            }),
          }) as ChatCompletionMessageParam,
      ),
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesWithSystem,
      tools: tools,
      tool_choice: "required", // Force the model to use a tool
      temperature: 0.1,
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error("No response from OpenAI");
    }

    // Execute tool calls (if any) for a concrete demo and enrich with results
    const executedToolCalls: ToolCall[] = await Promise.all(
      (assistantMessage.tool_calls || []).map(async (tc) => {
        const start = Date.now();
        let status: "ok" | "error" = "ok";
        let result: unknown = null;
        try {
          if (tc.type === "function") {
            const name = tc.function?.name || "";
            const args = safeParse(tc.function?.arguments);
            switch (name) {
              case "search_product":
                result = searchProduct(getString(args, "product_name"));
                break;
              case "search_user":
                result = findUser(getString(args, "user_id"));
                break;
              case "search_users_by_name":
                result = searchUsersByName(getString(args, "name"));
                break;
              case "update_user_record":
                {
                  const userId = getString(args, "user_id");
                  const fieldRaw = getString(args, "field");
                  const value = getString(args, "value");
                  const field = toUpdatableField(fieldRaw);
                  if (!field) {
                    throw new Error(
                      "Unsupported field. Allowed: name, email, status",
                    );
                  }
                  result = updateUser(userId, field, value);
                }
                break;
              case "list_users":
                result = listUsers();
                break;
              case "list_products":
                result = listProducts();
                break;
              case "reset_db":
                result = resetDb();
                break;
              default:
                status = "error";
                result = { error: "Unknown tool" };
            }
          }
        } catch (e) {
          status = "error";
          const message =
            e instanceof Error ? e.message : "Tool execution error";
          result = { error: message };
        }
        const durationMs = Date.now() - start;
        return {
          id: tc.id,
          type: "function" as const,
          function: tc.type === "function" ? tc.function : undefined,
          status,
          result,
          durationMs,
        } as ToolCall;
      }),
    );

    return {
      role: "assistant",
      content: assistantMessage.content || "",
      tool_calls: executedToolCalls,
      db: dbSnapshot(),
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error("Failed to get response from AI assistant");
  }
}

function safeParse(s?: string): Record<string, unknown> {
  try {
    return s ? (JSON.parse(s) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function getString(obj: Record<string, unknown>, key: string): string {
  const value = obj?.[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

const updatableFields = ["name", "email", "status"] as const;
type UpdatableField = (typeof updatableFields)[number];
function toUpdatableField(field: string): UpdatableField | null {
  return (updatableFields as readonly string[]).includes(field)
    ? (field as UpdatableField)
    : null;
}
