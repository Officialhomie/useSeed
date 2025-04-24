const https = require('https');
const fs = require('fs');
const path = require('path');
const next = require('next');
const mkcert = require('mkcert');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function generateCertificates() {
  // Create a certificate authority
  const ca = await mkcert.createCA({
    organization: 'Development CA',
    countryCode: 'US',
    state: 'Development State',
    locality: 'Development Locality',
    validityDays: 365
  });

  // Create a certificate signed by the CA
  const cert = await mkcert.createCert({
    domains: ['127.0.0.1', 'localhost'],
    validityDays: 365,
    caKey: ca.key,
    caCert: ca.cert
  });

  // Ensure the certs directory exists
  const certsDir = path.join(__dirname, 'certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
  }

  // Write certificates to files
  fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert.cert);
  fs.writeFileSync(path.join(certsDir, 'key.pem'), cert.key);

  return {
    key: cert.key,
    cert: cert.cert
  };
}

async function startServer() {
  try {
    console.log('Generating SSL certificates...');
    const certificates = await generateCertificates();
    
    console.log('Preparing Next.js app...');
    await app.prepare();

    const httpsOptions = {
      key: certificates.key,
      cert: certificates.cert
    };

    https.createServer(httpsOptions, (req, res) => {
      return handle(req, res);
    }).listen(3000, (err) => {
      if (err) throw err;
      console.log('> Ready on https://localhost:3000');
    });

  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer(); 