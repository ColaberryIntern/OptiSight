describe('Navigation & Routing', () => {
  describe('Unauthenticated access', () => {
    it('should redirect unauthenticated users from / to /login', () => {
      cy.visit('/');
      // The "/" route redirects to /dashboard via <Navigate />,
      // and ProtectedRoute redirects unauthenticated users to /login.
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from /dashboard to /login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from /recommendations to /login', () => {
      cy.visit('/recommendations');
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from /notifications to /login', () => {
      cy.visit('/notifications');
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from /profile to /login', () => {
      cy.visit('/profile');
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from /settings/privacy to /login', () => {
      cy.visit('/settings/privacy');
      cy.url().should('include', '/login');
    });
  });

  describe('404 Page', () => {
    it('should show the 404 page for an unknown route', () => {
      cy.visit('/this-page-does-not-exist');

      cy.contains('404').should('be.visible');
      cy.contains('Page not found').should('be.visible');
    });

    it('should have a link back to the dashboard from 404', () => {
      cy.visit('/some-nonexistent-route');

      cy.contains('Back to Dashboard').should('be.visible');
      cy.contains('Back to Dashboard').should('have.attr', 'href', '/dashboard');
    });
  });

  describe('Authenticated navigation', () => {
    beforeEach(() => {
      cy.login();
      cy.stubDashboardAPIs();

      // Stub notification endpoints used by layout components
      cy.intercept('GET', '/api/v1/notifications/*/unread-count', {
        statusCode: 200,
        body: { unreadCount: 0 },
      });
      cy.stubNotificationAPIs();
    });

    it('should navigate between pages using sidebar links', () => {
      cy.visit('/dashboard');
      cy.wait('@getPerformance');

      // The Sidebar renders <NavLink> elements with labels.
      // Navigate to Recommendations
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Recommendations').click();
      });
      cy.url().should('include', '/recommendations');

      // Navigate to Notifications
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Notifications').click();
      });
      cy.url().should('include', '/notifications');

      // Navigate to Profile
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Profile').click();
      });
      cy.url().should('include', '/profile');

      // Navigate to Settings
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Settings').click();
      });
      cy.url().should('include', '/settings/privacy');

      // Navigate back to Dashboard
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Dashboard').click();
      });
      cy.url().should('include', '/dashboard');
    });

    it('should highlight the active sidebar link', () => {
      cy.visit('/dashboard');
      cy.wait('@getPerformance');

      // React Router adds an "active" class to NavLink when matched
      cy.get('nav[aria-label="Main navigation"]')
        .find('a.active')
        .should('contain', 'Dashboard');

      // Navigate to Profile and verify active state changes
      cy.get('nav[aria-label="Main navigation"]').within(() => {
        cy.contains('Profile').click();
      });

      cy.get('nav[aria-label="Main navigation"]')
        .find('a.active')
        .should('contain', 'Profile');
    });

    it('should redirect / to /dashboard for authenticated users', () => {
      cy.visit('/');
      cy.url().should('include', '/dashboard');
    });
  });
});
