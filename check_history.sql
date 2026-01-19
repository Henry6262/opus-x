SELECT symbol, status, closed_at, created_at 
FROM paper_positions 
WHERE status = 'closed' 
ORDER BY closed_at DESC NULLSLAST, created_at DESC 
LIMIT 30;
