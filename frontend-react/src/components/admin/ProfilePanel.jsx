import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { COMPANY_STAGES } from './state.js';

function ProfilePanel({ adminData, targetTitleInput, setTargetTitleInput, setProfileField, setAdminData }) {
  const p = adminData.profile;

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={700}>Profile</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField label="Full name" value={p.fullName || ''} onChange={(e) => setProfileField('fullName', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Email" type="email" value={p.email || ''} onChange={(e) => setProfileField('email', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Current title" value={p.currentTitle || ''} onChange={(e) => setProfileField('currentTitle', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Location" value={p.location || ''} onChange={(e) => setProfileField('location', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            select
            label="Availability status"
            value={p.availabilityStatus || ''}
            onChange={(e) => setProfileField('availabilityStatus', e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">Select...</MenuItem>
            <MenuItem value="Actively looking">Actively looking</MenuItem>
            <MenuItem value="Open to opportunities">Open to opportunities</MenuItem>
            <MenuItem value="Not looking">Not looking</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Available starting"
            type="date"
            value={p.availableStarting || ''}
            onChange={(e) => setProfileField('availableStarting', e.target.value)}
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            select
            label="Remote preference"
            value={p.remotePreference || ''}
            onChange={(e) => setProfileField('remotePreference', e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">Select...</MenuItem>
            <MenuItem value="Remote only">Remote only</MenuItem>
            <MenuItem value="Hybrid">Hybrid</MenuItem>
            <MenuItem value="On-site">On-site</MenuItem>
            <MenuItem value="Flexible">Flexible</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Management style" value={p.managementStyle || ''} onChange={(e) => setProfileField('managementStyle', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Work style preferences" value={p.workStylePreferences || ''} onChange={(e) => setProfileField('workStylePreferences', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Salary min" type="number" value={p.salaryMin || ''} onChange={(e) => setProfileField('salaryMin', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Salary max" type="number" value={p.salaryMax || ''} onChange={(e) => setProfileField('salaryMax', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="LinkedIn URL" type="url" value={p.linkedInUrl || ''} onChange={(e) => setProfileField('linkedInUrl', e.target.value)} fullWidth size="small" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="GitHub URL" type="url" value={p.githubUrl || ''} onChange={(e) => setProfileField('githubUrl', e.target.value)} fullWidth size="small" />
        </Grid>
      </Grid>

      <Divider />

      <Stack spacing={2}>
        <TextField label="Elevator pitch" value={p.elevatorPitch || ''} onChange={(e) => setProfileField('elevatorPitch', e.target.value)} fullWidth multiline rows={3} size="small" />
        <TextField label="Career narrative" value={p.careerNarrative || ''} onChange={(e) => setProfileField('careerNarrative', e.target.value)} fullWidth multiline rows={5} size="small" />
        <TextField label="What you're looking for" value={p.lookingFor || ''} onChange={(e) => setProfileField('lookingFor', e.target.value)} fullWidth multiline rows={3} size="small" />
        <TextField label="What you're NOT looking for" value={p.notLookingFor || ''} onChange={(e) => setProfileField('notLookingFor', e.target.value)} fullWidth multiline rows={3} size="small" />
      </Stack>

      <Divider />

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>Target titles</Typography>
          <Stack direction="column" spacing={1}>
            <TextField
              label="Add target title"
              value={targetTitleInput}
              onChange={(e) => setTargetTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const value = targetTitleInput.trim();
                if (!value) return;
                setAdminData((prev) => ({ ...prev, profile: { ...prev.profile, targetTitles: [...(prev.profile.targetTitles || []), value] } }));
                setTargetTitleInput('');
              }}
              size="small"
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => {
                const value = targetTitleInput.trim();
                if (!value) return;
                setAdminData((prev) => ({ ...prev, profile: { ...prev.profile, targetTitles: [...(prev.profile.targetTitles || []), value] } }));
                setTargetTitleInput('');
              }}
            >
              Add
            </Button>
          </Stack>
          {(p.targetTitles || []).map((title, index) => (
            <Stack key={`${title}-${index}`} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">{title}</Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() =>
                  setAdminData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      targetTitles: (prev.profile.targetTitles || []).filter((_, i) => i !== index),
                    },
                  }))
                }
              >
                Remove
              </Button>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={600}>Target company stages</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {COMPANY_STAGES.map((stage) => (
              <FormControlLabel
                key={stage}
                control={
                  <Checkbox
                    size="small"
                    checked={(p.targetCompanyStages || []).includes(stage)}
                    onChange={(e) => {
                      setAdminData((prev) => {
                        const existing = prev.profile.targetCompanyStages || [];
                        const next = e.target.checked
                          ? [...existing, stage].filter((v, i, arr) => arr.indexOf(v) === i)
                          : existing.filter((v) => v !== stage);
                        return { ...prev, profile: { ...prev.profile, targetCompanyStages: next } };
                      });
                    }}
                  />
                }
                label={stage}
              />
            ))}
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ProfilePanel;
