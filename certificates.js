const mkcert = require('mkcert');

const generateCertificates = async () => {
  // Create a Certificate Authority
  const ca = await mkcert.createCA({
    organization: 'Local Development CA',
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

  console.log('Certificate created successfully!');
  return cert;
};

generateCertificates(); 