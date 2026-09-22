import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseAddress } from './connection.mjs';
test('uses the current Wi-Fi address instead of virtual adapters', () => {
  assert.equal(chooseAddress({
    'Local*': [{ family: 'IPv4', internal: false, address: '192.168.137.1' }],
    'Wi-Fi': [{ family: 'IPv4', internal: false, address: '172.16.161.228' }],
  }), '172.16.161.228');
});
test('never offers loopback or an unconfigured link-local address as LAN', () => {
  assert.equal(chooseAddress({ local: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    eth: [{ family: 'IPv4', internal: false, address: '169.254.1.2' }] }), undefined);
});
