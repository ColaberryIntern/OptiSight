import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled, { keyframes } from 'styled-components';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import ThinkingIndicator from './ThinkingIndicator';
import AlertFeed from './AlertFeed';
import SystemHealthBar from './SystemHealthBar';
import {
  addMessage,
  setProcessing,
  sendQuery,
} from '../../store/slices/aiAssistantSlice';
import { setVisualizations } from '../../store/slices/canvasSlice';

// ─── Styled Components ──────────────────────────────────────────

const AssistantContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 380px;
  background: ${({ theme }) => theme.colors.background};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    max-width: 100%;
    border-left: none;
  }
`;

const AssistantHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.success};
  font-weight: 500;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.success};
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const MessageArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  scroll-behavior: smooth;

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.colors.border} transparent`};

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 3px;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const WelcomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  text-align: center;
  animation: ${fadeIn} 0.4s ease-out;
`;

const WelcomeIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => `${theme.colors.primary}14`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const WelcomeTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

const WelcomeSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  line-height: 1.5;
`;

const StarterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
`;

const StarterButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.default};
  line-height: 1.4;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:active {
    transform: scale(0.98);
  }

  &::before {
    content: '?';
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: ${({ theme }) => theme.borderRadius.full};
    background: ${({ theme }) => `${theme.colors.primary}14`};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    flex-shrink: 0;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => `${theme.colors.error}14`};
  border: 1px solid ${({ theme }) => `${theme.colors.error}33`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

// ─── Constants ───────────────────────────────────────────────────

const STARTER_QUESTIONS = [
  'Are there similar anti-glare complaints across stores?',
  'What caused the revenue drop in Dallas?',
  'Which stores show rising inventory risk?',
  'Forecast Houston revenue for next 90 days',
  'Which stores show systemic operational risk?',
];

// ─── Helper ──────────────────────────────────────────────────────

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Component ───────────────────────────────────────────────────

const AIAssistant = () => {
  const dispatch = useDispatch();

  // Redux state - safely default if slices don't exist yet
  const messages = useSelector(
    (state) => state.aiAssistant?.messages ?? []
  );
  const suggestedQuestions = useSelector(
    (state) => state.aiAssistant?.suggestedQuestions ?? []
  );
  const isProcessing = useSelector(
    (state) => state.aiAssistant?.isProcessing ?? false
  );
  const alerts = useSelector(
    (state) => state.aiAssistant?.alerts ?? []
  );
  const reduxError = useSelector(
    (state) => state.aiAssistant?.error ?? null
  );
  const userId = useSelector(
    (state) => state.auth?.user?.id ?? state.auth?.user?.userId ?? 'anonymous'
  );

  // Local state for standalone operation (when Redux slices aren't yet registered)
  const [localMessages, setLocalMessages] = useState([]);
  const [localSuggested, setLocalSuggested] = useState([]);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Determine whether to use Redux or local state
  const hasReduxSlice = useSelector(
    (state) => state.aiAssistant !== undefined
  );

  const activeMessages = hasReduxSlice ? messages : localMessages;
  const activeSuggested = hasReduxSlice ? suggestedQuestions : localSuggested;
  const activeProcessing = hasReduxSlice ? isProcessing : localProcessing;

  // Simulated execution steps — cycle through during processing
  const EXECUTION_STEPS = [
    'Classifying intent...',
    'Planning data sources...',
    'Executing queries...',
    'Running ML models...',
    'Generating analysis...',
  ];
  const [executionSteps, setExecutionSteps] = useState([]);

  useEffect(() => {
    if (!activeProcessing) {
      setExecutionSteps([]);
      return;
    }
    let stepIndex = 0;
    setExecutionSteps([EXECUTION_STEPS[0]]);
    const timer = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < EXECUTION_STEPS.length) {
        setExecutionSteps(EXECUTION_STEPS.slice(0, stepIndex + 1));
      } else {
        clearInterval(timer);
      }
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProcessing]);

  const messageAreaRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages or processing state change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, activeProcessing]);

  /**
   * Sends a question through the orchestrator.
   * When the Redux slice is available, dispatches actions.
   * Otherwise, falls back to local state + direct service call.
   */
  const handleSend = useCallback(
    async (question) => {
      if (!question.trim()) return;

      const userMessage = {
        id: generateMessageId(),
        role: 'user',
        content: question.trim(),
        timestamp: Date.now(),
      };

      if (hasReduxSlice) {
        // Dispatch through Redux (the slice handles the async flow)
        try {
          dispatch(addMessage(userMessage));
          dispatch(sendQuery({ question: question.trim(), userId }));
        } catch (err) {
          // Redux dispatch errors should be rare; log defensively
          console.error('Redux dispatch error:', err);
        }
      } else {
        // Standalone mode — manage state locally and call the service directly
        setLocalMessages((prev) => [...prev, userMessage]);
        setLocalProcessing(true);
        setLocalError(null);

        try {
          // Dynamic import to avoid hard dependency on a file that may not exist yet
          const { queryOrchestrator } = await import(
            '../../services/orchestratorService'
          );
          const response = await queryOrchestrator(question.trim(), userId);

          const aiMessage = {
            id: generateMessageId(),
            role: 'ai',
            content: response.answer || 'No response received.',
            timestamp: Date.now(),
            executionPath: response.execution_path || null,
            sources: response.sources || [],
          };

          setLocalMessages((prev) => [...prev, aiMessage]);
          setLocalSuggested(response.follow_up_questions || []);

          // Dispatch visualizations to canvas slice if available
          if (response.visualizations && response.visualizations.length > 0) {
            try {
              dispatch(setVisualizations(response.visualizations));
            } catch {
              // Canvas slice may not be registered yet
            }
          }
        } catch (err) {
          const errorContent =
            err?.response?.data?.error ||
            err?.message ||
            'Something went wrong. Please try again.';

          const errorMessage = {
            id: generateMessageId(),
            role: 'ai',
            content: `I encountered an error: ${errorContent}`,
            timestamp: Date.now(),
            isError: true,
          };

          setLocalMessages((prev) => [...prev, errorMessage]);
          setLocalError(errorContent);
        } finally {
          setLocalProcessing(false);
        }
      }
    },
    [dispatch, hasReduxSlice, userId]
  );

  const handleAlertClick = useCallback(
    (question) => {
      handleSend(question);
    },
    [handleSend]
  );

  const showWelcome = activeMessages.length === 0 && !activeProcessing;

  return (
    <AssistantContainer data-testid="ai-assistant">
      <AssistantHeader>
        <Title>AI Assistant</Title>
        <SystemHealthBar />
      </AssistantHeader>

      {alerts.length > 0 && (
        <AlertFeed alerts={alerts} onAlertClick={handleAlertClick} />
      )}

      <MessageArea ref={messageAreaRef} data-testid="message-area">
        {showWelcome && (
          <WelcomeContainer data-testid="welcome-state">
            <WelcomeIcon>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--primary, #1A73E8)' }}
              >
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                <line x1="10" y1="22" x2="14" y2="22" />
              </svg>
            </WelcomeIcon>
            <WelcomeTitle>OptiSight Intelligence</WelcomeTitle>
            <WelcomeSubtitle>
              Ask questions about your optical retail business. I can analyze
              store performance, detect anomalies, forecast trends, and surface
              actionable insights.
            </WelcomeSubtitle>
            <StarterList>
              {STARTER_QUESTIONS.map((question, index) => (
                <StarterButton
                  key={index}
                  onClick={() => handleSend(question)}
                  data-testid={`starter-question-${index}`}
                >
                  {question}
                </StarterButton>
              ))}
            </StarterList>
          </WelcomeContainer>
        )}

        {activeMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {activeProcessing && <ThinkingIndicator executionSteps={executionSteps} />}

        {(localError || reduxError) && !activeProcessing && (
          <ErrorMessage data-testid="error-message">
            <span>{localError || reduxError || 'Failed to get a response. Try again.'}</span>
          </ErrorMessage>
        )}

        <div ref={bottomRef} />
      </MessageArea>

      <SuggestedQuestions
        questions={showWelcome ? [] : activeSuggested}
        onSelect={handleSend}
      />

      <ChatInput onSend={handleSend} disabled={activeProcessing} />
    </AssistantContainer>
  );
};

export default AIAssistant;
