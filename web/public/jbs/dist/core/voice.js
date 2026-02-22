/**
 * Base class for every synth voice (drum, oscillator, etc.)
 * Owns a gain node so derived classes can focus on sound generation.
 */
export class Voice {
    constructor(id, context, options = {}) {
        // Per-voice accent amount (how much velocity is boosted on accent hits)
        this.accentAmount = 1.1;
        this.voiceId = id;
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = options.outputGain ?? 1;
    }
    getAccentAmount() {
        return this.accentAmount;
    }
    setAccentAmount(amount) {
        this.accentAmount = Math.max(1, Math.min(2, amount));
    }
    get id() {
        return this.voiceId;
    }
    connect(destination) {
        this.output.connect(destination);
    }
    disconnect() {
        this.output.disconnect();
    }
    /**
     * Update any exposed parameter (tune, decay, etc.)
     * Base class handles 'accent' parameter.
     */
    setParameter(paramId, value) {
        if (paramId === 'accent') {
            this.setAccentAmount(value);
        }
    }
    /**
     * Provide metadata so UIs/CLIs can expose available controls.
     * Includes base accent parameter.
     */
    get parameterDescriptors() {
        return [
            {
                id: 'accent',
                label: 'Accent',
                range: { min: 1, max: 2, step: 0.05 },
                defaultValue: 1.1,
            },
        ];
    }
}
//# sourceMappingURL=voice.js.map