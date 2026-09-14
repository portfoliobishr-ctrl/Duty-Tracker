const url = "https://uhdemavcavszkjuezdrr.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGVtYXZjYXZzemtqdWV6ZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwOTY1NDAsImV4cCI6MjEwNDY3MjU0MH0.hPXp9KByBXul8uLMBM9iamaSg8CQ4BUjnOO969EuFs4";

async function run() {
  const groupsRes = await fetch(`${url}/groups?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const groups = await groupsRes.json();
  const group2 = groups.find(g => g.id === 2);
  
  if (group2) {
    await fetch(`${url}/cooking_duties`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duty_date: '2026-09-08',
        group_id: group2.id,
        is_holiday: false,
        breakfast_completed: true,
        lunch_completed: true,
        notes: 'Seeded Group 2 completed duty'
      })
    });
    console.log('Inserted Group 2 duty');
  }
}
run().catch(console.error);
