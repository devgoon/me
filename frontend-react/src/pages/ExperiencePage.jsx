import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { apiFetch } from '../lib/api.js';

function ExperiencePage() {
  const [error, setError] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [skills, setSkills] = useState({ strong: [], moderate: [], gaps: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const defaultsRes = await fetch('/_shared/default-data.json', { cache: 'no-store' });
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          if (active && defaults?.experience?.experiences) {
            setExperiences(defaults.experience.experiences);
            setSkills(defaults.experience.skills || defaults.skills || { strong: [], moderate: [] });
          }
        }
      } catch {
        // Defaults are optional.
      }

      try {
        const response = await apiFetch(
          '/api/experience?skipAI=1',
          { method: 'GET' },
          { timeoutMs: 30000, maxAttempts: 2 }
        );
        if (!response.ok) throw new Error('Unable to load experience');
        const payload = await response.json();
        if (!active) return;
        setExperiences(payload.experiences || []);
        setSkills(payload.skills || { strong: [], moderate: [], gaps: [] });
        setError('');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Failed to load experience data');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const orderedExperiences = useMemo(() => {
    return [...experiences].sort((a, b) => {
      if (!!a.isCurrent !== !!b.isCurrent) return a.isCurrent ? -1 : 1;
      return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
    });
  }, [experiences]);

  return (
    <Stack spacing={2.5}>
      <Typography variant="h1">Experience</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack spacing={1.5}>
        {orderedExperiences.map((exp) => (
          <Card key={exp.id || `${exp.companyName}-${exp.title}`} variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Typography variant="h2">{exp.companyName}</Typography>
                  {(exp.isCurrent || !exp.endDate) ? (
                    <Chip label="Current" size="small" color="primary" variant="filled" />
                  ) : null}
                </Stack>
                <Typography color="text.secondary">{exp.title}</Typography>
                {Array.isArray(exp.bulletPoints) && exp.bulletPoints.length > 0 ? (
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {exp.bulletPoints.map((bullet, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{bullet}</Typography>
                      </li>
                    ))}
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h2">Skills Snapshot</Typography>
            <Typography variant="body2">
              <strong>Strong:</strong> {(skills.strong || []).join(', ') || 'N/A'}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {(skills.strong || []).map((item) => (
                <Chip key={`strong-${item}`} label={item} size="small" />
              ))}
            </Stack>
            <Divider />
            <Typography variant="body2">
              <strong>Moderate:</strong> {(skills.moderate || []).join(', ') || 'N/A'}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {(skills.moderate || []).map((item) => (
                <Chip key={`moderate-${item}`} label={item} size="small" variant="outlined" />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default ExperiencePage;
