import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { apiFetch } from '../lib/api.js';

const DEFAULT_STRONG_SKILLS = [
  'Agile - Scrum',
  'API Design and Development',
  'Application Security',
  'AWS Lambda',
  'AWS S3',
  'AWS DynamoDB',
  'Azure Cloud',
  'Azure DevOps',
  'CI/CD',
  'DevSecOps',
  'GitHub Copilot',
  'Observability',
  'Python',
  'React',
  'Software Architecture',
  'Terraform',
  'TypeScript',
];

const DEFAULT_MODERATE_SKILLS = [
  'C#',
  'Docker',
  'Java',
  'Jenkins',
  'Kubernetes',
  'Node.js',
  'Prompt Engineering',
  'Shell-Scripting',
  'YAML',
];

function SkillsPage() {
  const [skills, setSkills] = useState({ strong: DEFAULT_STRONG_SKILLS, moderate: DEFAULT_MODERATE_SKILLS });

  useEffect(() => {
    let skillsActive = true;
    (async () => {
      try {
        // Try to load from static JSON first
        const defaultsRes = await fetch('/_shared/default-data.json', { cache: 'no-store' });
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          if (skillsActive && defaults?.skills) {
            setSkills({
              strong: defaults.skills.strong || DEFAULT_STRONG_SKILLS,
              moderate: defaults.skills.moderate || DEFAULT_MODERATE_SKILLS,
            });
          }
        }
      } catch {
        // Defaults are optional
      }

      // Try to load from API
      try {
        const response = await apiFetch('/api/skills', { method: 'GET' }, { timeoutMs: 8000 });
        if (!response.ok) throw new Error('Unable to load skills');
        const payload = await response.json();
        if (!skillsActive) return;
        setSkills({
          strong: payload.skills?.strong || DEFAULT_STRONG_SKILLS,
          moderate: payload.skills?.moderate || DEFAULT_MODERATE_SKILLS,
        });
      } catch {
        // Skills from static data are sufficient
      }
    })();

    return () => {
      skillsActive = false;
    };
  }, []);

  return (
    <Stack spacing={4}>
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Skills
              </Typography>
              <Typography color="text.secondary">
                I've acquired many skills over the years...
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Strong
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {skills.strong.map((skill) => (
                    <Chip key={skill} label={skill} size="small" />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Broader Expertise
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {skills.moderate.map((skill) => (
                    <Chip key={skill} label={skill} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export default SkillsPage;
