import React, { useState } from 'react';
import CodeMirror, { keymap } from '@uiw/react-codemirror'; // Bahasa JavaScript
import { monokai } from '@uiw/codemirror-theme-monokai';
import { FaTimes } from 'react-icons/fa';
import { basicSetup } from 'codemirror';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { vscodeKeymap } from "@replit/codemirror-vscode-keymap";
import Lang from './modules/lang';

function CodeEditor() {
  const [maestroTab, setMaestroTab] = useState([])
  const [activeTab, setActiveTab] = useState(null)

  const [activeExtensions, setActiveExtensions] = useState([basicSetup, indentationMarkers(), keymap.of(vscodeKeymap)])
  const [files, setFiles] = useState([
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.js",
      value: `// Type your JavaScript code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.py",
      value: `# Type your Python code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.java",
      value: `// Type your Java code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.c",
      value: `// Type your C code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.cpp",
      value: `// Type your C++ code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.php",
      value: `// Type your PHP code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.rb",
      value: `# Type your Ruby code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.cr",
      value: `# Type your Ruby code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.go",
      value: `// Type your Go code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.swift",
      value: `// Type your Swift code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.kt",
      value: `// Type your Kotlin code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.rs",
      value: `// Type your Rust code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.ts",
      value: `// Type your TypeScript code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.cs",
      value: `// Type your C# code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.sh",
      value: `# Type your Bash script here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.lua",
      value: `-- Type your Lua code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.pl",
      value: `# Type your Perl code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.m",
      value: `// Type your Objective-C code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.scala",
      value: `// Type your Scala code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.vb",
      value: `' Type your Visual Basic code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.dpr",
      value: `// Type your Delphi code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.m",
      value: `% Type your MATLAB code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.tcl",
      value: `# Type your Tcl code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.R",
      value: `# Type your R code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.fs",
      value: `// Type your F# code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.dart",
      value: `// Type your Dart code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.ex",
      value: `# Type your Elixir code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.hs",
      value: `-- Type your Haskell code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.jl",
      value: `# Type your Julia code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.sawa",
      value: `# Type your Sawa code here\n`
    },
    {
      locate: "C:\\Users\\Username\\Documents\\test\\index.pl",
      value: `# Type your Perl code here\n`
    }
  ]);

  var fileIcon = (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
	<path fill="none" stroke="#cad3f5" strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5v6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h4.01m-.01 0l5 5h-4a1 1 0 0 1-1-1z"></path>
</svg>)

  const newTab = (fileData) => {
    if (!maestroTab.some((maest => maest.locate === fileData.locate))) {
      return setMaestroTab([...maestroTab, {
        locate: fileData.locate
      }])
    }
  }

  const changeCode = (newCode) => {
    if (activeTab && activeTab.locate) {
      const updatedFiles = files.map((file) =>
        file.locate === activeTab.locate ? { ...file, value: newCode } : file
      );
      setFiles(updatedFiles);
    }
  }

  const closeTab = (tab, index) => {
    const newMaestro = maestroTab.filter((maest, maindex) => maindex !== index);
    if (activeTab?.locate === tab.locate) {
      if (newMaestro.length > 0) {
        const newActiveTab = newMaestro[newMaestro.length - 1];
        changeFocus(newActiveTab);
      } else {
        changeFocus(null);
      }
    }
    if (newMaestro.length === 0) {
      changeFocus(null);
    }

    setMaestroTab(newMaestro);
  };




  const changeFocus = (maest) => {
    if (maest !== null) {
      setActiveTab({ locate: maest.locate })

      const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
      const name = maest.locate.match(regex)

      const baseExtension = [basicSetup, indentationMarkers(), keymap.of(vscodeKeymap)]


      const fileExtension = String(name).toLowerCase().split('.').pop();
      const langHandler = Lang.get(`.${fileExtension}`);

      if (langHandler) {
        setActiveExtensions([...baseExtension, langHandler.extension.map((d, i) => i === 0 ? d() : d)]);
      } else {
        setActiveExtensions(baseExtension);
      }
    } else {
      setActiveTab(null)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-orange-900 text-white overflow-hidden">
      <div className="p-3 text-lg">Maestro Code</div>
      <div className="w-screen h-screen flex flex-row bg-orange-950">
        <div className='flex flex-col flex-grow h-full w-3/12 p-3'>
          <div className="font-bold text-sm p-2">Directory</div>
          <div className="p-2 flex flex-col overflow-scroll h-full">
            {files.map((fileData, index) => {
              const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
              const name = fileData.locate.match(regex)
              const fileExtension = String(name).toLowerCase().split('.').pop();
              const langHandler = Lang.get(`.${fileExtension}`);
              return <div className='p-2 flex flex-row items-center gap-2' onClick={() => { newTab(fileData); changeFocus({ locate: fileData.locate }) }}>{langHandler?.icon ?? fileIcon} {name}</div>
            })}
          </div>
        </div>
        <div className="h-full w-9/12 flex flex-col">
          <div className='w-full overflow-scroll flex flex-row p-2 gap-1' style={{
            scrollbarWidth: "none"
          }}>
            {maestroTab.map((maest, index) => {
              const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
              const name = maest.locate.match(regex)
              const fileExtension = String(name).toLowerCase().split('.').pop();
              const langHandler = Lang.get(`.${fileExtension}`);
              return <div className='flex flex-row items-center gap-1 px-3 text-sm shadow-2xl bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl'><button className='py-1 flex flex-row items-center gap-1' onClick={() => changeFocus({ locate: maest.locate })}>{langHandler?.icon ?? fileIcon} {name}</button><button className='py-1'><FaTimes size={10} color='white' onClick={() => closeTab(maest, index)} /></button></div>
            })}
          </div>
          <div className="flex-1">
            {activeTab ? (
              <CodeMirror
                width='100%'
                height="100%"
                style={{ height: "100%", width: "100%" }}
                value={files.find((fi) => fi.locate === activeTab.locate)?.value || ""}  // Gunakan find untuk mencari file aktif dan pastikan ada value
                extensions={activeExtensions}
                theme={monokai}
                className="text-left w-full h-full overflow-scroll scrollbar-thin scrollbar-thumb-gray-950 scrollbar-track-black"
                onChange={(value) => changeCode(value)} // Ambil value dari editor dan kirim ke changeCode
              />
            ) : (
              <div className='w-full h-full flex justify-center items-center font-semibold'>Tidak ada file yang dibuka</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor;