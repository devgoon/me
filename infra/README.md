# Infrastructure as Code Baseline

This folder contains the baseline Bicep deployment for production observability and data resources.

## Included resources

- Log Analytics workspace
- Application Insights component (workspace-based)
- Azure PostgreSQL Flexible Server
- PostgreSQL database

## Deploy (resource-group scope)

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file infra/main.bicep \
  --parameters @infra/main.parameters.example.json \
  --parameters postgresAdminPassword=<secure-password>
```

## Notes

