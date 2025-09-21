(async()=>{
  const fetch = (await import('node-fetch')).default;
  const r = await fetch('http://localhost:5000/api/plans/dev-seed', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const j = await r.json();
  console.log(JSON.stringify(j, null, 2));
})();
