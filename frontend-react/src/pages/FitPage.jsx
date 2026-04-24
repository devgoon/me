import { useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { apiFetch } from '../lib/api.js';

function FitPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function analyzeFit() {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(
        '/api/fit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription }),
        },
        { timeoutMs: 15000 }
      );
      if (!response.ok) throw new Error('Fit analysis failed');
      setResult(await response.json());
    } catch (fitError) {
      setError(fitError.message || 'Unable to analyze fit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Typography variant="h1">See If We Are A Match</Typography>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <TextField
              placeholder="Paste a job description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              multiline
              minRows={10}
              fullWidth
            />
            <Button type="button" variant="contained" onClick={analyzeFit} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Fit'}
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      {result ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h2">{result.verdict || 'Result'}</Typography>
              <Typography variant="body2">
                <strong>Score:</strong> {result.score ?? 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Recommendation:</strong> {result.suggestedMessage || 'N/A'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

export default FitPage;
