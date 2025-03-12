import { linter } from '@codemirror/lint';

/**
 * Fungsi linter untuk Python yang mendeteksi variabel yang tidak digunakan
 */
export const pythonLinterUnusedVariable = () => {
    return linter((view) => {
        const diagnostics = [];
        const codeText = view.state.doc.toString();

        // Ekspresi reguler untuk mendeteksi variabel yang tidak digunakan
        const varRegex = /(?:^|\s)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
        const usedVars = new Set();
        let match;

        // Mencari semua assignment variabel
        while ((match = varRegex.exec(codeText)) !== null) {
            const varName = match[1];
            usedVars.add(varName);
        }

        // Mencari semua referensi variabel
        const refRegex = /(?:^|\s)([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*[^=]*\()/g;
        while ((match = refRegex.exec(codeText)) !== null) {
            const varName = match[1];
            usedVars.add(varName);
        }

        // Menyusun diagnostics untuk variabel yang tidak digunakan
        const lines = codeText.split('\n');
        lines.forEach((line, lineIndex) => {
            const words = line.split(/\s+/);
            words.forEach((word) => {
                if (/[a-zA-Z_][a-zA-Z0-9_]*/.test(word) && !usedVars.has(word)) {
                    diagnostics.push({
                        from: line,
                        to: line,
                        severity: 'warning',
                        message: `Variabel tidak digunakan: ${word}`,
                        source: 'pythonLinter',
                    });
                }
            });
        });

        return diagnostics;
    });
};  