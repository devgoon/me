SET NOCOUNT ON;

SELECT TOP (10)
  id,
  name,
  email,
  title,
  created_at
FROM dbo.candidate_profile
ORDER BY created_at DESC;
