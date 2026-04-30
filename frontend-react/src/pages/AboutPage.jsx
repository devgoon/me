import { Box, Card, CardContent, Stack, Typography, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import { apiRequestJson } from '../lib/tanstackApi.js';

function AboutPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              sx={{ alignItems: 'flex-start' }}
            >
              <Box
                component="img"
                src="/assets/img/profile-img.jpg"
                alt="Profile"
                sx={{ width: 220, height: 220, objectFit: 'cover', flexShrink: 0 }}
              />
              <Stack spacing={2}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Lodovico (Vico) Minnocci
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                  Cloud Architect & Developer
                </Typography>
                <Box sx={{ maxWidth: { xs: '100%', md: 800 } }}>
                  <Stack spacing={2}>
                    <Typography>
                      Software Engineer specializing in large‑scale, highly available platform
                      systems supporting latency‑sensitive workloads in production. Proven
                      experience designing, evolving, and operating distributed services that handle
                      high‑throughput traffic while meeting strict reliability, performance, and
                      operational SLOs.
                    </Typography>

                    <Typography>
                      Demonstrated technical leadership in setting architectural direction, driving
                      cross‑team initiatives, and resolving complex, multi‑system production issues.
                      Trusted owner of reliability, performance tuning, and operational health at
                      scale, with a track record of identifying systemic risks early and delivering
                      durable solutions.
                    </Typography>

                    <Typography>
                      Experienced in applying GitHub Copilot as a productivity multiplier in large
                      production codebases, establishing best practices that balance acceleration
                      with correctness, security, and long‑term maintainability, while mentoring
                      other engineers on effective and responsible usage.
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Contact: vminnocci@gmail.com
                  </Typography>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <ExperienceChips />
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export default AboutPage;

function ExperienceChips() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    let hadDefaults = false;

    // First try to load local default data so the UI can show immediately.
    (async () => {
      try {
        const defaultsRes = await fetch('/_shared/default-data.json', { cache: 'no-store' });
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          if (mounted && defaults?.experience?.experiences) {
            setData({ experiences: defaults.experience.experiences });
            hadDefaults = true;
          }
        }
      } catch {
        // ignore defaults failures
      }

      // Then request the authoritative API and replace defaults when available
      try {
        const apiRes = await apiRequestJson(
          '/api/experience',
          { method: 'GET' },
          { timeoutMs: 8000 }
        );
        if (mounted) {
          setData(apiRes);
          setError(null);
        }
      } catch {
        // if we had defaults, keep them; otherwise surface an error
        if (mounted && !hadDefaults) setError('Unable to load experience');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading && !data) return <Typography color="text.secondary">Loading experience…</Typography>;
  if (error && !data)
    return <Typography color="text.secondary">Experience not available.</Typography>;

  const experiences = data && Array.isArray(data.experiences) ? data.experiences : [];

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} component="div" useFlexGap>
      {experiences.map((exp) => {
        const label = exp.title ? `${exp.companyName} — ${exp.title}` : exp.companyName;
        return (
          <Chip
            key={exp.id}
            label={label}
            size="small"
            variant="outlined"
            title={
              exp.bulletPoints && exp.bulletPoints.length > 0 ? exp.bulletPoints.join('\n') : ''
            }
          />
        );
      })}
    </Stack>
  );
}

// AskAiButton intentionally removed from this file; sidebar provides access.
