// Azure and Claude cost endpoint
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config({ path: '../../.env.local' });

// Dummy implementation for now
router.get('/admin/monthly-cost', async (req, res) => {
  // TODO: Replace with real API calls to Azure and Claude
  const azureCost = await getAzureCost();
  const claudeCost = await getClaudeCost();
  res.json({
    azure: azureCost,
    claude: claudeCost
  });
});

async function getAzureCost() {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!clientId || !clientSecret || !tenantId || !subscriptionId) return 'Missing Azure credentials';
  try {
    // 1. Get Azure AD token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenResponse.data.access_token;
    // 2. Query Cost Management API for current month
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const costResponse = await axios.post(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-05-01`,
      {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: { from: start, to: end },
        dataset: {
          granularity: 'Monthly',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } }
        }
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rows = costResponse.data.rows;
    if (rows && rows.length && rows[0].length) {
      return `$${rows[0][0].toFixed(2)}`;
    }
    return 'N/A';
  } catch (error) {
    return 'Error';
  }
}

async function getClaudeCost() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'API key missing';
  try {
    // Example endpoint, replace with actual billing endpoint if available
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    // NOTE: Anthropic does not provide a public billing API, so this is a placeholder
    // If you have a real endpoint, update below
    // const response = await axios.get('https://api.anthropic.com/v1/billing/monthly', {
    //   headers: { 'x-api-key': apiKey },
    //   params: { month, year }
    // });
    // return response.data.cost || 'N/A';
    return 'N/A'; // Replace with real value if API is available
  } catch (error) {
    return 'Error';
  }
}

module.exports = router;
