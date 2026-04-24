import { Box, Card, CardContent, Grid, Stack, Tooltip, Typography } from '@mui/material';

// Certifications data with image mappings
const CERTIFICATIONS = [
  {
    id: 1,
    name: 'Azure Solutions Architect Expert (AZ-305)',
    issuer: 'Microsoft',
    issue_date: '2023-01-15',
    expiration_date: '2025-01-15',
    credential_id: 'AZ-305',
    verification_url: 'https://learn.microsoft.com/en-us/certifications/azure-solutions-architect-expert/',
    image: 'azure-cert-az305.png',
  },
  {
    id: 2,
    name: 'Azure DevOps Engineer Expert (AZ-400)',
    issuer: 'Microsoft',
    issue_date: '2022-06-10',
    expiration_date: '2024-06-10',
    credential_id: 'AZ-400',
    verification_url: 'https://learn.microsoft.com/en-us/certifications/devops-engineer/',
    image: 'azure-cert-devops.png',
  },
  {
    id: 3,
    name: 'Azure Fundamentals (AZ-900)',
    issuer: 'Microsoft',
    issue_date: '2021-12-01',
    expiration_date: null,
    credential_id: 'AZ-900',
    verification_url: 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/',
    image: 'azure-cert-fundamentals.png',
  },
  {
    id: 4,
    name: 'Azure Administrator Associate (AZ-104)',
    issuer: 'Microsoft',
    issue_date: '2022-03-20',
    expiration_date: '2024-03-20',
    credential_id: 'AZ-104',
    verification_url: 'https://learn.microsoft.com/en-us/certifications/azure-administrator/',
    image: 'azure-administrator-associate.png',
  },
  {
    id: 5,
    name: 'AWS Certified Solutions Architect - Associate',
    issuer: 'Amazon Web Services',
    issue_date: '2022-09-05',
    expiration_date: '2025-09-05',
    credential_id: 'SAA-C03',
    verification_url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    image: 'aws-cert-solutions-architect-associate.png',
  },
  {
    id: 6,
    name: 'AWS Certified Developer - Associate',
    issuer: 'Amazon Web Services',
    issue_date: '2021-11-12',
    expiration_date: '2024-11-12',
    credential_id: 'DVA-C02',
    verification_url: 'https://aws.amazon.com/certification/certified-developer-associate/',
    image: 'aws-cert-solutions-developer-associate.png',
  },
];

function CertificationBadge({ cert }) {
  const tooltipText = `${cert.name}\nIssued: ${new Date(cert.issue_date).toLocaleDateString()}\n${cert.expiration_date ? `Expires: ${new Date(cert.expiration_date).toLocaleDateString()}` : 'No expiration'}`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        <Box
          component="img"
          src={`/assets/img/${cert.image}`}
          alt={cert.name}
          sx={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: 240,
          }}
        />
      </Box>
    </Tooltip>
  );
}

function CertificationsPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Certifications
              </Typography>
              <Typography color="text.secondary">
                Professional certifications and credentials. Click any badge to verify.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {CERTIFICATIONS.length === 0 ? (
        <Typography color="text.secondary">No certifications found</Typography>
      ) : (
        <Box>
          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
            {CERTIFICATIONS.map((cert) => (
              <Grid
                item
                key={cert.id}
                xs={6}
                sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <CertificationBadge cert={cert} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Stack>
  );
}

export default CertificationsPage;
