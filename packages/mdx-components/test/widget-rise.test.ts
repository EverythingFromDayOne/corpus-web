import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  widgetAlreadyInView,
  widgetShouldRise,
  widgetStaggerIndex,
} from '../src/widget-rise';

test('widgetAlreadyInView skips first-paint widgets and catches below-fold ones', () => {
  assert.equal(widgetAlreadyInView({ top: 120, bottom: 400 }, 800), true);
  assert.equal(widgetAlreadyInView({ top: 760, bottom: 980 }, 800), false);
  assert.equal(widgetAlreadyInView({ top: -200, bottom: -20 }, 800), false);
});

test('widgetStaggerIndex caps at 3 (240ms) and is 0 for the first widget', () => {
  assert.equal(widgetStaggerIndex(0), 0);
  assert.equal(widgetStaggerIndex(1), 1);
  assert.equal(widgetStaggerIndex(2), 2);
  assert.equal(widgetStaggerIndex(3), 3);
  assert.equal(widgetStaggerIndex(9), 3);
});

test('widgetShouldRise disconnects after the first intersecting entry', () => {
  assert.equal(widgetShouldRise([{ isIntersecting: false }]), false);
  assert.equal(widgetShouldRise([{ isIntersecting: true }]), true);
  assert.equal(widgetShouldRise([{ isIntersecting: false }, { isIntersecting: true }]), true);
});
