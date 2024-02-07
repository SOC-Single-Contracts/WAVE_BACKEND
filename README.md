# WAVE_BACKEND
Node.js Backend Server for Wave Wallet.

## Install
    $ yarn install

## Configure app
Configer Google Drive is located at `gdriveapi.json`
(https://blog.devops.dev/upload-files-to-google-drive-with-nodejs-d0c24d4b4dc0)

- project_id;
- private_key_id;
- private_key = "-----BEGIN PRIVATE KEY-----\n=\n-----END PRIVATE KEY-----\n";
- client_email;
- client_id;
- client_x509_cert_url;

## Add .env
- SOL_NETWORK='https://api.mainnet-beta.solana.com'
- SOL_NETWORK='https://api.devnet.solana.com'
- MONGO_URI='mongodb+srv:uri'
- PORT=8082
- ENCRYPTION_KEY='123456789'
- ALLOW-ORIGIN='*' 

## Running the project
    $ yarn start
