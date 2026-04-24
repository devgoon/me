import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

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
                  About Me
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                  Cloud Architect & Developer
                </Typography>
                <Typography>
                  Staff-level Software Engineer specializing in large-scale, highly available
                  platform systems supporting latency-sensitive workloads in production. Proven
                  experience designing and operating distributed services, managing high-throughput
                  traffic, and owning reliability, performance, and operational health at scale.
                  Experienced in applying GitHub Copilot as a productivity multiplier in large
                  production codebases, balancing acceleration with correctness, security, and long-
                  term maintainability.
                </Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Contact: vminnocci@gmail.com
                  </Typography>
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
