import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultExperience } from './utils.js';

function ExperiencePanel({ adminData, prependListItem, removeListItem, updateListItem, setAdminData }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', pb: 0.5 }}
      >
        <Typography variant="h6" fontWeight={700}>Experience</Typography>
        <Button variant="outlined" size="small" onClick={() => prependListItem('experiences', defaultExperience())}>
          Add Experience
        </Button>
      </Stack>

      {(adminData.experiences || []).map((item, index) => (
        <Paper key={`exp-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', pb: 0.25 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {item.companyName || `Experience ${index + 1}`}
              </Typography>
              <Button variant="outlined" color="error" size="small" onClick={() => removeListItem('experiences', index)}>
                Remove
              </Button>
            </Stack>

            <Stack direction="column" spacing={2}>
              <TextField label="Company" value={item.companyName || ''} onChange={(e) => updateListItem('experiences', index, 'companyName', e.target.value)} fullWidth size="small" />
              <TextField label="Title" value={item.title || ''} onChange={(e) => updateListItem('experiences', index, 'title', e.target.value)} fullWidth size="small" />
            </Stack>
            <TextField label="Title progression" value={item.titleProgression || ''} onChange={(e) => updateListItem('experiences', index, 'titleProgression', e.target.value)} fullWidth size="small" />
            <Stack direction="column" spacing={2}>
              <TextField label="Start date" type="date" value={item.startDate || ''} onChange={(e) => updateListItem('experiences', index, 'startDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="End date" type="date" value={item.endDate || ''} onChange={(e) => updateListItem('experiences', index, 'endDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <FormControlLabel
              control={<Checkbox size="small" checked={Boolean(item.current)} onChange={(e) => updateListItem('experiences', index, 'current', e.target.checked)} />}
              label="Current role"
            />

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Achievement bullets</Typography>
            {(item.achievementBullets || []).map((bullet, bulletIndex) => (
              <Stack key={`exp-${index}-bullet-${bulletIndex}`} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  value={bullet || ''}
                  onChange={(e) => {
                    setAdminData((prev) => {
                      const list = [...prev.experiences];
                      const row = { ...list[index] };
                      const bullets = [...(row.achievementBullets || [])];
                      bullets[bulletIndex] = e.target.value;
                      row.achievementBullets = bullets;
                      list[index] = row;
                      return { ...prev, experiences: list };
                    });
                  }}
                  fullWidth
                  size="small"
                  multiline
                />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ flexShrink: 0 }}
                  onClick={() => {
                    setAdminData((prev) => {
                      const list = [...prev.experiences];
                      const row = { ...list[index] };
                      row.achievementBullets = (row.achievementBullets || []).filter((_, i) => i !== bulletIndex);
                      list[index] = row;
                      return { ...prev, experiences: list };
                    });
                  }}
                >
                  Remove
                </Button>
              </Stack>
            ))}
            <Button
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => {
                setAdminData((prev) => {
                  const list = [...prev.experiences];
                  const row = { ...list[index] };
                  row.achievementBullets = [...(row.achievementBullets || []), ''];
                  list[index] = row;
                  return { ...prev, experiences: list };
                });
              }}
            >
              Add bullet
            </Button>

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Reflections</Typography>
            <TextField label="Why joined" value={item.whyJoined || ''} onChange={(e) => updateListItem('experiences', index, 'whyJoined', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Why left" value={item.whyLeft || ''} onChange={(e) => updateListItem('experiences', index, 'whyLeft', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Actual contributions" value={item.actualContributions || ''} onChange={(e) => updateListItem('experiences', index, 'actualContributions', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Proudest achievement" value={item.proudestAchievement || ''} onChange={(e) => updateListItem('experiences', index, 'proudestAchievement', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Would do differently" value={item.wouldDoDifferently || ''} onChange={(e) => updateListItem('experiences', index, 'wouldDoDifferently', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Hard or frustrating" value={item.hardOrFrustrating || ''} onChange={(e) => updateListItem('experiences', index, 'hardOrFrustrating', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Lessons learned" value={item.lessonsLearned || ''} onChange={(e) => updateListItem('experiences', index, 'lessonsLearned', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Manager describes you as" value={item.managerDescribe || ''} onChange={(e) => updateListItem('experiences', index, 'managerDescribe', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Reports describe you as" value={item.reportsDescribe || ''} onChange={(e) => updateListItem('experiences', index, 'reportsDescribe', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Conflicts & challenges" value={item.conflictsChallenges || ''} onChange={(e) => updateListItem('experiences', index, 'conflictsChallenges', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Quantified impact" value={item.quantifiedImpact || ''} onChange={(e) => updateListItem('experiences', index, 'quantifiedImpact', e.target.value)} fullWidth multiline rows={2} size="small" />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default ExperiencePanel;
