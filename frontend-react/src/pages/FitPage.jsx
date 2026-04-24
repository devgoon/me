import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { apiRequest, tanstackRetryOptions } from '../lib/tanstackApi.js';

function normalizeFitResult(raw) {
  const gaps = Array.isArray(raw?.gaps)
    ? raw.gaps
    : Array.isArray(raw?.mismatches)
      ? raw.mismatches
      : [];
  const transfers = Array.isArray(raw?.transfers)
    ? raw.transfers
    : Array.isArray(raw?.reasons)
      ? raw.reasons
      : [];

  return {
    verdict: raw?.verdict || 'Result',
    score: raw?.score,
    recommendation: raw?.recommendation || raw?.suggestedMessage || 'N/A',
    gaps,
    transfers,
  };
}

function getScheduleMeetingUrl() {
  const configured = String(import.meta.env.VITE_SCHEDULE_MEETING_URL || '').trim();
  if (configured) {
    try {
      const normalized = configured.includes('://') ? configured : `https://${configured}`;
      const url = new URL(normalized);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString();
      }
    } catch {
      return '';
    }
  }

  return '';
}

function isSchedulableVerdict(verdict) {
  const normalized = String(verdict || '').trim().toUpperCase();
  return normalized === 'FIT';
}

function FitPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const scheduleMeetingUrl = getScheduleMeetingUrl();
  const resultRef = useRef(null);
  const sectionHeadingSx = {
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const fitMutation = useMutation({
    mutationFn: async (description) => {
      return apiRequest(
        '/api/fit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: description }),
        },
        { timeoutMs: 15000, maxAttempts: 5, baseDelay: 500 }
      );
    },
    ...tanstackRetryOptions({ maxAttempts: 5, baseDelay: 500 }),
  });

  useEffect(() => {
    if (!result || !resultRef.current) return;
    if (typeof resultRef.current.scrollIntoView === 'function') {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  function buildCopyText(data) {
    const lines = [];
    lines.push(`Assessment: ${data.verdict}`);
    lines.push(`Score: ${data.score ?? 'N/A'}`);

    lines.push("WHERE I DON'T FIT:");
    if (data.gaps.length > 0) {
      data.gaps.forEach((gap) => lines.push(`- ${gap}`));
    } else {
      lines.push('- No JD-specific gaps identified.');
    }

    lines.push('WHAT TRANSFERS:');
    if (data.transfers.length > 0) {
      data.transfers.forEach((transfer) => lines.push(`- ${transfer}`));
    } else {
      lines.push('- No direct transfer highlights found.');
    }

    lines.push('RECOMMENDATION:');
    lines.push(data.recommendation || 'N/A');

    return lines.join('\n');
  }

  async function handleCopyResult() {
    if (!result) return;
    const text = buildCopyText(result);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  async function analyzeFit() {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fitMutation.mutateAsync(jobDescription);
      if (!response.ok) throw new Error('Fit analysis failed');
      const payload = await response.json();
      setResult(normalizeFitResult(payload));
    } catch (fitError) {
      setError(fitError.message || 'Unable to analyze fit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Typography variant="h1">See If We're a Match</Typography>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <TextField
              placeholder="Paste a job description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              multiline
              rows={7}
              slotProps={{ htmlInput: { style: { overflowY: 'auto' } } }}
              fullWidth
            />
            <Button
              type="button"
              variant="contained"
              onClick={analyzeFit}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Analyzing...' : "See if We're a match"}
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      {result ? (
        <Card variant="outlined" ref={resultRef}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h2">{result.verdict}</Typography>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={handleCopyResult}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Stack>
              <Typography variant="body2">
                <strong>Score:</strong> {result.score ?? 'N/A'}
              </Typography>

              {scheduleMeetingUrl && isSchedulableVerdict(result.verdict) ? (
                <Button
                  type="button"
                  variant="contained"
                  color="secondary"
                  component="a"
                  href={scheduleMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Schedule a meeting
                </Button>
              ) : null}

              <Stack spacing={1}>
                <Typography sx={sectionHeadingSx}>WHERE I DON'T FIT</Typography>
                {result.gaps.length > 0 ? (
                  <Stack component="ul" sx={{ m: 0, pl: 3, gap: 0.75 }}>
                    {result.gaps.map((gap, index) => (
                      <Typography component="li" variant="body2" key={`gap-${index}`}>
                        {gap}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No JD-specific gaps identified.
                  </Typography>
                )}
              </Stack>

              <Stack spacing={1}>
                <Typography sx={sectionHeadingSx}>WHAT TRANSFERS</Typography>
                {result.transfers.length > 0 ? (
                  <Stack component="ul" sx={{ m: 0, pl: 3, gap: 0.75 }}>
                    {result.transfers.map((transfer, index) => (
                      <Typography component="li" variant="body2" key={`transfer-${index}`}>
                        {transfer}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No direct transfer highlights found.
                  </Typography>
                )}
              </Stack>

              <Stack spacing={1}>
                <Typography sx={sectionHeadingSx}>RECOMMENDATION</Typography>
                <Typography variant="body2">{result.recommendation}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

export default FitPage;
