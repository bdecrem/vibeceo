const { useState, useEffect } = React;

function App() {
    const [started, setStarted] = useState(false);
    const [beatCount, setBeatCount] = useState(0);
    const [kickHit, setKickHit] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const audioEngineRef = React.useRef(null);

    useEffect(() => {
        if (started) {
            const startTime = Date.now();
            const timer = setInterval(() => {
                const now = Date.now();
                setElapsed(Math.floor((now - startTime) / 1000));
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [started]);

    const handleStart = () => {
        setStarted(true);

        const engine = new window.AudioEngine();
        audioEngineRef.current = engine;

        // Set up beat callback
        engine.onBeat = (beat) => {
            setBeatCount(prev => prev + 1);
        };

        // Set up kick callback
        engine.onKick = () => {
            setKickHit(prev => prev + 1);
        };

        // Start the audio
        engine.start(35); // 35 seconds
    };

    if (!started) {
        return (
            <div className="ascii-container">
                <button className="start-button" onClick={handleStart}>
                    Enter Berghain
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="timer">
                {elapsed}s / 35s
            </div>
            <window.AsciiRenderer beatCount={beatCount} kickHit={kickHit} />
        </>
    );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);