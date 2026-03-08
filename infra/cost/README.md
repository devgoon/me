# Azure Budget IaC

This folder defines Azure Cost Management budget resources as IaC via Bicep.

## What this deploys

- Subscription-scope monthly cost budget
- Alert notifications for actual and forecasted spend thresholds
- Optional filter to scope to one resource group

## Deploy

```bash
az deployment sub create \
  --location eastus \
  --template-file infra/cost/budget.bicep \
  --parameters @infra/cost/budget.parameters.example.json
```

## Common settings

- `amount`: monthly cap target (e.g. 50, 75, 100)
- `alertEmails`: recipients for threshold alerts
- `resourceGroupName`: set to a specific RG or leave empty for subscription-wide

## Notes

- Azure budgets send alerts; they do not hard-stop all spend on pay-as-you-go.
- Keep Anthropic/API vendor spend limits separate, since that cost is outside Azure Budget.
