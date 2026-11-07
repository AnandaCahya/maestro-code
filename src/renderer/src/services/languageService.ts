import type * as monaco from 'monaco-editor'

export interface LanguageSnippet {
  label: string
  insertText: string
  detail: string
  documentation?: string
}

export const LANGUAGE_SNIPPETS: Record<string, LanguageSnippet[]> = {
  typescript: [
    {
      label: 'clg',
      insertText: 'console.log($1)',
      detail: 'console.log snippet',
      documentation: 'Log output to console'
    },
    {
      label: 'afn',
      insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n}',
      detail: 'Arrow Function',
      documentation: 'Create an arrow function'
    },
    {
      label: 'fn',
      insertText: 'function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}',
      detail: 'Named Function',
      documentation: 'Declare a typed named function'
    },
    {
      label: 'try',
      insertText: 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}',
      detail: 'Try-Catch Block',
      documentation: 'Handle exceptions'
    },
    {
      label: 'imp',
      insertText: "import { $1 } from '$2'",
      detail: 'ES Module Import',
      documentation: 'Import named exports'
    },
    {
      label: 'prom',
      insertText: 'new Promise<${1:void}>((resolve, reject) => {\n\t$0\n})',
      detail: 'Promise Constructor',
      documentation: 'Construct a new typed Promise'
    },
    {
      label: 'desc',
      insertText: "describe('${1:suite}', () => {\n\t$0\n})",
      detail: 'Test Suite (describe)',
      documentation: 'Declare a test suite'
    },
    {
      label: 'it',
      insertText: "it('${1:spec}', () => {\n\t$0\n})",
      detail: 'Test Case (it)',
      documentation: 'Declare a test case'
    }
  ],
  javascript: [
    {
      label: 'clg',
      insertText: 'console.log($1)',
      detail: 'console.log snippet',
      documentation: 'Log output to console'
    },
    {
      label: 'afn',
      insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n}',
      detail: 'Arrow Function',
      documentation: 'Create an arrow function'
    },
    {
      label: 'fn',
      insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
      detail: 'Named Function',
      documentation: 'Declare a named function'
    },
    {
      label: 'try',
      insertText: 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}',
      detail: 'Try-Catch Block',
      documentation: 'Handle exceptions'
    },
    {
      label: 'imp',
      insertText: "import { $1 } from '$2'",
      detail: 'ES Module Import',
      documentation: 'Import named exports'
    }
  ],
  python: [
    {
      label: 'def',
      insertText: 'def ${1:function_name}(${2:params}):\n\t${0:pass}',
      detail: 'Function definition',
      documentation: 'Define a function'
    },
    {
      label: 'class',
      insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, args}):\n\t\t${0:pass}',
      detail: 'Class definition',
      documentation: 'Define a class with __init__'
    },
    {
      label: 'ifmain',
      insertText: "if __name__ == '__main__':\n\t${0:main()}",
      detail: 'Entrypoint guard',
      documentation: 'Standard Python main guard'
    },
    {
      label: 'try',
      insertText: 'try:\n\t$1\nexcept ${2:Exception} as ${3:e}:\n\t${0:pass}',
      detail: 'Try-Except Block',
      documentation: 'Handle exceptions in Python'
    },
    {
      label: 'with',
      insertText: "with open('${1:filepath}', '${2:r}') as ${3:f}:\n\t${0:content = f.read()}",
      detail: 'Context manager (with open)',
      documentation: 'Safely open files with context manager'
    }
  ],
  go: [
    {
      label: 'fn',
      insertText: 'func ${1:name}(${2:params}) ${3:error} {\n\t$0\n}',
      detail: 'Function definition',
      documentation: 'Declare a Go function'
    },
    {
      label: 'iferr',
      insertText: 'if err != nil {\n\treturn ${1:err}\n}',
      detail: 'Error check (if err != nil)',
      documentation: 'Standard Go error check'
    },
    {
      label: 'for',
      insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t$0\n}',
      detail: 'For Loop',
      documentation: 'Indexed loop'
    }
  ],
  rust: [
    {
      label: 'fn',
      insertText: 'fn ${1:name}(${2:params}) -> ${3:Result<(), Box<dyn std::error::Error>>} {\n\t$0\n}',
      detail: 'Function definition',
      documentation: 'Declare a Rust function'
    },
    {
      label: 'struct',
      insertText: '#[derive(Debug, Clone)]\npub struct ${1:Name} {\n\t$0\n}',
      detail: 'Struct definition',
      documentation: 'Declare a public struct with derive'
    },
    {
      label: 'impl',
      insertText: 'impl ${1:Name} {\n\t$0\n}',
      detail: 'Impl block',
      documentation: 'Implement methods for type'
    }
  ],
  html: [
    {
      label: 'html5',
      insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
      detail: 'HTML5 Boilerplate',
      documentation: 'Standard modern HTML5 document scaffold'
    }
  ],
  css: [
    {
      label: 'flexcenter',
      insertText: 'display: flex;\njustify-content: center;\nalign-items: center;',
      detail: 'Flexbox Centering',
      documentation: 'Center content horizontally and vertically'
    },
    {
      label: 'grid',
      insertText: 'display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:1rem};',
      detail: 'Grid Layout',
      documentation: 'Create a responsive CSS grid'
    }
  ],
  json: [
    {
      label: 'pkg',
      insertText: '{\n\t"name": "${1:my-package}",\n\t"version": "1.0.0",\n\t"scripts": {\n\t\t"start": "node index.js"\n\t}\n}',
      detail: 'package.json skeleton',
      documentation: 'Create a basic package.json'
    }
  ]
}

export function registerLanguageConfigurations(m: typeof monaco): void {
  // 1. Comments, brackets, and auto-closing configuration
  const cLikeConfig: monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '<', close: '>' }
    ]
  }

  const pythonConfig: monaco.languages.LanguageConfiguration = {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  }

  const jsonConfig: monaco.languages.LanguageConfiguration = {
    brackets: [
      ['{', '}'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ]
  }

  const htmlConfig: monaco.languages.LanguageConfiguration = {
    comments: {
      blockComment: ['<!--', '-->']
    },
    brackets: [
      ['<!--', '-->'],
      ['<', '>'],
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  }

  const cLikeLangs = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'go', 'rust', 'c', 'cpp', 'csharp', 'java']
  for (const lang of cLikeLangs) {
    try {
      m.languages.setLanguageConfiguration(lang, cLikeConfig)
    } catch {
      // ignore
    }
  }

  try {
    m.languages.setLanguageConfiguration('python', pythonConfig)
  } catch {
    // ignore
  }

  try {
    m.languages.setLanguageConfiguration('json', jsonConfig)
  } catch {
    // ignore
  }

  try {
    m.languages.setLanguageConfiguration('html', htmlConfig)
  } catch {
    // ignore
  }

  // 2. Language-specific Snippet Providers
  for (const [lang, snippets] of Object.entries(LANGUAGE_SNIPPETS)) {
    try {
      m.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }

          const suggestions: monaco.languages.CompletionItem[] = snippets.map((s) => ({
            label: s.label,
            kind: m.languages.CompletionItemKind.Snippet,
            documentation: s.documentation,
            detail: s.detail,
            insertText: s.insertText,
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          }))

          return { suggestions }
        }
      })
    } catch {
      // ignore
    }
  }
}
