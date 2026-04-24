import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

function AboutPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
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
                I build cloud-native systems at every scale — from startups to Fortune 500 infrastructure, and now autonomous vehicle software at Torc Robotics. I've led cloud, DevOps, and observability strategy across a wide range of domains. Clean architecture, observable systems, and shipping things that matter are what drive me.
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
