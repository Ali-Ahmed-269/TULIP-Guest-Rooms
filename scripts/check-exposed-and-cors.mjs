async function probeExposedFilesAndCors() {
  const baseUrl = 'https://tulip-guest-rooms.vercel.app';

  console.log('=== 3. EXPOSED FILES CHECK ===');
  const filesToProbe = [
    '/.env',
    '/.env.local',
    '/.git/config',
    '/_next/static/chunks/app/page.js.map',
    '/package.json'
  ];

  for (const file of filesToProbe) {
    try {
      const res = await fetch(baseUrl + file);
      console.log(`GET ${file} -> HTTP Status: ${res.status}`);
    } catch (e) {
      console.log(`GET ${file} -> Error: ${e.message}`);
    }
  }

  console.log('\n=== 2. CORS HEADERS CHECK ===');
  const apiRoutes = [
    '/api/bookings/book',
    '/api/reviews',
    '/api/bookings/lookup',
    '/api/admin/settings'
  ];

  for (const route of apiRoutes) {
    try {
      const res = await fetch(baseUrl + route, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://evil-attacker.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      const acao = res.headers.get('access-control-allow-origin');
      const acam = res.headers.get('access-control-allow-methods');
      const acac = res.headers.get('access-control-allow-credentials');
      console.log(`OPTIONS ${route} -> Status: ${res.status} | Access-Control-Allow-Origin: ${acao || '(None)'} | Allow-Credentials: ${acac || '(None)'}`);
    } catch (e) {
      console.log(`OPTIONS ${route} -> Error: ${e.message}`);
    }
  }

  console.log('\nChecking CORS on direct POST responses...');
  for (const route of apiRoutes) {
    try {
      const res = await fetch(baseUrl + route, {
        method: 'POST',
        headers: {
          'Origin': 'https://evil-attacker.com',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'test=1'
      });
      const acao = res.headers.get('access-control-allow-origin');
      console.log(`POST ${route} -> Status: ${res.status} | Access-Control-Allow-Origin: ${acao || '(None)'}`);
    } catch (e) {
      console.log(`POST ${route} -> Error: ${e.message}`);
    }
  }
}

probeExposedFilesAndCors().catch(console.error);
