const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function check(path, expected = 200) {
  const response = await fetch(new URL(path, baseUrl));
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}, expected ${expected}`);
  }
  return response;
}

async function main() {
  await check('/');
  await check('/lookup');
  await check('/reviews');
  await check('/admin/login');

  const login = await fetch(new URL('/api/auth/session', baseUrl)).catch(() => null);
  if (login && login.status >= 500) {
    throw new Error('Session endpoint is failing.');
  }

  console.log(`Smoke test passed against ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
