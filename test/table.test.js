import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/table.js';

function seated(...ids) {
  const table = T.createTable({ dmId: 'dm', channelId: 'vc' });
  T.addPlayer(table, 'dm', 'DM');
  for (const id of ids) T.addPlayer(table, id, id.toUpperCase());
  return table;
}

test('DM is never seated as a player and never muted', () => {
  const table = seated('a', 'b');
  T.toggleMode(table);
  T.toggleMute(table, 'dm');
  assert.deepEqual(table.order, ['a', 'b']);
  assert.equal(T.isMuted(table, 'dm'), false);
});

test('open table mutes nobody; turn mode mutes everyone but the floor', () => {
  const table = seated('a', 'b', 'c');
  assert.equal(T.isMuted(table, 'a'), false);
  T.toggleMode(table);
  T.next(table);
  assert.equal(table.floor, 'a');
  assert.deepEqual(['a', 'b', 'c'].map((id) => T.isMuted(table, id)), [false, true, true]);
});

test('next and prev walk the order and wrap around', () => {
  const table = seated('a', 'b', 'c');
  T.next(table);
  T.next(table);
  T.next(table);
  T.next(table);
  assert.equal(table.floor, 'a');
  T.prev(table);
  assert.equal(table.floor, 'c');
});

test('taking a hand borrows the floor, then next returns to whose turn it was', () => {
  const table = seated('a', 'b', 'c');
  T.next(table); // a's turn
  T.raiseHand(table, 'c');
  T.takeHand(table);
  assert.equal(table.floor, 'c');
  assert.deepEqual(table.hands, []);
  T.next(table);
  assert.equal(table.floor, 'a');
  T.next(table);
  assert.equal(table.floor, 'b');
});

test('quick mute toggle overrides until the floor moves', () => {
  const table = seated('a', 'b');
  T.toggleMute(table, 'a');
  assert.equal(T.isMuted(table, 'a'), true);
  T.toggleMute(table, 'a');
  assert.equal(T.isMuted(table, 'a'), false);
  T.toggleMute(table, 'b');
  T.next(table);
  assert.equal(T.isMuted(table, 'b'), false);
});

test('setOrder puts listed players first and ignores people not seated', () => {
  const table = seated('a', 'b', 'c');
  T.setOrder(table, ['c', 'zz', 'a']);
  assert.deepEqual(table.order, ['c', 'a', 'b']);
  T.next(table);
  assert.equal(table.floor, 'c');
});

test('someone leaving mid-round keeps the turn pointer sane', () => {
  const table = seated('a', 'b', 'c');
  T.next(table);
  T.next(table); // b's turn
  T.removePlayer(table, 'a');
  T.next(table);
  assert.equal(table.floor, 'c');
  T.removePlayer(table, 'c'); // turn holder leaves
  assert.equal(table.floor, null);
  T.next(table);
  assert.equal(table.floor, 'b');
});
