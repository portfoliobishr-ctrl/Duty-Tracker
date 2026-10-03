const url = "https://uhdemavcavszkjuezdrr.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGVtYXZjYXZzemtqdWV6ZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwOTY1NDAsImV4cCI6MjEwNDY3MjU0MH0.hPXp9KByBXul8uLMBM9iamaSg8CQ4BUjnOO969EuFs4";

async function clearTable(tableName) {
  console.log(`Clearing ${tableName}...`);
  const res = await fetch(`${url}/${tableName}?id=gt.0`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  
  if (res.status >= 400) {
    // try fallback for non-integer IDs or string IDs
    const res2 = await fetch(`${url}/${tableName}?id=not.is.null`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log(`${tableName} cleared:`, res2.status, await res2.text());
  } else {
    console.log(`${tableName} cleared:`, res.status, await res.text());
  }
}

async function run() {
  await clearTable('imam_logs');
  await clearTable('daily_imam_state');
  await clearTable('cooking_duties');
  
  // Imam rounds are seeded/managed, we can clear them to reset rounds to 1
  await clearTable('imam_rounds');

  console.log('All logs cleared successfully!');
}

run().catch(console.error);
