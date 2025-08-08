"use client";

import React from "react";
import { Box, Paper, Typography, Avatar } from "@mui/material";
import { Person, SmartToy } from "@mui/icons-material";
import { ToolCall } from "@/lib/actions";

export interface ChatMessageProps {
  message: string;
  sender: "user" | "assistant";
  timestamp?: Date;
  tool_calls?: ToolCall[];
}

export default function ChatMessage({
  message,
  sender,
  timestamp,
  tool_calls,
}: ChatMessageProps) {
  const isUser = sender === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 2,
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      {!isUser && (
        <Avatar
          sx={{
            bgcolor: "primary.main",
            width: 32,
            height: 32,
          }}
        >
          <SmartToy fontSize="small" />
        </Avatar>
      )}

      <Paper
        elevation={1}
        sx={{
          px: 2,
          py: 1.5,
          maxWidth: "70%",
          bgcolor: isUser ? "primary.main" : "background.paper",
          color: isUser ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          borderTopLeftRadius: !isUser ? 0.5 : 2,
          borderTopRightRadius: isUser ? 0.5 : 2,
        }}
      >
        <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
          {message}
        </Typography>

        {/* Display tool calls and results if present */}
        {tool_calls && tool_calls.length > 0 && (
          <Box sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}
            >
              Tool Calls:
            </Typography>
            {tool_calls.map((toolCall, index) => {
              let args: unknown = {};
              try {
                args = JSON.parse(toolCall.function?.arguments || "{}");
              } catch {}
              return (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    <strong>{toolCall.function?.name}</strong>
                    {toolCall.status ? ` (${toolCall.status})` : ""}
                    {toolCall.durationMs ? ` ${toolCall.durationMs}ms` : ""}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      opacity: 0.8,
                    }}
                  >
                    args: {JSON.stringify(args, null, 2)}
                  </Typography>
                  {"result" in toolCall && toolCall.result !== undefined && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        opacity: 0.9,
                      }}
                    >
                      result:{" "}
                      {JSON.stringify((toolCall).result, null, 2)}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {timestamp && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              opacity: 0.7,
              fontSize: "0.75rem",
            }}
          >
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        )}
      </Paper>

      {isUser && (
        <Avatar
          sx={{
            bgcolor: "secondary.main",
            width: 32,
            height: 32,
          }}
        >
          <Person fontSize="small" />
        </Avatar>
      )}
    </Box>
  );
}
