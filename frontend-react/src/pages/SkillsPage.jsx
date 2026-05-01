import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiRequestJson, tanstackRetryOptions } from '../lib/tanstackApi.js';

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
  const [skills, setSkills] = useState({
    strong: DEFAULT_STRONG_SKILLS,
    moderate: DEFAULT_MODERATE_SKILLS,
  });
  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () =>
      apiRequestJson(
        '/api/skills',
        { method: 'GET' },
        { timeoutMs: 8000, maxAttempts: 5, baseDelay: 500 }
      ),
    ...tanstackRetryOptions({ maxAttempts: 5, baseDelay: 500 }),
  });

  useEffect(() => {
    (async () => {
      try {
        // Try to load from static JSON first
        const defaultsRes = await fetch('/_shared/default-data.json', { cache: 'no-store' });
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          if (defaults?.skills) {
            setSkills({
              strong: defaults.skills.strong || DEFAULT_STRONG_SKILLS,
              moderate: defaults.skills.moderate || DEFAULT_MODERATE_SKILLS,
            });
          }
        }
      } catch {
        // Defaults are optional
      }
    })();
  }, []);

  useEffect(() => {
    if (!skillsQuery.data) return;
    const data = skillsQuery.data;
    const t = setTimeout(() => {
      setSkills({
        strong: data.skills?.strong || DEFAULT_STRONG_SKILLS,
        moderate: data.skills?.moderate || DEFAULT_MODERATE_SKILLS,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [skillsQuery.data]);

  return (
    <Stack spacing={4}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Skills
            </Typography>
            <Typography color="text.secondary">
              I've acquired many skills over the years...
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Strong
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {skills.strong.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      size="small"
                      sx={{
                        backgroundColor: '#00E5FF',
                        color: '#001216',
                        border: '1px solid #00E5FF',
                        borderRadius: 12,
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Broader Expertise
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {skills.moderate.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: '#00E5FF',
                        color: '#00E5FF',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                      }}
                    />
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
