import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultSkill } from './utils.js';

function SkillsPanel({ adminData, prependListItem, removeListItem, updateListItem }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ pb: 0.5 }}
      >
        <Typography variant="h6" fontWeight={700}>Skills</Typography>
        <Button variant="outlined" size="small" onClick={() => prependListItem('skills', defaultSkill())}>
          Add Skill
        </Button>
      </Stack>

      {(adminData.skills || []).map((item, index) => (
        <Paper key={`skill-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ pb: 0.25 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {item.skillName || `Skill ${index + 1}`}
              </Typography>
              <Button variant="outlined" color="error" size="small" onClick={() => removeListItem('skills', index)}>
                Remove
              </Button>
            </Stack>

            <Stack direction="column" spacing={2}>
              <TextField label="Skill name" value={item.skillName || ''} onChange={(e) => updateListItem('skills', index, 'skillName', e.target.value)} fullWidth size="small" />
              <TextField
                select
                label="Category"
                value={item.category || 'strong'}
                onChange={(e) => updateListItem('skills', index, 'category', e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="strong">Strong</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="gap">Gap</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField label="Self rating (1–5)" type="number" slotProps={{ htmlInput: { min: 1, max: 5 } }} value={item.selfRating || 3} onChange={(e) => updateListItem('skills', index, 'selfRating', e.target.value)} fullWidth size="small" />
              <TextField label="Years experience" type="number" slotProps={{ htmlInput: { min: 0, step: 0.5 } }} value={item.yearsExperience || ''} onChange={(e) => updateListItem('skills', index, 'yearsExperience', e.target.value)} fullWidth size="small" />
              <TextField label="Last used" type="date" value={item.lastUsed || ''} onChange={(e) => updateListItem('skills', index, 'lastUsed', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <TextField label="Evidence" value={item.evidence || ''} onChange={(e) => updateListItem('skills', index, 'evidence', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Honest notes" value={item.honestNotes || ''} onChange={(e) => updateListItem('skills', index, 'honestNotes', e.target.value)} fullWidth multiline rows={2} size="small" />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default SkillsPanel;
