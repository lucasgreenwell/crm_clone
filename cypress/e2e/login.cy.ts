describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login')
    // Wait for the form to be fully loaded
    cy.get('form').should('be.visible')
  })

  it('should display the login form', () => {
    cy.get('form').should('exist')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.get('button[type="submit"]').should('exist')
  })

  it('should show error for invalid credentials', () => {
    // Intercept the auth call and force an error
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 400,
      body: {
        error: 'Invalid login credentials',
        message: 'Invalid login credentials'
      }
    }).as('loginAttempt')

    cy.get('input[type="email"]').should('be.visible').type('invalid@example.com')
    cy.get('input[type="password"]').should('be.visible').type('wrongpassword')
    cy.get('button[type="submit"]').click()
    
    // Wait for the API call
    cy.wait('@loginAttempt')

    // Look for the Radix UI toast notification
    cy.get('[role="region"]')
      .find('[data-state="open"]')
      .should('exist')
      .contains('Invalid login credentials')
  })

  it('should successfully login with valid credentials', () => {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')

    // Wait for inputs to be visible before typing
    cy.get('input[type="email"]').should('be.visible').type(email)
    cy.get('input[type="password"]').should('be.visible').type(password)
    cy.get('button[type="submit"]').click()

    // Wait for navigation to customer tickets page
    cy.url().should('include', '/customer/tickets', { timeout: 5000 })
  })
}) 