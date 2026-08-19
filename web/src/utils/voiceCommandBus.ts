// Global event bus for voice commands
// Any component can listen to voice commands and act on them

type VoiceCommandHandler = (cmd: string, args: string) => boolean; // return true if handled

const handlers: VoiceCommandHandler[] = [];
let _debug = false;

export function setVoiceCommandDebug(v: boolean) {
  _debug = !!v;
}

export const voiceCommandBus = {
  register(handler: VoiceCommandHandler) {
    handlers.push(handler);
    if (_debug) console.debug(`[voiceCommandBus] register handler — total=${handlers.length}`);
    return () => {
      const i = handlers.indexOf(handler);
      if (i > -1) handlers.splice(i, 1);
      if (_debug) console.debug(`[voiceCommandBus] unregister handler — total=${handlers.length}`);
    };
  },
  dispatch(cmd: string, args: string) {
    if (_debug) console.debug(`[voiceCommandBus] dispatch -> cmd=${cmd} args=${args}`);
    for (const h of [...handlers].reverse()) {
      try {
        const handled = h(cmd, args);
        if (_debug) console.debug(`[voiceCommandBus] handler returned ${handled}`);
        if (handled) return true; // first handler that claims it wins
      } catch (err) {
        if (_debug) console.error(`[voiceCommandBus] handler error`, err);
      }
    }
    return false;
  },
};
