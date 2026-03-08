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

- This is a phase-1 IaC baseline and is intended to complement the current workflows.
- Next step is to add Static Web App and Key Vault resources and then move workflow provisioning to pure IaC apply.
