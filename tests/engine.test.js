import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterCycle, GestureGate, faceGeometry, frameFromHands, faceInside } from '../engine.js';

test('each random cycle covers all characters without consecutive repeats', () => {
  const cycle = new CharacterCycle(4);
  let last = -1;
  for (let round = 0; round < 100; round++) {
    const seen = new Set();
    for (let n = 0; n < 4; n++) {
      const index = cycle.next();
      assert.notEqual(index, last); seen.add(index); last = index;
    }
    assert.equal(seen.size, 4);
  }
});

test('gesture holds once and requires sustained release before retriggering', () => {
  const gate = new GestureGate(700, 600);
  assert.equal(gate.update(true, 0), false);
  assert.equal(gate.update(true, 699), false);
  assert.equal(gate.update(true, 700), true);
  assert.equal(gate.update(true, 3000), false);
  gate.update(false, 3100); gate.update(false, 3400);
  assert.equal(gate.update(true, 3450), false);
  assert.equal(gate.update(true, 4200), false);
  gate.update(false, 4300); gate.update(false, 4901);
  assert.equal(gate.update(true, 5000), false);
  assert.equal(gate.update(true, 5700), true);
});

test('mirroring reflects face location and roll while preserving size', () => {
  const points = Array.from({ length: 468 }, () => ({ x: .3, y: .4 }));
  points[33] = { x: .2, y: .3 }; points[263] = { x: .4, y: .4 };
  points[10] = { x: .3, y: .1 }; points[152] = { x: .3, y: .8 };
  points[234] = { x: .1, y: .4 }; points[454] = { x: .5, y: .4 };
  const a = faceGeometry(points, 1000, 600), b = faceGeometry(points, 1000, 600, true);
  assert.equal(a.x + b.x, 1000); assert.equal(a.y, b.y);
  assert.ok(Math.abs(a.angle + b.angle) < 1e-9);
  assert.ok(Math.abs(a.width - b.width) < 1e-9);
});

test('hand frame rejects absent hands and accepts extended L gestures', () => {
  assert.equal(frameFromHands([], 1000, 600), null);
  const hand = (x, y, thumbX, thumbY) => {
    const points = Array.from({ length: 21 }, () => ({ x, y }));
    points[0] = { x, y: y + .35 }; points[6] = { x, y: y + .2 };
    points[8] = { x, y }; points[4] = { x: thumbX, y: thumbY };
    return points;
  };
  const left = hand(.2, .2, .4, .6), right = hand(.8, .2, .6, .6);
  const frame = frameFromHands([left, right], 1000, 600);
  assert.ok(frame);
  assert.equal(faceInside(frame, { center: { x: 500, y: 250 }, width: 300, height: 300 }), true);
  assert.equal(faceInside(frame, { center: { x: 900, y: 250 }, width: 300, height: 300 }), false);
  left[8] = left[0];
  assert.equal(frameFromHands([left, right], 1000, 600), null);
});
