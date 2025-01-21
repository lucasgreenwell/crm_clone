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

  it('should redirect customer users to /customer/tickets after login', () => {
    const email = Cypress.env('CUSTOMER_TEST_USER_EMAIL')
    const password = Cypress.env('CUSTOMER_TEST_USER_PASSWORD')

    cy.get('input[type="email"]').should('be.visible').type(email)
    cy.get('input[type="password"]').should('be.visible').type(password)
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/customer/tickets', { timeout: 5000 })
  })

  it('should redirect employee users to /employee/dashboard after login', () => {
    const email = Cypress.env('EMPLOYEE_TEST_USER_EMAIL')
    const password = Cypress.env('EMPLOYEE_TEST_USER_PASSWORD')

    cy.get('input[type="email"]').should('be.visible').type(email)
    cy.get('input[type="password"]').should('be.visible').type(password)
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/employee/dashboard', { timeout: 5000 })
  })
}) 