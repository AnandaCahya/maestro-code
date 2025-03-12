import React, { useState, useRef, useEffect } from 'react';
const { ipcRenderer } = window.require("electron");

const TerminalComponent = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [terminalRunning, setTerminalRunning] = useState(false); // State untuk status terminal
    const terminalRef = useRef(null);

    // Cleanup IPC event listener when component unmounts
    useEffect(() => {
        const handleCommandOutput = (event, output) => {
            setHistory((prevHistory) => [...prevHistory, output]);
        };

        const handleTerminalStatus = (event, status) => {
            setTerminalRunning(status.running); // Update status terminal berdasarkan IPC
        };

        ipcRenderer.on('command-output', handleCommandOutput);
        ipcRenderer.on('terminal-status', handleTerminalStatus);

        // Cleanup listeners when component unmounts
        return () => {
            ipcRenderer.removeListener('command-output', handleCommandOutput);
            ipcRenderer.removeListener('terminal-status', handleTerminalStatus);
        };
    }, []);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleInputSubmit = (e) => {
        if (e.key === 'Enter') {
            // Prevent submitting if terminal is running
            if (terminalRunning) {
                e.preventDefault();
                return; // Stop further execution if terminal is running
            }

            e.preventDefault();
            const newHistory = [...history, `> ${input}`];
            ipcRenderer.send('run-command', input); // Kirim perintah ke backend
            setHistory(newHistory);
            setInput('');
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    };

    const clearTerminal = () => {
        setHistory([]);
    };

    return (
        <div className="w-full h-full bg-black text-white p-4 flex flex-col font-mono">
            <div ref={terminalRef} className="flex-1 overflow-y-auto mb-4">
                {history.map((line, index) => (
                    <div key={index}>{line}</div>
                ))}
            </div>
            <div className="relative w-full">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleInputSubmit}
                    className="bg-black text-white border-none outline-none text-lg w-full font-mono"
                    autoFocus
                    disabled={terminalRunning}  // Disable the input field when terminal is running
                />
                {terminalRunning && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 spinner"></div>
                )}
            </div>
            <button
                onClick={clearTerminal}
                className="mt-4 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
                Clean Terminal
            </button>
        </div>
    );
};

export default TerminalComponent;