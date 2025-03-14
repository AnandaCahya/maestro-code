import React, { useEffect, useRef, useState } from 'react';
import CodeMirror, { keymap, highlightActiveLine } from '@uiw/react-codemirror'; // Bahasa JavaScript
import { monokai } from '@uiw/codemirror-theme-monokai';
import { FaFile, FaTerminal, FaTimes } from 'react-icons/fa';
import { basicSetup } from 'codemirror';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { vscodeKeymap } from "@replit/codemirror-vscode-keymap";
import Lang from './modules/lang';
import { lintGutter } from '@codemirror/lint';
import TerminalComponent from './components/TerminalComponent';
const { ipcRenderer } = window.require("electron");

function CodeEditor() {
  const [maestroTab, setMaestroTab] = useState([{ type: "terminal" }])
  const [activeTab, setActiveTab] = useState(null)

  const [activeExtensions, setActiveExtensions] = useState([basicSetup, indentationMarkers(), keymap.of(vscodeKeymap)])
  const [files, setFiles] = useState([]);
  const [values, setValues] = useState([]);

  var fileIcon = (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
    <path fill="none" stroke="#cad3f5" strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5v6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h4.01m-.01 0l5 5h-4a1 1 0 0 1-1-1z"></path>
  </svg>)

  const newTab = (maest) => {
    if (maest.path || maest.type === "code") {
      if (!maestroTab.some((ma => ma.path === maest.path))) {
        return setMaestroTab([...maestroTab, {
          path: maest.path,
          type: "code"
        }])
      }
    } else if (maest.type === "terminal") {
      if (!maestroTab.some((ma => ma.type === "terminal"))) {
        return setMaestroTab([...maestroTab, {
          type: "terminal"
        }])
      }
    }
  }


  const changeCode = (newCode) => {
    if (activeTab && activeTab.path) {
      const newValues = values.map(x => {
        if (x.path === activeTab.path) {
          x.value = newCode
        }
        return x
      })
      setValues(newValues)
      //   ipcRenderer.invoke('save-file', {
      //     filePath: activeTab.path,
      //     newCode: newCode,
      //   }).then((response) => {
      //     if (response.success) {
      //       console.log('File berhasil disimpan');
      //     } else {
      //       console.error('Gagal menyimpan file:', response.error);
      //     }
      //   });
    }
  };

  const closeTab = (tab, index) => {
    const newMaestro = maestroTab.filter((maest, maindex) => maindex !== index);
    if (activeTab?.path === tab.path) {
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
      if (maest.type === "code" || maest.path) {
        setActiveTab({ path: maest.path, type: "code" })

        ipcRenderer.send("change-focus", { path: maest.path })

        if (!values.find(x => x.path === maest.path)) {
          ipcRenderer.send("request-file", { filePath: maest.path })
        }

        const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
        const name = maest.path.match(regex)

        const baseExtension = [basicSetup, indentationMarkers(), keymap.of(vscodeKeymap), lintGutter(), highlightActiveLine()]


        const fileExtension = String(name).toLowerCase().split('.').pop();
        const langHandler = Lang.get(`.${fileExtension}`);

        if (langHandler && langHandler?.extension) {
          setActiveExtensions([langHandler.extension.map((d, i) => i === 0 ? d() : d), ...baseExtension]);
        } else {
          setActiveExtensions(baseExtension);
        }
      } else if (maest.type === "terminal") {
        setActiveTab({ type: "terminal" })
      }
    } else {
      setActiveTab(null)
    }
  }

  const fileList = (files) => {
    const folders = files.filter(fileData => fileData.type === "folder");
    const filesList = files.filter(fileData => fileData.type === "file");

    const sortedFilesAndFolders = [...folders, ...filesList];

    return sortedFilesAndFolders.map((fileData, index) => {
      const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
      const name = fileData.path.match(regex);
      const fileExtension = String(name).toLowerCase().split('.').pop();
      const langHandler = Lang.get(`.${fileExtension}`);

      if (fileData.type === "file" && name) {
        var change = values.find(v => v.path === fileData.path)
        change = change ? change.value !== change.oldValue ? true : false : false
        return (
          <div
            className={`p-2 flex flex-row items-center gap-2 ${change ? "text-green-400" : ""}`}
            onClick={() => { newTab(fileData); changeFocus({ path: fileData.path }) }}
            key={index}
          >
            {langHandler?.icon ?? fileIcon} {name}
          </div>
        );
      } else if (fileData.type === "folder" && name) {
        return (
          <Folder
            key={index}
            name={name}
            path={fileData.path}
            child={fileData.children}
            isOpen={folderStates[fileData.path]}
            toggleFolder={toggleFolder}
          />
        );
      }
      return null;
    });
  }

  ipcRenderer.on("receive-file", async (event, data) => {
    console.log("File:", data)
    const newValue = [...values] // Membuat array baru
    newValue.push(data)
    setValues(newValue)
  })

  ipcRenderer.on('project-opened', async (event, data) => {
    console.log('Project Path:', data.folderPath)
    console.log('Project Files:', data.fileList)
    await setFiles(data.fileList)
  })

  const [folderStates, setFolderStates] = useState({});

  const toggleFolder = (folderPath) => {
    setFolderStates(prevState => ({
      ...prevState,
      [folderPath]: !prevState[folderPath],
    }));
  };

  const Folder = ({ name, path, child, isOpen, toggleFolder }) => {
    return (
      <div className='flex flex-col justify-center gap-1'>
        <div
          className={`p-2 flex flex-row items-center gap-2 ${isOpen ? "border-l border-orange-900" : ""}`}
          onClick={() => toggleFolder(path)} // Gunakan toggleFolder untuk merubah status
        >
          {name}
        </div>
        {isOpen && child?.length !== 0 ? (
          <div className='pl-4 flex flex-col gap-1 border border-l border-orange-900'>
            {fileList(child)} {/* Render children files/folders */}
          </div>
        ) : null}
      </div>
    );
  };

  const [leftWidth, setLeftWidth] = useState(20); // Lebar kiri dalam persen (misalnya 25% dari layar)
  const resizerRef = useRef(null);

  const handleMouseDown = (e) => {
    const startX = e.clientX;
    const startLeftWidth = leftWidth;

    const handleMouseMove = (e) => {
      const diffX = e.clientX - startX;
      const newLeftWidth = Math.min(50, Math.max(10, startLeftWidth + (diffX / window.innerWidth) * 100)); // Batas antara 10% dan 50%
      setLeftWidth(newLeftWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col h-screen bg-orange-900 text-white overflow-hidden">
      <div className="p-3 text-lg">Maestro Code</div>
      <div className="w-screen h-screen flex flex-row bg-orange-950">
        <div className='flex flex-col flex-grow h-full'>
          <div className="flex flex-col overflow-scroll h-full gap-2 bg-orange-900 border-t-4 border-orange-950" style={{ scrollbarWidth: "none" }}>
            <button className='p-4 hover:bg-orange-900'><FaFile size={20} /></button>
            <button className='p-4 hover:bg-orange-900' onClick={() => { newTab({ type: "terminal" }); changeFocus({ type: "terminal" }) }}><FaTerminal size={20} /></button>
          </div>
        </div>
        <div className="flex flex-col flex-grow h-full"
          style={{ flexBasis: 'auto', maxHeight: 'calc(100vh - 60px)', width: `${leftWidth}%` }}
        >
          <div
            className="w-full flex flex-row p-4 z-10"
            style={{ maxHeight: "80px" }}
          >Directory</div>
          <div className="file-tree-container p-2 flex flex-col overflow-scroll" style={{ scrollbarWidth: "none", height: "calc(100% - 80px)" }}>
            {files?.length > 0 ? fileList(files) : null}
          </div>
        </div>
        <div
          ref={resizerRef}
          className="cursor-ew-resize bg-gray-500 w-2 h-full"
          onMouseDown={handleMouseDown}
        />
        <div className="flex flex-col flex-grow h-full p-3" style={{ width: `${100 - leftWidth}%` }}>
          {/* Tab List */}
          <div
            className="w-full overflow-scroll flex flex-row p-2 gap-1 z-10"
            style={{ scrollbarWidth: "none", maxHeight: "60px" }} // Example fixed height, adjust as needed
          >
            {maestroTab.map((maest, index) => {
              if (maest.type === "code") {
                const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
                const name = maest.path.match(regex);
                const fileExtension = String(name).toLowerCase().split('.').pop();
                const langHandler = Lang.get(`.${fileExtension}`);
                return (
                  <div className="flex flex-row items-center gap-1 px-3 text-sm shadow-2xl bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl">
                    <button className="py-1 flex flex-row items-center gap-1" onClick={() => changeFocus({ path: maest.path })}>
                      {langHandler?.icon ?? fileIcon} {name}
                    </button>
                    <button className="py-1">
                      <FaTimes size={10} color="white" onClick={() => closeTab(maest, index)} />
                    </button>
                  </div>
                )
              } else if (maest.type === "terminal") {
                return (
                  <div className="flex flex-row items-center gap-1 px-3 text-sm shadow-2xl bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl">
                    <button className="py-1 flex flex-row items-center gap-1" onClick={() => changeFocus({ type: "terminal" })}>
                      Terminal
                    </button>
                    <button className="py-1">
                      <FaTimes size={10} color="white" onClick={() => closeTab(maest, index)} />
                    </button>
                  </div>
                )
              }
            })}
          </div>

          {/* CodeMirror Container */}
          <div className="flex-1 w-full flex-grow overflow-auto">
            {activeTab ? (
              activeTab?.type === "code" ? (
                /\.(png|jpg|jpeg|gif|bmp)$/i.test(activeTab.path) ? (
                  <img
                    src={values.find((fi) => fi.path === activeTab.path)?.value || ""}
                    alt="Image"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <CodeMirror
                    className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-950 scrollbar-track-black"
                    style={{ height: "calc(100% - 50px)", width: "100%" }}
                    value={values.find((fi) => fi.path === activeTab.path)?.value || ""}
                    extensions={activeExtensions}
                    theme={monokai}
                    onChange={(value) => changeCode(value)}
                  />
                )
              ) : activeTab?.type === "terminal" ? (
                <TerminalComponent />
              ) : null
            ) : (
              <div className="w-full h-full flex justify-center items-center font-semibold">
                Tidak ada file yang dibuka
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor;