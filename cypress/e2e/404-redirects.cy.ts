describe('404 Page Redirects', () => {
  beforeEach(() => {
    // Clear any existing session data
    cy.clearAllCookies()
    cy.clearAllLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('redirects unauthenticated users to login page', () => {
    cy.visit('/non-existent-page', { failOnStatusCode: false })
    cy.url().should('include', '/login')
  })

  it('redirects customer users to their tickets page', () => {
    // Login as customer and wait for redirect
    cy.visit('/login')
    cy.get('input[type="email"]').type(Cypress.env('CUSTOMER_TEST_USER_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('CUSTOMER_TEST_USER_PASSWORD'))
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/customer/tickets', { timeout: 5000 })
    
    // Test 404 redirect
    cy.visit('/non-existent-page', { failOnStatusCode: false })
    cy.url().should('include', '/customer/tickets')
  })

  it('redirects agent users to their dashboard', () => {
    // Login as agent and wait for redirect
    cy.visit('/login')
    cy.get('input[type="email"]').type(Cypress.env('EMPLOYEE_TEST_USER_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('EMPLOYEE_TEST_USER_PASSWORD'))
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/employee/dashboard', { timeout: 5000 })
    
    // Test 404 redirect
    cy.visit('/non-existent-page', { failOnStatusCode: false })
    cy.url().should('include', '/employee/dashboard')
  })
}) 