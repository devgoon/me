targetScope = 'subscription'

@description('Name of the Azure budget resource')
param budgetName string = 'lodovi-monthly-budget'

@description('Budget amount in the billing currency for each month')
@minValue(1)
param amount int = 75

@description('Billing currency code, e.g. USD')
param currency string = 'USD'

@description('Optional resource group name to scope budget to. Leave empty to apply to entire subscription.')
param resourceGroupName string = ''

@description('Start date for budget tracking in YYYY-MM-01 format')
param startDate string = '2026-03-01'

@description('Primary alert email recipients')
param alertEmails array = [
  'owner@example.com'
]

@description('Percentage thresholds for ACTUAL spend alerts')
param actualThresholds array = [
  50
  80
  100
]

@description('Percentage thresholds for FORECAST spend alerts')
param forecastThresholds array = [
  80
  100
]

var notificationConfig = {
  actual50: {
    enabled: contains(actualThresholds, 50)
    operator: 'GreaterThan'
    threshold: 50
    thresholdType: 'Actual'
    contactEmails: alertEmails
  }
  actual80: {
    enabled: contains(actualThresholds, 80)
    operator: 'GreaterThan'
    threshold: 80
    thresholdType: 'Actual'
    contactEmails: alertEmails
  }
  actual100: {
    enabled: contains(actualThresholds, 100)
    operator: 'GreaterThan'
    threshold: 100
    thresholdType: 'Actual'
    contactEmails: alertEmails
  }
  forecast80: {
    enabled: contains(forecastThresholds, 80)
    operator: 'GreaterThan'
    threshold: 80
    thresholdType: 'Forecasted'
    contactEmails: alertEmails
  }
  forecast100: {
    enabled: contains(forecastThresholds, 100)
    operator: 'GreaterThan'
    threshold: 100
    thresholdType: 'Forecasted'
    contactEmails: alertEmails
  }
}

var baseProperties = {
  category: 'Cost'
  amount: amount
  timeGrain: 'Monthly'
  timePeriod: {
    startDate: startDate
  }
  notifications: notificationConfig
}

var filterProperties = empty(resourceGroupName)
  ? {}
  : {
      filter: {
        dimensions: {
          name: 'ResourceGroupName'
          operator: 'In'
          values: [
            resourceGroupName
          ]
        }
      }
    }

resource monthlyBudget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: budgetName
  properties: {
    ...union(baseProperties, filterProperties)
  }
}

output budgetId string = monthlyBudget.id
output scopedTo string = empty(resourceGroupName) ? 'subscription' : resourceGroupName
output budgetCurrency string = currency
