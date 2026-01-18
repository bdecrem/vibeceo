/**
 * Jambot Core Module
 *
 * Exports the unified parameter system, node interfaces, and session management.
 */

export { ParamSystem, getParamSystem, resetParamSystem } from './params.js';
export { Node, InstrumentNode, EffectNode, MixerNode } from './node.js';
export { createSession, serializeSession, deserializeSession } from './session.js';
export {
  applyAutomationAtStep,
  getAutomationValuesAtStep,
  getAutomationSummary,
  clearNodeAutomation,
  generateAutomation,
  interpolateAutomation,
} from './automation.js';
export {
  RoutingManager,
  createTrack,
  createSend,
  addTrackInsert,
  removeTrackInsert,
  routeToSend,
  removeFromSend,
} from './routing.js';
