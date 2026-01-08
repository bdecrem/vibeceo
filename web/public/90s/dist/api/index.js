import { TR909Engine, } from '../machines/tr909/engine.js';
export async function renderTr909PatternToWav(pattern, options = {}) {
    const engine = new TR909Engine();
    const buffer = await engine.renderPattern(pattern, options);
    const wav = engine.audioBufferToWav(buffer);
    return { buffer, wav };
}
export class TR909Controller {
    constructor(initialPattern) {
        this.engine = new TR909Engine();
        this.patternId = 'controller-pattern';
        if (initialPattern) {
            this.setPattern(initialPattern);
        }
    }
    async loadSamples(manifest) {
        await this.engine.loadSamples(manifest);
    }
    setPattern(pattern) {
        this.currentPattern = pattern;
        this.engine.setPattern(this.patternId, pattern);
    }
    play() {
        this.engine.startSequencer();
    }
    stop() {
        this.engine.stopSequencer();
    }
    setBpm(bpm) {
        this.engine.setBpm(bpm);
    }
    setSwing(amount) {
        this.engine.setSwing(amount);
    }
    async renderCurrentPattern(options = {}) {
        if (!this.currentPattern) {
            throw new Error('No pattern has been set for rendering');
        }
        return this.engine.renderPattern(this.currentPattern, options);
    }
    async exportCurrentPatternToWav(options = {}) {
        const buffer = await this.renderCurrentPattern(options);
        return {
            buffer,
            wav: this.engine.audioBufferToWav(buffer),
        };
    }
}
//# sourceMappingURL=index.js.map