import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { apiRequestJson, tanstackRetryOptions } from '../lib/tanstackApi.js';

function ExperiencePage() {
  const [error, setError] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [skills, setSkills] = useState({ strong: [], moderate: [], gaps: [] });
  const experienceQuery = useQuery({
    queryKey: ['experience', { skipAI: 1 }],
    queryFn: () => apiRequestJson('/api/experience?skipAI=1', { method: 'GET' }, { timeoutMs: 30000, maxAttempts: 2, baseDelay: 500 }),
    ...tanstackRetryOptions({ maxAttempts: 2, baseDelay: 500 }),
  });

  useEffect(() => {
    (async () => {
      try {
        const defaultsRes = await fetch('/_shared/default-data.json', { cache: 'no-store' });
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          if (defaults?.experience?.experiences) {
            setExperiences(defaults.experience.experiences);
            setSkills(defaults.experience.skills || defaults.skills || { strong: [], moderate: [] });
          }
        }
      } catch {
        // Defaults are optional.
      }
    })();
  }, []);

  useEffect(() => {
    if (!experienceQuery.data) return;
    setExperiences(experienceQuery.data.experiences || []);
    setSkills(experienceQuery.data.skills || { strong: [], moderate: [], gaps: [] });
    setError('');
  }, [experienceQuery.data]);

  useEffect(() => {
    if (!experienceQuery.isError) return;
    setError(experienceQuery.error?.message || 'Failed to load experience data');
  }, [experienceQuery.error, experienceQuery.isError]);

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
      
    </Stack>
  );
}

export default ExperiencePage;
