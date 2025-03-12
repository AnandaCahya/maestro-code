import { langs } from '@uiw/codemirror-extensions-langs';

import { javascriptLinterUnusedVariable, pythonLinterUnusedVariable } from "./lint"

const Lang = new Map([
    [".apl", { extension: [langs.apl], name: "apl" }],
    [".asciiArmor", {
        extension: [langs.asciiArmor], name: "asciiArmor", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <path fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round" d="m3 15l1.714-4M5.78 8.5L9 1l6 14M1 8.5h7M1 11h6"></path>
        </svg>)
    }],
    [".asterisk", { extension: [langs.asterisk], name: "asterisk" }],
    [".c", {
        extension: [langs.c], name: "c", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M4.056 12.952a7.05 7.05 0 0 0 9.944 0l-1.79-1.783a4.513 4.513 0 0 1-6.364 0a4.47 4.47 0 0 1 0-6.338a4.513 4.513 0 0 1 6.364 0l.895-.891l.895-.892a7.05 7.05 0 0 0-9.944 0a6.98 6.98 0 0 0 0 9.904" clipRule="evenodd"></path>
        </svg>)
    }],
    [".cs", {
        extension: [langs.csharp], name: "csharp", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <path fill="none" stroke="#8aadf4" d="M6.666 1.01a1 1 0 0 1 .822 1.15L7.18 3.999h2.972l.36-2.165a1 1 0 0 1 1.971.328l-.303 1.837H14a.999.999 0 1 1 0 2h-2.153l-.666 4H13a.999.999 0 1 1 0 2h-2.153l-.36 2.166a1 1 0 0 1-1.971-.328l.306-1.834H5.847l-.36 2.165a1 1 0 0 1-1.971-.328L3.819 12H2a.999.999 0 1 1 0-2h2.153l.666-4H3a.999.999 0 1 1 0-2h2.153l.36-2.166a1 1 0 0 1 1.15-.822Zm.18 4.988l-.665 4h2.972l.666-4Z"></path>
        </svg>)
    }],
    [".scala", {
        extension: [langs.scala], name: "scala", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <path fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round" d="m2.5 2.48l11-.98v3.04l-11 1zm0 5l11-.98v3.04l-11 1zm0 5l11-.98v3.04l-11 1z"></path>
        </svg>)
    }],
    [".solidity", {
        extension: [langs.solidity], name: "solidity", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <path fill="none" stroke="#c6a0f6" strokeLinecap="round" strokeLinejoin="round" d="m3 11.5l2.5 4l2.5-4l2.5 4l2.5-4l-2.5-4l-2.5 4m2.5 4h-5m7.5-4H3m10-7l-2.5-4l-2.5 4l-2.5-4l-2.5 4l2.5 4l2.5-4M5.5.5h5M3 4.5h10"></path>
        </svg>)
    }],
    [".kt", {
        extension: [langs.kotlin], name: "kotlin", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path stroke="#c6a0f6" d="M2.5 13.5h11L8 8"></path>
                <path stroke="#f5a97f" d="M8.03 2.5h5.47l-8 8"></path>
                <path stroke="#ed8796" d="M2.5 13.5V8"></path>
                <path stroke="#7dc4e4" d="M8 2.5H2.5V8l3-2.5"></path>
            </g>
        </svg>)
    }],
    [".shader", { extension: [langs.shader], name: "shader", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#c6a0f6" strokeLinecap="round" strokeLinejoin="round" d="M6.41 12c0 .9-.47 1.72-1.23 2.17c-.76.44-1.7.44-2.45 0A2.5 2.5 0 0 1 1.5 12c0-1.38 1.1-2.5 2.46-2.5A2.48 2.48 0 0 1 6.4 12h0Zm3.78-7.23A2.85 2.85 0 0 0 4.6 3.6a2.9 2.9 0 0 0 1.77 3.5c2.19.88 2.7 1.75 2.43 4.13a2.85 2.85 0 0 0 5.58 1.17a2.9 2.9 0 0 0-1.77-3.5c-2.19-.88-2.7-1.76-2.43-4.13h0Z"></path>
    </svg>) }],
    [".nesC", { extension: [langs.nesC], name: "nesC" }],
    [".m", { extension: [langs.objectiveC], name: "objectiveC" }],
    [".mm", { extension: [langs.objectiveCpp], name: "objectiveCpp" }],
    [".nut", { extension: [langs.squirrel], name: "squirrel" }],
    [".ceylon", { extension: [langs.ceylon], name: "ceylon" }],
    [".dart", { extension: [langs.dart], name: "dart", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#7dc4e4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 14.5h4.5v-3h3V7L9.17 1.64c-.28-.29-.8-.47-1.17-.29L3.5 3.5L1.35 8c-.18.37 0 .88.3 1.17z"></path>
            <path d="M3.5 11V3.5H11m-7.5 0l8 8"></path>
        </g>
    </svg>) }],
    [".cmake", { extension: [langs.cmake], name: "cmake", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#a6da95" d="m6 11.5l-3.5 3H13Z"></path>
            <path stroke="#ed8796" d="m9 1.5l5.5 11l-4.5-2z"></path>
            <path stroke="#8aadf4" d="m1.5 12.5l6-5l-.5-6Z"></path>
        </g>
    </svg>) }],
    [".cobol", { extension: [langs.cobol], name: "cobol", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M6.74 2.24c.32-1.32 2.2-1.32 2.52 0a1.3 1.3 0 0 0 1.93.8c1.15-.7 2.48.62 1.77 1.77a1.3 1.3 0 0 0 .8 1.93c1.32.32 1.32 2.2 0 2.52a1.3 1.3 0 0 0-.8 1.93c.7 1.15-.62 2.48-1.77 1.77a1.3 1.3 0 0 0-1.93.8c-.32 1.32-2.2 1.32-2.52 0a1.3 1.3 0 0 0-1.93-.8c-1.15.7-2.48-.62-1.77-1.77a1.3 1.3 0 0 0-.8-1.93c-1.32-.32-1.32-2.2 0-2.52a1.3 1.3 0 0 0 .8-1.93c-.7-1.15.62-2.48 1.77-1.77a1.3 1.3 0 0 0 1.93-.8M10 6.5a2.5 2.5 0 1 0 0 3"></path>
    </svg>)}],
    [".lisp", { extension: [langs.commonLisp], name: "commonLisp", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round">
            <path d="M.5 5.06v6.07C.5 12.41.82 13 2.27 13h5.6c1.04 0 1.63-.51 1.63-1.62c0-.85-.2-1.88-1.5-1.88h-.36C6.4 9.5 6 8.77 6 7.75C6 6.81 6.8 6 7.49 6h2.68"></path>
            <path d="M3.5 10.5V4.99C3.5 3.89 3.62 3 5 3h9c.97 0 1.5.99 1.5 1.63c.12 1.55-.98 1.62-2.1 2.16c-.58.26-1.4.52-1.4.98V11"></path>
        </g>
    </svg>) }],
    [".cr", { extension: [langs.crystal], name: "crystal", icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 100 100">
        <g fill="none" stroke="#80e0f0" stroke-linecap="round" stroke-linejoin="round">
            <path d="M50 10L65 35L50 60L35 35Z" stroke-width="4"/>
            <path d="M35 35L50 60L15 50L30 30Z" stroke-width="4"/>
        </g>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#80e0f0" stroke-width="5"/>
    </svg>
    ) }],
    [".cypher", { extension: [langs.cypher], name: "cypher" }],
    [".d", { extension: [langs.d], name: "d", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#ee99a0" strokeLinecap="round" strokeLinejoin="round" d="M15 3.5a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m-8-1c1.84 0 3.47.9 4.47 2.29a2 2 0 1 1 1.01 3.71a5.5 5.5 0 0 1-5.48 5H1.5v-11Zm-3.5 2v7H7a3.5 3.5 0 0 0 0-7z"></path>
    </svg>) }],
    [".diff", { extension: [langs.diff], name: "diff", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#a6da95" d="M10 6H6m2-2v4"></path>
            <path stroke="#ed8796" d="M10 11.5H6"></path>
            <path stroke="#cad3f5" d="M6.1.5h3.8c1.44 0 2.6 1.09 2.6 2.43v10.14c0 1.34-1.16 2.43-2.6 2.43H6.1c-1.44 0-2.6-1.09-2.6-2.43V2.93C3.5 1.6 4.66.5 6.1.5"></path>
        </g>
    </svg>) }],
    [".dtd", { extension: [langs.dtd], name: "dtd" }],
    [".dylan", { extension: [langs.dylan], name: "dylan" }],
    [".ebnf", { extension: [langs.ebnf], name: "ebnf" }],
    [".ecl", { extension: [langs.ecl], name: "ecl" }],
    [".eiffel", { extension: [langs.eiffel], name: "eiffel" }],
    [".elm", { extension: [langs.elm], name: "elm", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M3 1.5h10c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3c0-.83.67-1.5 1.5-1.5M2 2l12 12M8.5 1.5l6 6M11 11l3.5-3.5m-10-3h6.25M2 14l9-9"></path>
    </svg>) }],
    [".factor", { extension: [langs.factor], name: "factor" }],
    [".fcl", { extension: [langs.fcl], name: "fcl" }],
    [".forth", { extension: [langs.forth], name: "forth" }],
    [".fortran", { extension: [langs.fortran], name: "fortran", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#c6a0f6" strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.5v-1l-1-1v-3h2l1 2h1v-6h-1l-1 2h-2v-4h5l1 3h1v-5h-11v1l1 1v9l-1 1.25v.75z"></path>
    </svg>) }],
    [".gas", { extension: [langs.gas], name: "gas" }],
    [".gherkin", { extension: [langs.gherkin], name: "gherkin" }],
    [".groovy", { extension: [langs.groovy], name: "groovy", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#7dc4e4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.68 5.38c.4.19.54.68 1.53 3.25c1 2.57-.92 4.07-.92 4.07s-6.73 2.47-6.73 1.63c-.18-.92-1.92-2.08-1.92-2.08s-.52-.63.06-.75c5.89-1.27 6.96-.61 7.3-2"></path>
            <path d="M7.38 10.63C2.62 10.88 2.48 8.08 2.5 8C3.6 4.6 9.24.91 10.8 1.58C14.07 3.04 9.2 8.96 7 8.5c-4.02-.83 1.5-4 1.5-4"></path>
        </g>
    </svg>) }],
    [".haskell", { extension: [langs.haskell], name: "haskell", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#c6a0f6" strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5h3m-1.5 3h1.5m-10 6l2.5-5l-2.5-5H8l5.6 10h-2.53l-1.52-2.92L8 13.5zm-5 0l2.5-5l-2.5-5H3l2.5 5l-2.5 5z"></path>
    </svg>) }],
    [".haxe", { extension: [langs.haxe], name: "haxe", icon:(<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 1.5H5l3 1.75l3-1.75h3.5V5l-1.75 3l1.75 3v3.5H11l-3-1.75l-3 1.75H1.5V11l1.75-3L1.5 5z"></path>
            <path d="m12.65 8.35l-4.3 4.3a.5.5 0 0 1-.7 0l-4.3-4.3a.5.5 0 0 1 0-.7l4.3-4.3c.2-.2.5-.2.7 0l4.3 4.3c.2.2.2.5 0 .7"></path>
        </g>
    </svg>) }],
    [".http", { extension: [langs.http], name: "http", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 8A6.5 6.5 0 0 1 8 14.5A6.5 6.5 0 0 1 1.5 8A6.5 6.5 0 0 1 8 1.5A6.5 6.5 0 0 1 14.5 8"></path>
            <path d="M8 1.5c1.67 2 2.5 4.17 2.5 6.5s-.83 4.5-2.5 6.5m0-13A9.96 9.96 0 0 0 5.5 8c0 2.33.83 4.5 2.5 6.5m-5.5-4h11m-11-5h11"></path>
        </g>
    </svg>) }],
    [".idl", { extension: [langs.idl], name: "idl" }],
    [".jinja2", { extension: [langs.jinja2], name: "jinja2", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round" d="M1.5 1.5c3.78 1.03 8.02 1.54 13 0L13 5c-3.5.75-6.5.75-10 0zm0 6.09C6 8.75 10 8.75 14.5 7.5m-9-1.52v8.52m-3 0h4m3 0h4m-3-8.52v8.52M3.5 8v6.5m9-6.5v6.5"></path>
    </svg>) }],
    [".mma", { extension: [langs.mathematica], name: "mathematica" }],
    [".mbox", { extension: [langs.mbox], name: "mbox" }],
    [".mirc", { extension: [langs.mirc], name: "mirc" }],
    [".modelica", { extension: [langs.modelica], name: "modelica" }],
    [".mscgen", { extension: [langs.mscgen], name: "mscgen" }],
    [".mumps", { extension: [langs.mumps], name: "mumps" }],
    [".nsis", { extension: [langs.nsis], name: "nsis" }],
    [".ntriples", { extension: [langs.ntriples], name: "ntriples" }],
    [".octave", { extension: [langs.octave], name: "octave" }],
    [".oz", { extension: [langs.oz], name: "oz" }],
    [".pig", { extension: [langs.pig], name: "pig" }],
    [".properties", { extension: [langs.properties], name: "properties", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#cad3f5" strokeLinecap="round" strokeLinejoin="round" d="M8 1.5c-.87 0-1.17 1.32-2.03 1.63c-.86.3-2.17-.68-2.84 0c-.68.67.3 1.98 0 2.84S1.5 7.13 1.5 8s1.32 1.17 1.63 2.03c.3.86-.68 2.17 0 2.85c.67.67 1.98-.3 2.84 0c.85.3 1.16 1.62 2.03 1.62s1.17-1.32 2.03-1.63c.86-.3 2.17.68 2.85 0c.67-.67-.3-1.98 0-2.84c.3-.85 1.62-1.16 1.62-2.03s-1.32-1.17-1.63-2.03c-.3-.86.68-2.17 0-2.84c-.67-.68-1.98.3-2.84 0S8.87 1.5 8 1.5m0 9a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5"></path>
    </svg>) }],
    [".proto", { extension: [langs.protobuf], name: "protobuf", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#ed8796" d="m.5 8.5l3-6h3l-3 6"></path>
            <path stroke="#8aadf4" d="M6.5 13.5h-3l-3-5l1.36-2.73z"></path>
            <path stroke="#eed49f" d="m15.5 7.5l-3 6h-3l3-6"></path>
            <path stroke="#a6da95" d="M9.5 2.5h3l3 5l-1.36 2.73z"></path>
        </g>
    </svg>) }],
    [".puppet", { extension: [langs.puppet], name: "puppet" }],
    [".q", { extension: [langs.q], name: "q" }],
    [".sas", { extension: [langs.sas], name: "sas" }],
    [".sass", { extension: [langs.sass], name: "sass", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#f5bde6" strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.38c1.85 1.07 3.35.74 4.83-.2c1.5-.95 2.7-2.78 1.3-4.15c-.7-.68-3.25-.8-5.62.19c-2.36.99-4.59 3.02-4.74 4.11c-.31 2.19 3.15 2.88 3.64 4.23s.28 1.98-.2 2.83c-.5.85-1.96 1.62-2.8.68c-.83-.95 1.67-2.75 2.98-3.25c1.3-.5 3.1-.4 3.69.25c.58.64-.07 1.79-.03 1.79"></path>
    </svg>) }],
    [".liquid", { extension: [langs.liquid], name: "liquid", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M15.5 4.49c-.594 0-1.183-.084-1.7-.365a4.6 4.6 0 0 0-4.434 0c-.93.52-2.08.522-3.013.005a4.2 4.2 0 0 0-2.21-.576a4.2 4.2 0 0 0-2.24.578A2.8 2.8 0 0 1 .5 4.514m15 3.942c-.594 0-1.183-.085-1.7-.366a4.6 4.6 0 0 0-4.434 0c-.93.52-2.08.522-3.013.005a4.2 4.2 0 0 0-2.21-.576a4.2 4.2 0 0 0-2.24.578A2.8 2.8 0 0 1 .5 8.479m15 3.984c-.594 0-1.183-.084-1.7-.366a4.6 4.6 0 0 0-4.434 0c-.93.52-2.08.522-3.013.005a4.2 4.2 0 0 0-2.21-.575a4.2 4.2 0 0 0-2.24.577a2.8 2.8 0 0 1-1.403.382"></path>
    </svg>) }],
    [".mermaid", { extension: [langs.mermaid], name: "mermaid", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#c6a0f6" strokeLinecap="round" strokeLinejoin="round" d="M1.5 2.5c0 6 2.25 5.75 4 7c.83.67 1.17 2 1 4h3c-.17-2 .17-3.33 1-4c1.75-1.25 4-1 4-7C12 2.5 10 3 8 7C6 3 4 2.5 1.5 2.5"></path>
    </svg>) }],
    [".nix", { extension: [langs.nix], name: "nix", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#7dc4e4" d="M.5 7.5H4m1.39-2L2.05 11"></path>
            <path stroke="#8aadf4" d="M4 1.5L5.5 4m3.5.5H2.55"></path>
            <path stroke="#7dc4e4" d="m12 1.5l-1.5 3m1.01 2.6L8.5 1.5"></path>
            <path stroke="#8aadf4" d="M15.5 8.52L12 8.5m-1.38 2L14 5"></path>
            <path stroke="#7dc4e4" d="m12.5 14.5l-2.5-3m-2.97.02l6.48-.02"></path>
            <path stroke="#8aadf4" d="m4 14.5l1.5-3M4.53 9l2.97 5.5"></path>
        </g>
    </svg>) }],
    [".svelte", { extension: [langs.svelte], name: "svelte", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.86 6.72s1.39-1.98.08-3.87C11.286.763 9.44 1.6 9.44 1.6S6.15 3.35 4.33 4.59c-1.4 1-2.24 2.26-1.03 4.37c1.22 2.1 4.58 1.21 4.58 1.21"></path>
            <path d="M3.14 9.28s-1.39 1.98-.08 3.87c1.31 1.9 3.5 1.24 3.5 1.24s3.29-1.74 5.11-2.98c1.4-1 2.24-2.26 1.03-4.37c-1.22-2.1-4.58-1.21-4.58-1.21M6.3 6.96l4.14-2.56m-4.92 7.25L9.66 9.1"></path>
        </g>
    </svg>)}],
    [".sieve", { extension: [langs.sieve], name: "sieve" }],
    [".smalltalk", { extension: [langs.smalltalk], name: "smalltalk" }],
    [".solr", { extension: [langs.solr], name: "solr" }],
    [".sparql", { extension: [langs.sparql], name: "sparql" }],
    [".spreadsheet", { extension: [langs.spreadsheet], name: "spreadsheet" }],
    [".stex", { extension: [langs.stex], name: "stex" }],
    [".textile", { extension: [langs.textile], name: "textile" }],
    [".tiddlyWiki", { extension: [langs.tiddlyWiki], name: "tiddlyWiki" }],
    [".tiki", { extension: [langs.tiki], name: "tiki" }],
    [".troff", { extension: [langs.troff], name: "troff" }],
    [".ttcn", { extension: [langs.ttcn], name: "ttcn" }],
    [".turtle", { extension: [langs.turtle], name: "turtle" }],
    [".velocity", { extension: [langs.velocity], name: "velocity" }],
    [".verilog", { extension: [langs.verilog], name: "verilog", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#cad3f5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7c0-1.1.9-2 2-2"></path>
            <path d="M5.5 5.5h5v5h-5zm8.5 0h1.5M14 8h1.5M14 10.5h1.5M.5 5H2M.5 7.5H2M.5 10H2m3.5-8V.5M8 2V.5M10.5 2V.5m-5 15V14M8 15.5V14m2.5 1.5V14"></path>
        </g>
    </svg>) }],
    [".vhdl", { extension: [langs.vhdl], name: "vhdl" }],
    [".webIDL", { extension: [langs.webIDL], name: "webIDL" }],
    [".xQuery", { extension: [langs.xQuery], name: "xQuery" }],
    [".yacas", { extension: [langs.yacas], name: "yacas" }],
    [".z80", { extension: [langs.z80], name: "z80" }],
    [".wast", { extension: [langs.wast], name: "wast" }],
    [".js", { extension: [langs.javascript], name: "javascript", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#eed49f" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 11a1.5 1.5 0 0 0 3 0V7.5m5 1.25c0-.69-.537-1.25-1.2-1.25h-.6c-.663 0-1.2.56-1.2 1.25S10.037 10 10.7 10h.6c.663 0 1.2.56 1.2 1.25s-.537 1.25-1.2 1.25h-.6c-.663 0-1.2-.56-1.2-1.25"></path>
            <path d="M4 1.5h8c1.385 0 2.5 1.115 2.5 2.5v8c0 1.385-1.115 2.5-2.5 2.5H4A2.495 2.495 0 0 1 1.5 12V4c0-1.385 1.115-2.5 2.5-2.5"></path>
        </g>
    </svg>) }],
    [".jsx", { extension: [langs.jsx], name: "jsx", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#91d7e3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10.8c4.14 0 7.5-1.25 7.5-2.8S12.14 5.2 8 5.2S.5 6.45.5 8s3.36 2.8 7.5 2.8"></path>
            <path d="M5.52 9.4c2.07 3.5 4.86 5.72 6.23 4.95c1.37-.78.8-4.24-1.27-7.75C8.41 3.1 5.62.88 4.25 1.65c-1.37.78-.8 4.24 1.27 7.75"></path>
            <path d="M5.52 6.6c-2.07 3.5-2.64 6.97-1.27 7.75c1.37.77 4.16-1.45 6.23-4.95s2.64-6.97 1.27-7.75C10.38.88 7.59 3.1 5.52 6.6"></path>
            <path d="M8.5 8a.5.5 0 0 1-.5.5a.5.5 0 0 1-.5-.5a.5.5 0 0 1 .5-.5a.5.5 0 0 1 .5.5"></path>
        </g>
    </svg>) }],
    [".ts", { extension: [langs.typescript], name: "typescript", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 1.5h8A2.5 2.5 0 0 1 14.5 4v8a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 12V4A2.5 2.5 0 0 1 4 1.5"></path>
            <path d="M12.5 8.75c0-.69-.54-1.25-1.2-1.25h-.6c-.66 0-1.2.56-1.2 1.25S10.04 10 10.7 10h.6c.66 0 1.2.56 1.2 1.25s-.54 1.25-1.2 1.25h-.6c-.66 0-1.2-.56-1.2-1.25m-3-3.75v5M5 7.5h3"></path>
        </g>
    </svg>) }],
    [".tsx", { extension: [langs.tsx], name: "tsx", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 11.3c4.14 0 7.5-1.28 7.5-2.86S12.14 5.58 8 5.58S.5 6.86.5 8.44s3.36 2.87 7.5 2.87Z"></path>
            <path d="M5.52 9.87c2.07 3.6 4.86 5.86 6.23 5.07c1.37-.8.8-4.34-1.27-7.93S5.62 1.16 4.25 1.95s-.8 4.34 1.27 7.92"></path>
            <path d="M5.52 7.01c-2.07 3.59-2.64 7.14-1.27 7.93s4.16-1.48 6.23-5.07c2.07-3.58 2.64-7.13 1.27-7.92c-1.37-.8-4.16 1.47-6.23 5.06"></path>
            <path d="M8.5 8.44a.5.5 0 0 1-.5.5a.5.5 0 0 1-.5-.5a.5.5 0 0 1 .5-.5a.5.5 0 0 1 .5.5"></path>
        </g>
    </svg>) }],
    [".vue", { extension: [langs.vue], name: "vue", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#a6da95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1.5h5.44L8 4.56L9.56 1.5H15l-6.99 13z"></path>
            <path d="M12.05 1.73L8 9.28L3.95 1.73"></path>
        </g>
    </svg>) }],
    [".angular", { extension: [langs.angular], name: "angular", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#ed8796" d="m8 1l6.5 2l-1 9.5L8 15l-5.5-2.5l-1-9.5z"></path>
            <path stroke="#cad3f5" d="m4.5 10.5l3.5-7l3.5 7m-5.796-2h4.635"></path>
        </g>
    </svg>) }],
    [".json", { extension: [langs.json], name: "json", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#eed49f" strokeLinecap="round" strokeLinejoin="round" d="M4.5 2.5H4c-.75 0-1.5.75-1.5 1.5v2c0 1.1-1 2-1.83 2c.83 0 1.83.9 1.83 2v2c0 .75.75 1.5 1.5 1.5h.5m7-11h.5c.75 0 1.5.75 1.5 1.5v2c0 1.1 1 2 1.83 2c-.83 0-1.83.9-1.83 2v2c0 .74-.75 1.5-1.5 1.5h-.5m-6.5-3a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m3 0a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m3 0a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1"></path>
    </svg>)}],
    [".html", { extension: [langs.html], name: "html", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#f5a97f" d="M1.5 1.5h13L13 13l-5 2l-5-2z"></path>
            <path stroke="#cad3f5" d="M11 4.5H5l.25 3h5.5l-.25 3l-2.5 1l-2.5-1l-.08-1"></path>
        </g>
    </svg>) }],
    [".css", { extension: [langs.css], name: "css", icon:(<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#8aadf4" d="M1.5 1.5h13L13 13l-5 2l-5-2z"></path>
            <path stroke="#cad3f5" d="M5 4.5h6l-.5 6l-2.5 1l-2.5-1l-.08-1m1.08-2h4"></path>
        </g>
    </svg>) }],
    [".py", { extension: [langs.python, pythonLinterUnusedVariable()], name: "python", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#8aadf4" d="M8.5 5.5h-3m6 0V3c0-.8-.7-1.5-1.5-1.5H7c-.8 0-1.5.7-1.5 1.5v2.5H3c-.8 0-1.5.7-1.5 1.5v2c0 .8.7 1.5 1.48 1.5"></path>
            <path stroke="#eed49f" d="M10.5 10.5h-3m-3 0V13c0 .8.7 1.5 1.5 1.5h3c.8 0 1.5-.7 1.5-1.5v-2.5H13c.8 0 1.5-.7 1.5-1.5V7c0-.8-.7-1.5-1.48-1.5H11.5c0 1.5 0 2-1 2h-2"></path>
            <path stroke="#8aadf4" d="M2.98 10.5H4.5c0-1.5 0-2 1-2h2m0-5"></path>
        </g>
    </svg>)}],
    [".md", { extension: [langs.markdown], name: "markdown", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#7dc4e4" strokeLinecap="round" strokeLinejoin="round" d="m9.25 8.25l2.25 2.25l2.25-2.25M3.5 11V5.5l2.04 3l1.96-3V11m4-.5V5M1.65 2.5h12.7c.59 0 1.15.49 1.15 1v9c0 .51-.56 1-1.15 1H1.65c-.59 0-1.15-.49-1.15-1V3.58c0-.5.56-1.08 1.15-1.08"></path>
    </svg>) }],
    [".xml", { extension: [langs.xml], name: "xml", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5L1 8l3.5 3.5m7-7L15 8l-3.5 3.5M9.5 2l-3 12"></path>
    </svg>) }],
    [".sql", { extension: [langs.sql], name: "sql" }],
    [".mysql", { extension: [langs.mysql], name: "mysql" }],
    [".pgsql", { extension: [langs.pgsql], name: "pgsql" }],
    [".java", { extension: [langs.java], name: "java", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#cad3f5" d="M10.73 8.41c.57 3 1.59 5.83 2.77 7.09c-6.63-3.45-9.76-1.75-10.5 0c-.66-3.4-.54-5.74.09-7.78"></path>
            <path stroke="#ed8796" d="M8.5 7c.63.34 1.82 1.07 2.24 1.41c-.54-2.9-.64-5.96-.74-7.91c-2.13.58-5.73 1.98-6.9 7.22c.52-.69 1.72-1.05 2.4-1.22"></path>
            <path stroke="#ed8796" d="M5.5 7A1.5 1.5 0 0 0 7 8.5A1.5 1.5 0 0 0 8.5 7A1.5 1.5 0 0 0 7 5.5A1.5 1.5 0 0 0 5.5 7"></path>
        </g>
    </svg>) }],
    [".rust", { extension: [langs.rust], name: "rust", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 9.5Q8 13.505.5 9.5l1-1l-1-2l2-.5V4.5h2l.5-2l1.5 1l1.5-2l1.5 2l1.5-1l.5 2h2V6l2 .5l-1 2z"></path>
            <path d="M6.5 7.5a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1m5 0a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1M4 11.02c-.67.37-1.5.98-1.5 2.23s1.22 1.22 2 1.25v-2M12 11c.67.37 1.5 1 1.5 2.25s-1.22 1.22-2 1.25v-2"></path>
        </g>
    </svg>) }],
    [".cpp", { extension: [langs.cpp], name: "cpp", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M2.556 12.952a7.05 7.05 0 0 0 9.944 0l-1.79-1.783a4.513 4.513 0 0 1-6.364 0a4.47 4.47 0 0 1 0-6.338a4.513 4.513 0 0 1 6.364 0l.895-.891l.895-.892a7.05 7.05 0 0 0-9.944 0a6.98 6.98 0 0 0 0 9.904" clipRule="evenodd"></path>
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M7.5 6v4M5.514 8h3.999m3.973-2v4M11.5 8h4"></path>
    </svg>) }],
    [".clike", { extension: [langs.clike], name: "clike" }],
    [".php", { extension: [langs.php], name: "php", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M.5 12.5v.74c0 .76.774 1.26 1.5 1.26c.938 0 1.5-.5 1.5-1.255V6c0-1.715 1.494-3.478 3.65-3.501c2.344 0 3.85 1.558 3.85 3c.166 2.99-1.422 4.137-3.504 5v4h8.002V9c.041-.635-.56-1.844-1.367-2.5c-.937-.692-2.073-.997-3.131-1m.5 9v-3M6 6.5a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1"></path>
    </svg>) }],
    [".go", { extension: [langs.go], name: "go", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#7dc4e4" strokeLinecap="round" strokeLinejoin="round" d="m15.48 8.06l-4.85.48m4.85-.48a4.98 4.98 0 0 1-4.54 5.42a5 5 0 1 1 2.95-8.66l-1.7 1.84a2.5 2.5 0 0 0-4.18 2.06c.05.57.3 1.1.69 1.51c.25.27 1 .83 1.78.82c.8-.02 1.58-.25 2.07-.81c0 0 .8-.96.68-1.88M2.5 8.5l-2 .01m1.5 2h1.5m-2-3.99l2-.02"></path>
    </svg>) }],
    [".sh", { extension: [langs.shell], name: "shell", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#a6da95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 15.5c-.7 0-1.5-.8-1.5-1.5V5c0-.7.8-1.5 1.5-1.5h9c.7 0 1.5.8 1.5 1.5v9c0 .7-.8 1.5-1.5 1.5z"></path>
            <path d="m1.2 3.8l3.04-2.5S5.17.5 5.7.5h8.4c.66 0 1.4.73 1.4 1.4v7.73a2.7 2.7 0 0 1-.7 1.75l-2.68 3.51"></path>
            <path d="M6 8.75c0-.69-.54-1.25-1.2-1.25h-.6c-.66 0-1.2.56-1.2 1.25S3.54 10 4.2 10h.6c.66 0 1.2.56 1.2 1.25s-.54 1.25-1.2 1.25h-.6c-.66 0-1.2-.56-1.2-1.25M4.5 6.5v1m0 5v1"></path>
        </g>
    </svg>) }],
    [".lua", { extension: [langs.lua], name: "lua", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#cad3f5" d="M10.5 7A1.5 1.5 0 0 1 9 8.5A1.5 1.5 0 0 1 7.5 7A1.5 1.5 0 0 1 9 5.5A1.5 1.5 0 0 1 10.5 7"></path>
            <path stroke="#8aadf4" d="M7 2.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13m7-2a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3"></path>
        </g>
    </svg>) }],
    [".swift", { extension: [langs.swift], name: "swift", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round" d="M14.34 10.2c.34-1.08 1.1-5.07-4.45-8.62a.48.48 0 0 0-.6.07a.44.44 0 0 0-.02.6c.03.02 2.07 2.5 1.34 5.34c-1.26-.86-6.24-4.81-6.24-4.81L7.25 7.5L1.9 4.05S5.68 8.7 8 10.45c-1.12.4-3.56.82-6.78-1.18a.48.48 0 0 0-.58.06a.44.44 0 0 0-.08.56c.11.18 2.7 4.36 8.14 4.36c1.5 0 2.37-.42 3.08-.77c.43-.2.77-.37 1.14-.37c.93 0 1.54.92 1.54.93c.1.14.27.22.44.21a.46.46 0 0 0 .4-.28c.67-1.55-.49-3.2-.96-3.78h0Z"></path>
    </svg>) }],
    [".tcl", { extension: [langs.tcl], name: "tcl" }],
    [".yaml", { extension: [langs.yaml], name: "yaml", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round" d="M2.5 1.5h3l3 4l3-4h3l-9 13h-3L7 8z"></path>
    </svg>) }],
    [".vb", { extension: [langs.vb], name: "vb" }],
    [".ps1", { extension: [langs.powershell], name: "powershell", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 15.5c-.7 0-1.5-.8-1.5-1.5V5c0-.7.8-1.5 1.5-1.5h9c.7 0 1.5.8 1.5 1.5v9c0 .7-.8 1.5-1.5 1.5z"></path>
            <path d="m1.2 3.8l3.04-2.5S5.17.5 5.7.5h8.4c.66 0 1.4.73 1.4 1.4v7.73a2.7 2.7 0 0 1-.7 1.75l-2.68 3.51M3 8.5l3 2l-3 2m4 0h2"></path>
        </g>
    </svg>) }],
    [".bf", { extension: [langs.brainfuck], name: "brainfuck" }],
    [".styl", { extension: [langs.stylus], name: "stylus" }],
    [".erl", { extension: [langs.erlang], name: "erlang", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 5.5c0-1.25 1-2 2-2s2 .75 2 2z"></path>
            <path d="M13.5 13c.47-.57 1.12-1.24 1.5-2l-2.25-1.25c-.74 1.36-1.76 2.75-3.25 2.75c-2.1 0-3-2.3-3-5h8c.05-1.61-.31-3.45-1-4.5M3 13c-1.08-1.3-1.5-3-1.5-5S2.1 4.24 3 3"></path>
        </g>
    </svg>) }],
    [".nginx", { extension: [langs.nginx], name: "nginx", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#a6da95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 10.5v-5l5 5v-5"></path>
            <path d="M1.5 11.5v-7L8 .5l6.5 4v7l-6.5 4z"></path>
        </g>
    </svg>) }],
    [".pl", { extension: [langs.perl], name: "perl",  icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M12.5 14.5v-3.34c-1-.66-1-1.35-1-2.66m-3 1l.02 2.53l.98 2.47m-4-5v5m9 0V9.23s.17-1.73-1-1.73c0-1.5-.5-6-2.5-6S8.75 4.25 8.75 4.25A3.67 3.67 0 0 0 6.5 7.12v-3.5c0-.63-.85-1.32-1.5-1.32c-.92 0-1.33.59-1.5 1.2H2.25c-.42.11-.75.59-.75 1c0 .5.28 1 .75 1h1.22l.02 3c.01.75.51 1 1.51 1h4.5"></path>
    </svg>) }],
    [".rb", { extension: [langs.ruby], name: "ruby", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#ed8796" strokeLinecap="round" strokeLinejoin="round" d="M1.5 9.06v2.5c.02.86.36 1.61.9 2.15c1.76 1.76 5.71.65 8.84-2.47c3.12-3.13 4.23-7.08 2.47-8.84a3.1 3.1 0 0 0-2.15-.9h-2.5M14.5 4l-.25 10.25L4 14.5m4.39-6.11c2.34-2.35 3.29-5.2 2.12-6.37S6.49 1.8 4.14 4.14C1.8 6.5.85 9.34 2.02 10.51s4.02.22 6.37-2.12M5.5 14.5l.25-3.75L11 11l-.25-5.25l3.75-.25"></path>
    </svg>) }],
    [".pas", { extension: [langs.pascal], name: "pascal" }],
    [".ls", { extension: [langs.livescript], name: "livescript" }],
    [".less", { extension: [langs.less], name: "less", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M4 2.5c-.74 0-1.5.76-1.5 1.5v2c0 1.1-1.1 2-1.83 2c.74 0 1.83.9 1.83 2v2c0 .74.76 1.5 1.5 1.5m1.5-8v5a1 1 0 0 0 1 1H7m4.5-4c0-.69-.59-1-1.25-1h-.5c-.66 0-1.25.56-1.25 1.25S9.09 9 9.75 9h.5c.66 0 1.25.56 1.25 1.25s-.59 1.25-1.25 1.25h-.5c-.66 0-1.25-.31-1.25-1m3.5-8c.74 0 1.5.76 1.5 1.5v2c0 1.1 1.1 2 1.83 2c-.74 0-1.83.9-1.83 2v2c0 .74-.76 1.5-1.5 1.5"></path>
    </svg>) }],
    [".scm", { extension: [langs.scheme], name: "scheme" }],
    [".toml", { extension: [langs.toml], name: "toml", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#ee99a0" strokeLinecap="round" strokeLinejoin="round" d="M3.5 1.5h-2v13h2m9-13h2v13h-2m-8-11h7v3h-2v6h-3v-6h-2z"></path>
    </svg>) }],
    [".vbs", { extension: [langs.vbscript], name: "vbscript" }],
    [".clj", { extension: [langs.clojure], name: "clojure", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#a6da95" d="M14.17 10.03A6.5 6.5 0 0 1 1.81 6.02"></path>
            <path stroke="#8aadf4" d="M1.87 5.85A6.5 6.5 0 0 1 14.22 9.9"></path>
            <path stroke="#a6da95" d="M6.36 4.9a3.5 3.5 0 1 0 3.41 6.12"></path>
            <path stroke="#8aadf4" d="M9.77 11.02a3.5 3.5 0 0 0-3.03-6.29"></path>
            <path stroke="#cad3f5" d="M8 7.5s-1.66 2.48-1.5 3.65"></path>
            <path stroke="#cad3f5" d="M1.81 6.02C2.47 5 3.83 4.49 5 4.46c4.06 0 3 5.56 5.03 6.86c1.21.52 3.5-.21 4.15-1.32"></path>
        </g>
    </svg>) }],
    [".coffee", { extension: [langs.coffeescript], name: "coffeescript", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" stroke="#f5a97f" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 7c-.5 2.5-2 5.5-3 6.5s-2 1-3 1s-2 0-3.02-1C4.45 12.5 3 9.5 2.5 7c3 2 9 2 12 0m-12-2c3 2 9 2 12 0"></path>
            <path d="M2.5 8.4c-1.73 1.6-1.26 4.17 2 4.1M7 2c-.75-.36-1.5.18-1.5.74c-.01.56.94.78 1.5.75c.6-.03.97-.7 1.5-.96C8.98 2.3 9.41 2 10 2c.56 0 1.52.25 1.5 1c-.01.61-1.12.8-1.5.49"></path>
        </g>
    </svg>) }],
    [".jl", { extension: [langs.julia], name: "julia", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#a6da95" d="M10.5 5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0"></path>
            <path stroke="#ed8796" d="M6.5 11a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0"></path>
            <path stroke="#c6a0f6" d="M14.5 11a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0"></path>
        </g>
    </svg>) }],
    [".dockerfile", { extension: [langs.dockerfile], name: "dockerfile", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <path fill="none" stroke="#8aadf4" strokeLinecap="round" strokeLinejoin="round" d="M.5 8.5H11l.75-.5a5.35 5.35 0 0 1 0-3.5c1 .6 1 1.88 1.74 2c.77-.09 1.23.01 2 .52c0 0-.97 1.77-2.5 1.98c-1.93 3.65-4.5 5.5-6.98 5.5C0 14.5.5 8.5.5 8.5m1 0v-2m0 0h8m-6 2v-4m0 0h4m-2-2h2m-2 6v-6m2 6v-6m2 6v-2"></path>
    </svg>) }],
    [".r", { extension: [langs.r], name: "r", icon: (<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#8087a2" d="M13.5 9.5c.63-.7 1-1.54 1-2.43c0-2.52-2.91-4.57-6.5-4.57S1.5 4.55 1.5 7.07c0 1.9 1.65 3.53 4 4.22"></path>
            <path stroke="#8aadf4" d="M10.5 9.5c.4 0 .86.34 1 .7l1 3.3m-5 0v-8h3.05c.95 0 1.95 1 1.95 2s-1 2-1.95 2H7.5Z"></path>
        </g>
    </svg>) }],
    [".sawa", { extension: [langs.python], name: "sawascript" }]
]);

export default Lang