interface ScreenPoint<Key extends string> {
  id: Key;
  x: number;
  y: number;
}

export function layoutBeeswarm<Key extends string>(points: ScreenPoint<Key>[], halfWidth: number, spacing: number) {
  const slotCount = Math.floor(halfWidth / spacing);
  if (!slotCount) return points;

  const offsets = [0];
  for (let slot = 1; slot <= slotCount; slot++) {
    offsets.push(-slot * spacing, slot * spacing);
  }
  const groups = new Map<number, ScreenPoint<Key>[]>();
  for (const point of points) {
    const group = groups.get(point.x) ?? [];
    group.push(point);
    groups.set(point.x, group);
  }

  return [...groups.values()].flatMap(group => {
    const slots = offsets.map(offset => ({ offset, lastY: -Infinity, count: 0 }));
    group.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    return group.map(point => {
      let chosen = slots[0];
      for (const slot of slots) {
        if (point.y - slot.lastY >= spacing) {
          chosen = slot;
          break;
        }
        // When the lane is full, reuse the slot with the most vertical clearance.
        if (slot.lastY < chosen.lastY || (slot.lastY === chosen.lastY && slot.count < chosen.count)) chosen = slot;
      }
      chosen.lastY = point.y;
      chosen.count++;
      return { ...point, x: point.x + chosen.offset };
    });
  });
}
