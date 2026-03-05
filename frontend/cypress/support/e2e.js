// ***********************************************************
// This file is loaded automatically before every E2E spec.
// It imports custom commands and configures global behaviour.
// ***********************************************************

import './commands';

// Prevent Cypress from failing tests when the app throws
// uncaught exceptions (e.g. from socket.io or chart.js).
Cypress.on('uncaught:exception', (err) => {
  // Ignore WebSocket / socket.io connection errors (no backend running)
  if (
    err.message.includes('WebSocket') ||
    err.message.includes('socket') ||
    err.message.includes('io.connect')
  ) {
    return false;
  }

  // Ignore ResizeObserver errors (common with react-grid-layout)
  if (err.message.includes('ResizeObserver')) {
    return false;
  }

  // Let all other errors fail the test
  return true;
});

// Reset state between tests
beforeEach(() => {
  // Clear localStorage to avoid leaking auth state between tests
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});
