import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultFaq } from './utils.js';

function FaqPanel({ adminData, prependListItem, removeListItem, updateListItem }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', pb: 0.5 }}
      >
        <Typography variant="h6" fontWeight={700}>FAQ</Typography>
        <Button variant="outlined" size="small" onClick={() => prependListItem('faq', defaultFaq())}>
          Add FAQ
        </Button>
      </Stack>

      {(adminData.faq || []).map((item, index) => (
        <Paper key={`faq-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', pb: 0.25 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>FAQ {index + 1}</Typography>
              <Button variant="outlined" color="error" size="small" onClick={() => removeListItem('faq', index)}>
                Remove
              </Button>
            </Stack>

            <TextField label="Question" value={item.question || ''} onChange={(e) => updateListItem('faq', index, 'question', e.target.value)} fullWidth multiline rows={2} size="small" />
            <TextField label="Answer" value={item.answer || ''} onChange={(e) => updateListItem('faq', index, 'answer', e.target.value)} fullWidth multiline rows={3} size="small" />
            <FormControlLabel
              control={<Checkbox size="small" checked={Boolean(item.isCommonQuestion)} onChange={(e) => updateListItem('faq', index, 'isCommonQuestion', e.target.checked)} />}
              label="Common question"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default FaqPanel;
