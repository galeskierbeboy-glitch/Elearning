const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR:', e);
  process.exit(2);
});

req.end();
