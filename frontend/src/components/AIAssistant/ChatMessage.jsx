import React, { useMemo } from 'react';
import styled from 'styled-components';
import AdvisorySection from './AdvisorySection';

const MessageRow = styled.div`
  display: flex;
  justify-content: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $role, theme }) =>
    $role === 'user' ? theme.colors.secondary : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: #fff;
  font-weight: 600;
  order: ${({ $role }) => ($role === 'user' ? 1 : 0)};
`;

const Bubble = styled.div`
  max-width: 85%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ $role, theme }) =>
    $role === 'user' ? theme.colors.primary : theme.colors.surface};
  color: ${({ $role, theme }) =>
    $role === 'user' ? '#FFFFFF' : theme.colors.text};
  border: ${({ $role, theme }) =>
    $role === 'ai' ? `1px solid ${theme.colors.border}` : 'none'};
  border-top-right-radius: ${({ $role, theme }) =>
    $role === 'user' ? theme.borderRadius.sm : theme.borderRadius.lg};
  border-top-left-radius: ${({ $role, theme }) =>
    $role === 'ai' ? theme.borderRadius.sm : theme.borderRadius.lg};
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

const Content = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;

  strong {
    font-weight: 600;
  }

  ul, ol {
    margin: ${({ theme }) => theme.spacing.xs} 0;
    padding-left: ${({ theme }) => theme.spacing.md};
  }

  li {
    margin-bottom: 2px;
  }

  p {
    margin: 0 0 ${({ theme }) => theme.spacing.xs};

    &:last-child {
      margin-bottom: 0;
    }
  }

  code {
    background: rgba(0, 0, 0, 0.08);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-family: 'Courier New', monospace;
  }
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
  padding-top: ${({ theme }) => theme.spacing.xs};
  border-top: 1px solid ${({ theme }) => `${theme.colors.border}44`};
`;

const ExecutionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}14`};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-weight: 500;
  white-space: nowrap;
`;

const SourceTag = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surfaceHover};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  white-space: nowrap;
`;

const Timestamp = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
  display: block;
  text-align: ${({ $role }) => ($role === 'user' ? 'right' : 'left')};
`;

/**
 * Formats a timestamp into a relative time string.
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const now = Date.now();
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

/**
 * Parses simple markdown-like formatting into React elements.
 * Supports: **bold**, *italic*, `code`, bullet lists, numbered lists, paragraphs.
 */
function parseMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = null;
  let currentListType = null;
  let listKey = 0;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      const Tag = currentListType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag key={`list-${listKey++}`}>
          {currentList.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </Tag>
      );
      currentList = null;
      currentListType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentList = [];
        currentListType = 'ul';
      }
      currentList.push(ulMatch[1]);
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentList = [];
        currentListType = 'ol';
      }
      currentList.push(olMatch[1]);
      continue;
    }

    // Not a list item - flush any pending list
    flushList();

    if (trimmed === '') {
      continue;
    }

    elements.push(<p key={`p-${i}`}>{formatInline(trimmed)}</p>);
  }

  flushList();
  return elements;
}

/**
 * Formats inline markdown: **bold**, *italic*, `code`.
 */
function formatInline(text) {
  if (!text) return text;

  const parts = [];
  // Regex to match **bold**, *italic*, or `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(<code key={match.index}>{match[4]}</code>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const ChatMessage = ({ message }) => {
  const { id, role, content, timestamp, executionPath, sources, recommendations } = message;

  const formattedContent = useMemo(() => {
    if (role === 'ai') {
      return parseMarkdown(content);
    }
    return content;
  }, [content, role]);

  const relativeTime = useMemo(() => formatRelativeTime(timestamp), [timestamp]);

  const hasMeta = role === 'ai' && (executionPath || (sources && sources.length > 0));

  return (
    <MessageRow $role={role}>
      <Avatar $role={role}>{role === 'user' ? 'U' : 'AI'}</Avatar>
      <div>
        <Bubble $role={role} data-testid={`message-bubble-${role}`}>
          <Content>{formattedContent}</Content>
          {hasMeta && (
            <MetaRow>
              {executionPath && (
                <ExecutionBadge title="Execution path">
                  {executionPath}
                </ExecutionBadge>
              )}
              {sources &&
                sources.map((source, idx) => (
                  <SourceTag key={idx} title={`Source: ${source}`}>
                    {source}
                  </SourceTag>
                ))}
            </MetaRow>
          )}
        </Bubble>
        {role === 'ai' && recommendations && recommendations.length > 0 && (
          <AdvisorySection recommendations={recommendations} />
        )}
        {relativeTime && <Timestamp $role={role}>{relativeTime}</Timestamp>}
      </div>
    </MessageRow>
  );
};

export default ChatMessage;
