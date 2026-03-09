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
  // Placeholder: integrate with Azure Cost Management API
  return '$123.45';
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
