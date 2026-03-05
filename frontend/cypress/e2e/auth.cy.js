describe('Authentication — Login & Registration', () => {
  // -------------------------------------------------------
  // LOGIN PAGE
  // -------------------------------------------------------
  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display login form with email and password fields', () => {
      cy.contains('Sign In').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').contains('Sign In').should('be.visible');
    });

    it('should show validation errors for empty form submission', () => {
      cy.get('button[type="submit"]').click();

      // The LoginForm validates and sets formErrors on empty fields.
      // The Input component renders error text when the error prop is set.
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should redirect to dashboard on successful login', () => {
      // Intercept the login POST
      cy.intercept('POST', '/api/v1/users/login', {
        statusCode: 200,
        body: {
          token: 'fake-jwt-token.eyJ1c2VySWQiOiJ1c2VyLWUyZS0wMDEiLCJlbWFpbCI6ImFkbWluQG9wdGlzaWdodC5pbyIsInJvbGUiOiJhZG1pbiJ9.sig',
          user: {
            user_id: 'user-e2e-001',
            email: 'admin@optisight.io',
            role: 'admin',
          },
        },
      }).as('loginRequest');

      // Stub the profile endpoint so restoreSession succeeds on the
      // page that loads after navigation
      cy.intercept('GET', '/api/v1/users/*', {
        statusCode: 200,
        body: {
          user_id: 'user-e2e-001',
          email: 'admin@optisight.io',
          role: 'admin',
          created_at: '2024-01-15T00:00:00Z',
        },
      }).as('getProfile');

      // Stub dashboard APIs so the dashboard page does not error
      cy.stubDashboardAPIs();

      // Stub notification unread count (used by the layout/topnav)
      cy.intercept('GET', '/api/v1/notifications/*/unread-count', {
        statusCode: 200,
        body: { unreadCount: 0 },
      });

      // Fill in the form
      cy.get('input[type="email"]').type('admin@optisight.io');
      cy.get('input[type="password"]').type('Test1234!');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginRequest');

      // After successful login the app navigates to /dashboard
      cy.url().should('include', '/dashboard');
    });

    it('should show an error banner on failed login', () => {
      cy.intercept('POST', '/api/v1/users/login', {
        statusCode: 401,
        body: { error: 'Invalid email or password' },
      }).as('loginFail');

      cy.get('input[type="email"]').type('wrong@example.com');
      cy.get('input[type="password"]').type('bad-password');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginFail');
      cy.get('[role="alert"]').should('contain', 'Invalid email or password');
    });

    it('should navigate to register page via the footer link', () => {
      cy.contains('Create one').click();
      cy.url().should('include', '/register');
    });
  });

  // -------------------------------------------------------
  // REGISTER PAGE
  // -------------------------------------------------------
  describe('Registration Page', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display registration form with all fields', () => {
      cy.contains('Create Account').should('be.visible');
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('have.length.at.least', 2); // password + confirm
      cy.get('button[type="submit"]').contains('Create Account').should('be.visible');
    });

    it('should show password strength meter when password is typed', () => {
      // The PasswordStrengthMeter renders only when password is non-empty
      cy.get('input[type="password"]').first().type('Str0ng!Pass');
      cy.get('[class*="Strength"], [data-testid="password-strength"]')
        .should('exist');
    });

    it('should show validation errors for invalid inputs', () => {
      cy.get('button[type="submit"]').click();

      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should show error when passwords do not match', () => {
      cy.get('input[type="email"]').type('new@test.com');
      cy.get('input[type="password"]').first().type('Str0ng!Pass');
      cy.get('input[type="password"]').last().type('Different!1');
      cy.get('button[type="submit"]').click();

      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should redirect to login on successful registration', () => {
      cy.intercept('POST', '/api/v1/users/register', {
        statusCode: 201,
        body: { message: 'User created successfully' },
      }).as('registerRequest');

      cy.get('input[type="email"]').type('new@test.com');
      cy.get('input[type="password"]').first().type('Str0ng!Pass1');
      cy.get('input[type="password"]').last().type('Str0ng!Pass1');
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest');
      cy.url().should('include', '/login');
    });
  });
});
