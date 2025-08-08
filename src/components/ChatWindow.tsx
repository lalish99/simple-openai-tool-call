'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, LinearProgress, Button } from '@mui/material';
import ChatMessage, { ChatMessageProps } from './ChatMessage';
import ChatInput from './ChatInput';
import {
  getMessages,
  addUserMessage,
  addAssistantMessage,
  getMessagesForAPI,
  clearMessages
} from '@/lib/localStorage';
import { callOpenAI } from '@/lib/actions';

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load messages from localStorage on component mount
    const storedMessages = getMessages();
    setMessages(storedMessages.map(msg => ({
      message: msg.content,
      sender: msg.role,
      timestamp: msg.timestamp,
      tool_calls: msg.tool_calls,
    })));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    try {
      setIsTyping(true);

      // Add user message to localStorage and state
      const updatedMessages = addUserMessage(message);
      setMessages(updatedMessages.map(msg => ({
        message: msg.content,
        sender: msg.role,
        timestamp: msg.timestamp,
        tool_calls: msg.tool_calls,
      })));

      // Get conversation history for API call
      const conversationHistory = getMessagesForAPI();

      // Call OpenAI API
      const response = await callOpenAI(conversationHistory);

      // Add assistant response to localStorage and state
      const assistantMessages = addAssistantMessage(
        response.content || 'I called a tool to help with your request.',
        response.tool_calls
      );

      setMessages(assistantMessages.map(msg => ({
        message: msg.content,
        sender: msg.role,
        timestamp: msg.timestamp,
        tool_calls: msg.tool_calls,
      })));

    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessages = addAssistantMessage(
        'Sorry, I encountered an error while processing your request. Please make sure your OpenAI API key is configured correctly.'
      );

      setMessages(errorMessages.map(msg => ({
        message: msg.content,
        sender: msg.role,
        timestamp: msg.timestamp,
        tool_calls: msg.tool_calls,
      })));
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearMessages = () => {
    clearMessages();
    setMessages([]);
  };

    return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            OpenAI Tool Call Demo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI Assistant with tool calling capabilities
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleClearMessages}
          size="small"
          sx={{ minWidth: 'auto' }}
        >
          Clear Chat
        </Button>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              opacity: 0.7,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Welcome to the AI Tool Call Demo
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Try asking me to:
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Search for a product: &quot;Find product iPhone 15&quot;
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Look up a user: &quot;Search for user ID 12345&quot;
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Update user data: &quot;Update user 12345 email to new@email.com&quot;
            </Typography>
          </Box>
        )}

        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            message={msg.message}
            sender={msg.sender}
            timestamp={msg.timestamp}
            tool_calls={msg.tool_calls}
          />
        ))}

        {isTyping && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Assistant is analyzing your request and selecting the appropriate tool...
            </Typography>
            <LinearProgress sx={{ width: '300px' }} />
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </Box>
  );
}
