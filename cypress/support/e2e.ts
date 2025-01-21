import '@testing-library/cypress/add-commands'
import './commands'

// Cypress command to login programmatically
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.get('button[type="submit"]').click()
})

// Command to check if we're logged in
Cypress.Commands.add('isLoggedIn', () => {
  cy.get('[data-testid="user-menu"]').should('exist')
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      isLoggedIn(): Chainable<void>
      loginAsCustomer(): Chainable<void>
      loginAsEmployee(): Chainable<void>
    }
  }
} 