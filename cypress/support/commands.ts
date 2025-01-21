/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsCustomer(): Chainable<void>
      loginAsEmployee(): Chainable<void>
    }
  }
}

Cypress.Commands.add('loginAsCustomer', () => {
  const email = Cypress.env('CUSTOMER_TEST_USER_EMAIL')
  const password = Cypress.env('CUSTOMER_TEST_USER_PASSWORD')
  cy.visit('/logout')
  cy.visit('/login')
  cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(email)
  cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').type(password)
  cy.get('button[type="submit"]', { timeout: 10000 }).click()
  
  // Wait for redirect and page load
  cy.url().should('include', '/customer/tickets', { timeout: 10000 })
})

Cypress.Commands.add('loginAsEmployee', () => {
  const email = Cypress.env('EMPLOYEE_TEST_USER_EMAIL')
  const password = Cypress.env('EMPLOYEE_TEST_USER_PASSWORD')
  cy.visit('/logout')
  cy.visit('/login')
  cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(email)
  cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').type(password)
  cy.get('button[type="submit"]', { timeout: 10000 }).click()
  
  // Wait for redirect and page load
  cy.url().should('include', '/employee/dashboard', { timeout: 10000 })
})

export {} 