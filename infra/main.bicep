targetScope = 'resourceGroup'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Project name prefix used for resource names')
param projectName string = 'lodovi'

@description('PostgreSQL administrator username')
param postgresAdminUser string

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

@description('PostgreSQL database name')
param postgresDatabaseName string = 'portfolio'

@description('PostgreSQL server SKU name')
param postgresSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage size in GB')
param postgresStorageGb int = 32

var logAnalyticsName = '${projectName}-log'
var appInsightsName = '${projectName}-appi'
var postgresServerName = '${projectName}-pg'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: postgresSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: postgresStorageGb
    }
    network: {
      publicNetworkAccess: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  name: '${postgresServer.name}/${postgresDatabaseName}'
}

output appInsightsConnectionString string = appInsights.properties.ConnectionString
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output postgresDatabase string = postgresDb.name
