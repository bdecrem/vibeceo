/**
 * Resolve which instrument instance a per-instrument tool acts on.
 *
 *   const inst = resolveInstrument(session, input.instrument, 'jb202');
 *   if (inst.error) return inst.error;
 *   inst.pattern / inst.params / inst.node / inst.id
 *
 * `requested` is an instance id ('jb202', 'jb202-2', 'bass2'); default is the
 * canonical instance of `type`. Refuses ids of another type so add_jt90
 * can't program a JB202.
 */
export function resolveInstrument(session, requested, type) {
  const id = requested || type;
  const acc = session.instrument?.(id);
  if (!acc) {
    const same = (session.listInstruments?.() || []).filter(i => i.type === type).map(i => i.id);
    return { error: `Error: no instrument "${id}". ${type} instances: ${same.join(', ') || type}. Use add_instrument({ type: '${type}' }) to add one.` };
  }
  if (acc.type !== type) {
    return { error: `Error: "${id}" is a ${acc.type}, not a ${type}. Use the ${acc.type} tools for it.` };
  }
  return acc;
}
