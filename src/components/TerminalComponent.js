import React, { useState, useRef } from 'react';

const TerminalComponent = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const terminalRef = useRef(null);

    // Fungsi untuk menangani perubahan input
    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    // Fungsi untuk menangani pengiriman perintah (tekan enter)
    const handleInputSubmit = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newHistory = [...history, `> ${input}`];

            // Menambah hasil command (misalnya perintah 'echo')
            let output = '';
            if (input === 'hello') {
                output = 'Hello, world!';
            } else {
                output = `Command not found: ${input}`;
            }

            setHistory([...newHistory, output]);
            setInput('');
            // Scroll ke bawah saat ada output baru
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    };

    // Fungsi untuk membersihkan terminal
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
            <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputSubmit}
                className="bg-black text-white border-none outline-none text-lg w-full font-mono"
                autoFocus
            />
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