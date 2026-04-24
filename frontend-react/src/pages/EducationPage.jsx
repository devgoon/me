import { Card, CardContent, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper } from '@mui/material';

// Education data
const EDUCATION = [
  {
    id: 1,
    institution: 'Southern Connecticut State University',
    degree: 'Master of Science',
    field_of_study: 'Computer Science',
    start_date: '2002-09-01',
    end_date: '2006-05-31',
    is_current: false,
    grade: null,
  },
  {
    id: 2,
    institution: 'Southern Connecticut State University',
    degree: 'Bachelor of Science',
    field_of_study: 'Psychology',
    start_date: '1993-09-01',
    end_date: '1996-05-31',
    is_current: false,
    grade: null,
  },
];

function EducationPage() {
  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h4">Education</Typography>
            <Typography color="text.secondary">
              Academic background and degrees
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {EDUCATION.length === 0 ? (
        <Typography color="text.secondary">No education records found</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Institution</strong></TableCell>
                <TableCell><strong>Degree</strong></TableCell>
                <TableCell><strong>Field of Study</strong></TableCell>
                <TableCell><strong>Period</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {EDUCATION.map((edu) => (
                <TableRow key={edu.id}>
                  <TableCell>{edu.institution}</TableCell>
                  <TableCell>{edu.degree}</TableCell>
                  <TableCell>{edu.field_of_study}</TableCell>
                  <TableCell>
                    {edu.start_date && new Date(edu.start_date).getFullYear()}
                    {edu.end_date && ` - ${new Date(edu.end_date).getFullYear()}`}
                    {edu.is_current && ' (Current)'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

export default EducationPage;
