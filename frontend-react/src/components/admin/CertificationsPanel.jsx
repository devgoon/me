import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultCertification } from './utils.js';

function CertificationsPanel({ adminData, prependListItem, removeListItem, updateListItem }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          pb: 0.5,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Certifications
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => prependListItem('certifications', defaultCertification())}
        >
          Add Certification
        </Button>
      </Stack>

      {(adminData.certifications || []).map((item, index) => (
        <Paper key={`cert-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                pb: 0.25,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {item.name || `Certification ${index + 1}`}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => removeListItem('certifications', index)}
              >
                Remove
              </Button>
            </Stack>

            <Stack direction="column" spacing={2}>
              <TextField
                label="Name"
                value={item.name || ''}
                onChange={(e) => updateListItem('certifications', index, 'name', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Issuer"
                value={item.issuer || ''}
                onChange={(e) => updateListItem('certifications', index, 'issuer', e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label="Issue date"
                type="date"
                value={item.issueDate || ''}
                onChange={(e) =>
                  updateListItem('certifications', index, 'issueDate', e.target.value)
                }
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Expiration date"
                type="date"
                value={item.expirationDate || ''}
                onChange={(e) =>
                  updateListItem('certifications', index, 'expirationDate', e.target.value)
                }
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField
              label="Credential ID"
              value={item.credentialId || ''}
              onChange={(e) =>
                updateListItem('certifications', index, 'credentialId', e.target.value)
              }
              fullWidth
              size="small"
            />
            <TextField
              label="Verification URL"
              value={item.verificationUrl || ''}
              onChange={(e) =>
                updateListItem('certifications', index, 'verificationUrl', e.target.value)
              }
              fullWidth
              size="small"
            />
            <TextField
              label="Notes"
              value={item.notes || ''}
              onChange={(e) => updateListItem('certifications', index, 'notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default CertificationsPanel;
