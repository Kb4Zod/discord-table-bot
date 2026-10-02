// Pure table state: who's seated, whose turn it is, who has a hand up,
// and who should be muted. No Discord imports, so it's easy to test.

export function createTable({ dmId, channelId }) {
  return {
    dmId,
    channelId,
    mode: 'open', // 'open' = everyone talks, 'turn' = only the floor + DM talk
    order: [], // player ids in speaking (initiative) order
    names: {}, // id -> display name
    turnIndex: -1, // position in `order` whose turn it is
    floor: null, // id who has the floor (a raised hand can borrow it mid-turn)
    hands: [], // raised hands, oldest first
    forced: {}, // id -> true/false: DM's quick mute override, cleared on floor/mode change
    panelMessageId: null,
  };
}

export function addPlayer(table, id, name) {
  if (id === table.dmId) return;
  table.names[id] = name;
  if (!table.order.includes(id)) table.order.push(id);
}

export function removePlayer(table, id) {
  const idx = table.order.indexOf(id);
  if (idx >= 0) {
    table.order.splice(idx, 1);
    // Keep pointing at the same person, or let "Next" land on whoever slid into the gap.
    if (idx <= table.turnIndex) table.turnIndex--;
  }
  if (table.floor === id) table.floor = null;
  table.hands = table.hands.filter((h) => h !== id);
  delete table.forced[id];
}

// `ids` are players in the desired order; anyone seated but not listed goes to the end.
export function setOrder(table, ids) {
  const listed = [...new Set(ids)].filter((id) => table.order.includes(id));
  table.order = [...listed, ...table.order.filter((id) => !listed.includes(id))];
  table.turnIndex = -1;
  table.floor = null;
  table.forced = {};
}

export function next(table) {
  if (table.order.length === 0) return;
  const turnHolder = table.order[table.turnIndex];
  if (turnHolder && table.floor !== turnHolder) {
    // Someone borrowed the floor (raised hand) — hand it back to whoever's turn it is.
    giveFloor(table, turnHolder);
    return;
  }
  table.turnIndex = (table.turnIndex + 1) % table.order.length;
  giveFloor(table, table.order[table.turnIndex]);
}

export function prev(table) {
  if (table.order.length === 0) return;
  table.turnIndex = table.turnIndex <= 0 ? table.order.length - 1 : table.turnIndex - 1;
  giveFloor(table, table.order[table.turnIndex]);
}

export function raiseHand(table, id) {
  if (id === table.dmId || table.hands.includes(id)) return;
  table.hands.push(id);
}

export function lowerHand(table, id) {
  table.hands = table.hands.filter((h) => h !== id);
}

// Give the floor to the oldest raised hand without losing track of whose turn it is.
export function takeHand(table) {
  const id = table.hands[0];
  if (id) giveFloor(table, id);
}

export function toggleMode(table) {
  table.mode = table.mode === 'open' ? 'turn' : 'open';
  table.forced = {};
}

export function toggleMute(table, id) {
  if (id === table.dmId) return;
  table.forced[id] = !isMuted(table, id);
}

export function isMuted(table, id) {
  if (id === table.dmId) return false;
  if (id in table.forced) return table.forced[id];
  if (table.mode === 'open') return false;
  return id !== table.floor;
}

function giveFloor(table, id) {
  table.floor = id;
  lowerHand(table, id);
  table.forced = {};
}
