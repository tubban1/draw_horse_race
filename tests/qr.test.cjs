const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('bundled QR encoder produces a scannable module matrix for challenge links', () => {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(fs.readFileSync('qr.js', 'utf8'), context);
  const result = vm.runInContext(`(() => {
    const qr = new QRCode(0, QRCodeErrorCorrectLevel.L);
    qr.addData('https://horse.fde.fan/#race=eyJ2IjoxLCJuIjoibWFtYSIsInQiOjE1LjIsInMiOjEyM30');
    qr.make();
    let dark = 0;
    for (let row = 0; row < qr.getModuleCount(); row++) {
      for (let col = 0; col < qr.getModuleCount(); col++) dark += qr.isDark(row, col) ? 1 : 0;
    }
    return { count: qr.getModuleCount(), dark };
  })()`, context);
  assert.ok(result.count >= 21);
  assert.ok(result.dark > 0);
});
