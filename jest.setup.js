require('@babel/register');
import { setup } from 'jest-dev-server';

setup({
  command: 'node index.js', 
  port: 5001,
});
