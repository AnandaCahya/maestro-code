# Maestro Studio --- VS Code Compatibility Master Roadmap & TODO

> **Dokumen:** Master TODO / Compatibility Roadmap\
> **Produk:** Maestro Studio\
> **Tujuan:** Membangun development environment berbasis Electron dan
> Monaco Editor dengan workflow profesional yang kompatibel secara
> bertahap dengan ekosistem Visual Studio Code, sekaligus mempertahankan
> Project Management native Maestro.\
> **Status dokumen:** Consolidated roadmap\
> **Prinsip pembaruan:** Status `[x]` dari roadmap sebelumnya
> dipertahankan. Item baru dimulai dengan `[ ]`. Status `[x]` berarti
> implementasi sudah tersedia; sebelum dinyatakan selesai secara final,
> item tetap harus memenuhi acceptance criteria dan regression test pada
> bagian terkait.

## 0. Aturan status, prioritas, dan definisi selesai

### Status

-   `[x]` Implemented --- fitur sudah dinyatakan selesai pada roadmap
    sebelumnya. Status ini dipertahankan dan tidak diubah dalam
    konsolidasi ini.
-   `[ ]` Planned / Not verified --- belum dikerjakan, belum
    diverifikasi, atau merupakan penambahan baru.
-   `[~]` In progress --- gunakan ketika pekerjaan benar-benar sedang
    berjalan.
-   `[!]` Blocked --- gunakan ketika ada dependensi atau hambatan yang
    belum terselesaikan.

Jangan mengubah `[x]` menjadi `[ ]` hanya karena acceptance criteria
tambahan baru ditemukan. Jika implementasi lama belum memenuhi kriteria
baru, pertahankan item lama sebagai `[x]` dan buat subtask
hardening/extension terpisah dengan status `[ ]`.

### Prioritas

-   **P0 --- Critical:** keamanan, kehilangan data, stabilitas proses,
    dan fondasi arsitektur.
-   **P1 --- High:** workflow development harian dan kompatibilitas
    inti.
-   **P2 --- Medium:** kapabilitas lanjutan yang meningkatkan
    produktivitas.
-   **P3 --- Low:** fitur nice-to-have atau kompatibilitas khusus.

### Definisi selesai (Definition of Done)

Sebuah fitur baru boleh ditandai `[x]` jika:

1.  Implementasi tersedia dan dapat digunakan melalui UI atau API yang
    ditetapkan.
2.  Jalur sukses dan kondisi gagal ditangani.
3.  Tidak menyebabkan kehilangan perubahan pengguna.
4.  Memiliki validasi input dan batas keamanan yang sesuai.
5.  Memiliki unit/integration test yang relevan.
6.  Memiliki dokumentasi penggunaan atau konfigurasi.
7.  Tidak merusak fitur yang sudah ditandai selesai.
8.  Lulus pengujian pada platform yang dinyatakan didukung.

------------------------------------------------------------------------

# 1. Editor Core, LSP & IntelliSense

**Tujuan:** menyediakan pengalaman editing, pemahaman kode, navigasi,
dan refactoring yang konsisten lintas bahasa.

## 1.1 LSP foundation and document lifecycle

-   [x] Fondasi JSON-RPC over stdio: spawner proses child di Electron
    Main dan proxy Context Bridge ke Renderer.
-   [x] Document Synchronization:
    -   [x] `textDocument/didOpen`
    -   [x] `textDocument/didChange`
    -   [x] `textDocument/didSave`
-   [x] LSP lifecycle management:
    -   [x] Kirim `initialize` dengan `rootUri`, `workspaceFolders`,
        `clientInfo`, dan `capabilities`.
    -   [x] Kirim `initialized` setelah proses inisialisasi berhasil.
    -   [x] Dukung `shutdown` dan `exit` secara graceful.
    -   [x] Tangani startup timeout dan server yang gagal initialize.
    -   [x] Deteksi process exit, crash, dan restart.
    -   [x] Sediakan kebijakan restart: manual, otomatis, batas
        percobaan, dan backoff.
    -   [x] Pastikan satu server tidak diduplikasi untuk kombinasi
        workspace/language yang sama tanpa alasan (`ensureServerForFile`).
    -   [x] Hentikan server ketika workspace ditutup atau aplikasi
        keluar.
-   [x] Request dan notification handling:
    -   [x] Request ID tracking dan response correlation.
    -   [x] Request cancellation (`$/cancelRequest`).
    -   [x] Timeout untuk request yang macet.
    -   [x] Progress notification (`$/progress`).
    -   [x] Server-to-client requests.
    -   [x] Dynamic capability registration dan unregistration.
    -   [x] Logging JSON-RPC untuk debugging.
    -   [x] Proteksi terhadap pesan malformed dan ukuran payload
        berlebihan.
-   [x] Workspace support:
    -   [x] Single-root workspace lifecycle.
    -   [x] Multi-root workspace folders.
    -   [x] Workspace folder add/remove notification (`workspace/didChangeWorkspaceFolders`).
    -   [x] Workspace configuration synchronization
        (`workspace/didChangeConfiguration`).
    -   [x] File URI/path normalization lintas Windows, Linux, dan
        macOS.

## 1.2 Diagnostics and Problems

-   [x] Real-time Diagnostics: penanda garis gelombang merah (error) dan
    kuning (warning) di editor.
-   [x] Problems Panel: daftar error/warning interaktif dengan kemampuan
    klik untuk melompat ke baris dan kolom terkait.
-   [x] Dukungan seluruh severity LSP: Error, Warning, Information,
    Hint.
-   [x] Kelompokkan diagnostics berdasarkan workspace, file, severity,
    dan source.
-   [x] Refresh dan clear diagnostics ketika dokumen ditutup atau server
    berhenti.
-   [x] Tangani `publishDiagnostics` dengan document version.
-   [x] Tampilkan code, source, message, related information, dan tags.
-   [x] Dukungan diagnostic tags: unnecessary dan deprecated.
-   [x] Filter, sort, collapse, dan clear Problems.
-   [x] Navigasi Next/Previous Problem (`F8` / `Shift+F8`).
-   [x] Quick Fix dari diagnostic terkait.
-   [x] Cegah diagnostic stale menimpa diagnostic dari versi dokumen
    yang lebih baru.

## 1.3 Hover, navigation, symbols

-   [x] LSP Hover Tooltips (`textDocument/hover`): menampilkan tipe data
    dan dokumentasi JSDoc/Markdown saat kursor berada di atas simbol.
-   [x] Go to Definition (`textDocument/definition`): F12 / Ctrl+Click
    untuk melompat ke definisi antar-file.
-   [x] Find References (`textDocument/references` - Shift+F12).
-   [x] Go to Implementation (`textDocument/implementation`).
-   [x] Go to Type Definition (`textDocument/typeDefinition`).
-   [x] Document Symbols (`textDocument/documentSymbol`).
-   [x] Workspace Symbols (`workspace/symbol`).
-   [x] Call Hierarchy (`textDocument/prepareCallHierarchy` dan request
    lanjutan).
-   [x] Type Hierarchy jika server mendukung (`textDocument/prepareTypeHierarchy`, `typeHierarchy/supertypes`, `typeHierarchy/subtypes`).
-   [x] Link Navigation (`textDocument/documentLink`).
-   [x] Rename Preview sebelum perubahan diterapkan.
-   [x] Navigation history: Go Back / Go Forward.
-   [x] Definition peek dan reference peek.
-   [x] Tangani hasil navigasi yang menunjuk ke file yang belum dibuka.

## 1.4 Completion, snippets, and signature help

-   [x] Completion (`textDocument/completion`).
-   [x] Completion resolve (`completionItem/resolve`).
-   [x] Completion sorting, filtering, dan fuzzy matching.
-   [x] Completion item kinds dan detail/documentation.
-   [x] Text edits dan additional text edits dari completion.
-   [x] Auto-import melalui completion.
-   [x] Completion commit characters.
-   [x] Trigger character handling.
-   [x] Snippet completion dengan placeholder `$1`, `$2`, `$0`.
-   [x] Tabstop navigation dan nested placeholder.
-   [x] Variable/choice placeholder jika didukung parser snippet.
-   [x] Signature Help (`textDocument/signatureHelp`).
-   [x] Active parameter dan active signature highlighting.
-   [x] Trigger/retrigger character untuk Signature Help.
-   [x] Completion/snippet behavior dapat dikonfigurasi.
-   [x] Pastikan completion tidak mengganggu input IME dan multi-cursor.

## 1.5 Formatting and refactoring

-   [x] Format Document (`Shift+Alt+F`) melalui Monaco action provider.
-   [x] Format on Paste bawaan editor.
-   [x] Format on Save yang terintegrasi dengan workspace settings.
-   [x] Range Formatting (`textDocument/rangeFormatting`).
-   [x] On-type Formatting (`textDocument/onTypeFormatting`).
-   [x] Rename Symbol (`textDocument/rename`) dengan preview perubahan
    lintas file.
-   [x] Code Actions (`textDocument/codeAction`).
-   [x] Code Action resolve jika diperlukan (`codeAction/resolve`).
-   [x] Quick Fix: import symbol, remove unused variable, dan perbaikan
    yang disediakan server.
-   [x] Refactor actions: extract function/variable, inline, dan
    tindakan yang disediakan server.
-   [x] Organize Imports.
-   [x] Source Actions.
-   [x] WorkspaceEdit transaction:
    -   [x] Validasi seluruh perubahan sebelum diterapkan.
    -   [x] Terapkan perubahan lintas file secara konsisten.
    -   [x] Tangani file yang berubah sejak edit dibuat.
    -   [x] Sediakan undo/rollback jika penerapan gagal.
    -   [x] Tampilkan preview untuk perubahan destruktif atau berskala
        besar.

## 1.6 Semantic intelligence

-   [x] Semantic Tokens Full (`textDocument/semanticTokens/full`).
-   [x] Semantic Tokens Range (`textDocument/semanticTokens/range`).
-   [x] Semantic Tokens Delta (`textDocument/semanticTokens/full/delta` with `previousResultId`, edits mapping, and full fallback).
-   [x] Semantic token legend dan mapping ke theme.
-   [x] Inlay Hints (`textDocument/inlayHint`).
-   [x] CodeLens (`textDocument/codeLens` dan resolve).
-   [x] Folding Ranges (`textDocument/foldingRange`).
-   [x] Selection Ranges (`textDocument/selectionRange`).
-   [x] Document Highlight (`textDocument/documentHighlight`).
-   [x] Linked Editing Range.
-   [x] Color Provider (`textDocument/documentColor`).
-   [x] Moniker support jika dibutuhkan oleh language server (`textDocument/moniker`).
-   [x] Progress dan cancellation untuk operasi semantic yang berat (`CancellationToken` integration & `$/cancelRequest`).

## 1.7 TypeScript and JavaScript services

-   [x] Compiler options ESNext, NodeJs module resolution, JSX React,
    dan diagnostics enabled.
-   [x] Deteksi dan baca `tsconfig.json` / `jsconfig.json` dari
    workspace.
-   [x] Hormati project references dan path aliases.
-   [x] Deteksi package manager dan dependency context (`pnpm`, `npm`, `yarn`, `bun`).
-   [x] Multi-project TypeScript workspace (`discoverTsProjects` & recursive monorepo nearest-tsconfig mapping).
-   [x] JavaScript/TypeScript inferred project behavior (`getInferredTsConfig` with safe modern defaults).
-   [x] Restart/reload TypeScript service ketika konfigurasi berubah (`reloadTypeScriptService`).
-   [x] Dukungan JSX/TSX dan framework-specific configuration (`react`, `react-jsx`, `preserve`, `react-native`, `target`, `moduleResolution`).
-   [x] Tampilkan konfigurasi compiler yang tidak valid secara jelas (syntax error detection & Problems panel diagnostics).

## 1.8 Language support and editor behavior

-   [x] Language identification dan file association.
-   [x] Language configuration: comments, brackets, auto-closing pairs,
    surrounding pairs.
-   [ ] TextMate grammar integration.
-   [x] Language-specific snippets.
-   [x] Bracket pair colorization.
-   [x] Auto-closing brackets, quotes, dan tags jika tersedia.
-   [x] Auto-indentation dan indentation detection.
-   [x] Tab/space conversion dan indentation guides.
-   [x] Word wrap.
-   [x] Minimap.
-   [x] Sticky Scroll.
-   [x] Code folding UI.
-   [x] Unicode, CRLF/LF, dan encoding handling.
-   [x] Large-file mode dengan fitur mahal yang dapat dibatasi.

------------------------------------------------------------------------

# 2. Git Version Control & Diff

**Tujuan:** menyediakan workflow Git yang granular, aman, dan dapat
ditautkan ke task Maestro.

## 2.1 Existing Git capabilities

-   [x] Git Branch Detection: menampilkan branch aktif di FloatingHUD
    dan Git tab.
-   [x] Git Status Panel:
    -   [x] Modified (`M`)
    -   [x] Untracked (`U`)
    -   [x] Deleted (`D`)
-   [x] Side-by-Side Diff Viewer menggunakan Monaco Diff Editor.
-   [x] HEAD vs Working Tree comparison.
-   [x] Visualisasi penambahan (hijau) dan penghapusan (merah).
-   [x] Git Staging & Commit Flow:
    -   [x] Otomatis stage all file saat commit.
    -   [x] Commit message input.
    -   [x] Ctrl+Enter untuk commit.
    -   [x] Git Push.
    -   [x] Git Pull.

## 2.2 Staging and changes

-   [x] Stage individual file.
-   [x] Unstage individual file.
-   [x] Stage selected lines/hunks (`gitStageHunk`).
-   [x] Unstage selected lines/hunks (`gitUnstageHunk`).
-   [x] Staged vs Unstaged changes.
-   [x] Staged diff viewer.
-   [x] Discard changes per file dengan konfirmasi.
-   [x] Discard selected hunks dengan konfirmasi (`gitDiscardHunk`).
-   [x] Discard all changes dengan konfirmasi kuat.
-   [x] Resolve deleted/renamed/untracked file states.
-   [x] Deteksi file binary dan tampilkan informasi yang sesuai (`isBinaryFile`).
-   [x] Commit staged changes tanpa memaksa stage all.
-   [x] Sediakan pilihan eksplisit Commit All Changes (`gitCommitAll`).
-   [x] Commit amend.
-   [x] Commit signing status jika tersedia.
-   [x] Commit validation hooks dan error feedback.

## 2.3 Diff and history

-   [x] Side-by-side diff HEAD vs Working Tree.
-   [x] Inline diff mode.
-   [x] Diff antara dua commit/branch/tag.
-   [x] Diff staged vs HEAD.
-   [x] Diff file terhadap versi pada disk.
-   [x] Diff untuk file yang di-rename.
-   [x] Diff untuk file yang dihapus.
-   [x] Git History / commit graph.
-   [x] Commit detail dan changed files.
-   [x] File history.
-   [x] Line history (`gitGetLineHistory`).
-   [x] Git Blame annotations.
-   [x] Open file at selected commit.
-   [x] Compare branches.
-   [x] Compare tags (`gitCompareTags`).
-   [x] Search commit message dan author.

## 2.4 Branch, remote, and stash

-   [x] Create branch.
-   [x] Checkout branch.
-   [x] Rename branch.
-   [x] Delete local branch dengan validasi.
-   [x] Publish branch.
-   [x] Track remote branch (`trackRemote` option).
-   [x] Branch switch dengan perlindungan terhadap perubahan lokal.
-   [x] Branch comparison dan ahead/behind indicator.
-   [x] Remote list/add/remove/rename (`gitGetRemotes`, `gitAddRemote`, `gitRemoveRemote`, `gitRenameRemote`).
-   [x] Fetch.
-   [x] Pull strategy selection (`gitPull` with `merge`, `rebase`, `ff-only`).
-   [x] Push dengan upstream selection (`gitPush` with `setUpstream`).
-   [x] Stash create/apply/pop/drop/list.
-   [x] Tag create/delete/checkout.
-   [x] Cherry-pick.
-   [x] Revert commit.
-   [x] Reset modes dengan konfirmasi yang jelas.
-   [ ] Interactive rebase (opsional, fase lanjutan).

## 2.5 Merge and conflict resolution

-   [x] Merge operation.
-   [x] Rebase operation.
-   [x] Conflict detection.
-   [x] Three-way merge editor.
-   [x] Accept Current / Incoming / Both.
-   [x] Manual conflict editing.
-   [x] Mark as resolved.
-   [x] Conflict navigation.
-   [x] Abort merge/rebase.
-   [x] Continue merge/rebase.
-   [x] Conflict state recovery setelah aplikasi restart.
-   [x] Jangan menghapus marker conflict secara otomatis tanpa
    persetujuan pengguna.

## 2.6 Git gutter and decorations

-   [x] Garis hijau untuk added lines.
-   [x] Garis biru untuk modified lines.
-   [x] Indikator merah untuk deleted lines.
-   [x] Gutter context menu: stage/revert hunk.
-   [x] Hover detail perubahan.
-   [x] Navigasi previous/next change.
-   [x] Refresh decorations ketika Git status berubah.
-   [x] Sinkronisasi decoration dengan editor model dan file rename.

------------------------------------------------------------------------

# 3. Workspace, Filesystem & File Watcher

**Tujuan:** menjaga workspace Maestro konsisten dengan filesystem dan
aplikasi eksternal.

## 3.1 Existing file operations

-   [x] Open Directory / Workspace.
-   [x] Recursive Directory Tree.
-   [x] Create New File.
-   [x] Create New Folder.
-   [x] Delete File / Folder dengan dialog konfirmasi.
-   [x] Rename File / Folder melalui inline input.

## 3.2 File operations additions

-   [x] Duplicate File.
-   [x] Duplicate Folder.
-   [x] Copy Absolute Path.
-   [x] Copy Relative Path.
-   [x] Reveal in OS Explorer / Finder.
-   [x] Open With External Application.
-   [x] Open in Integrated Editor.
-   [x] File/folder context menu.
-   [x] Move file/folder.
-   [x] Multi-select file operations.
-   [x] Undo/redo file operations jika aman.
-   [x] File association.
-   [x] Hidden files toggle.
-   [x] Symlink detection dan traversal policy.
-   [x] Permission/error handling untuk file read-only.
-   [x] File encoding detection.
-   [x] New file naming conflict handling.

## 3.3 File watcher

-   [x] Implementasikan filesystem watcher (misalnya Chokidar atau
    mekanisme native yang sesuai).
-   [x] Watch create/change/delete/rename.
-   [x] Debounce event dan deduplicate event berulang.
-   [x] Ignore `node_modules`, `.git` internal changes yang tidak
    relevan, `dist`, `build`, `coverage`, dan folder hasil generate
    sesuai konfigurasi.
-   [x] Hormati `.gitignore` dan exclusion settings tanpa menghilangkan
    kemampuan memantau file yang memang diperlukan.
-   [x] Tangani atomic save (temporary file + rename).
-   [x] Tangani event burst ketika install/build/checkout.
-   [x] Refresh tree explorer secara incremental.
-   [x] Update Git status setelah perubahan eksternal.
-   [x] Detect external modification untuk file yang sedang terbuka.
-   [x] Tampilkan pilihan Reload from Disk, Compare, atau Keep Editor
    Version.
-   [x] Jangan overwrite perubahan buffer yang belum disimpan.
-   [ ] Tangani watcher limit dan fallback/polling jika diperlukan.
-   [x] Watcher lifecycle mengikuti workspace lifecycle.
-   [x] Watcher tidak berjalan pada folder di luar workspace tanpa izin.

## 3.4 Workspace model

-   [x] Multi-root workspace.
-   [x] Save/open workspace file (`.code-workspace` compatibility).
-   [x] Recent Projects / Recent Workspaces.
-   [x] Workspace name dan metadata.
-   [x] Workspace trust state.
-   [ ] Workspace-specific settings.
-   [x] Workspace folder add/remove.
-   [x] Workspace state restoration.
-   [x] Per-workspace editor tabs dan terminal sessions.
-   [x] Per-workspace Git repository discovery.
-   [x] Nested repository/submodule detection.
-   [ ] Workspace folder exclusion.
-   [x] Workspace backup/recovery.

------------------------------------------------------------------------

# 4. Search & Navigation

**Tujuan:** pencarian cepat pada file, simbol, dan isi seluruh
workspace.

## 4.1 Existing search

-   [x] Quick File Jump (`Ctrl+P`) untuk nama file dan task di
    workspace.
-   [x] In-file Find (`Ctrl+F`) dan Replace (`Ctrl+H`) melalui Monaco.
-   [x] Workspace Global Search (`Ctrl+Shift+F`).
-   [x] Text search dan regex.
-   [x] Match Case.
-   [x] Match Whole Word.
-   [x] Use Regular Expression.
-   [x] Hasil dikelompokkan per file, nomor baris, dan cuplikan.
-   [x] Klik hasil untuk melompat ke file/baris/kolom.
-   [x] Global Replace All.

## 4.2 Search improvements

-   [ ] Gunakan ripgrep (`rg`) atau search engine setara untuk pencarian
    workspace berskala besar.
-   [x] `.gitignore` integration.
-   [x] Include glob patterns.
-   [x] Exclude glob patterns.
-   [x] Search hidden files option.
-   [x] Search in selection.
-   [x] Search history.
-   [x] Search preview/context.
-   [x] Replace preview sebelum perubahan diterapkan.
-   [x] Replace individual match.
-   [x] Replace per file.
-   [x] Cancel search.
-   [x] Progress indicator untuk pencarian besar.
-   [x] Binary file exclusion.
-   [x] Encoding/error handling.
-   [x] Search across multi-root workspace.
-   [x] Search result navigation previous/next.
-   [x] Search editor untuk hasil yang perlu ditinjau lebih lanjut.
-   [x] Fuzzy file matching.
-   [x] Recent files.
-   [x] Go to Line (`Ctrl+G`).
-   [x] Go to Symbol (`Ctrl+Shift+O`).
-   [x] Go to Definition/References dari LSP.
-   [x] Navigation Back/Forward history.

------------------------------------------------------------------------

# 5. Editor Ergonomics & Keybindings

**Tujuan:** mendukung muscle memory developer VS Code dan menyediakan
editor yang produktif.

## 5.1 Existing keybindings

-   [x] Ctrl+S: Save file aktif.
-   [x] Ctrl+P: Quick Open / Omni-Jump.
-   [x] Ctrl+\`: Toggle Terminal & Problems Deck.
-   [x] Ctrl+W: Close active tab.
-   [x] Ctrl+Enter: Git commit.
-   [x] Ctrl+Shift+F: Workspace Search.
-   [x] Ctrl+B: Toggle sidebar kiri.
-   [x] Shift+Alt+F: Format Document.
-   [x] F12 / Ctrl+Click: Go to Definition.

## 5.2 Pending keybindings

-   [x] Ctrl+Shift+P: Command Palette.
-   [x] Ctrl+/: Toggle Line Comment.
-   [x] Shift+Alt+A: Toggle Block Comment.
-   [x] Alt+Up/Down: Move Line.
-   [x] Shift+Alt+Down: Duplicate Line.
-   [x] Ctrl+D: Add Next Occurrence / Multi-cursor.
-   [x] Ctrl+Shift+M: Problems Panel.
-   [x] Ctrl+G: Go to Line.
-   [x] Ctrl+Shift+O: Go to Symbol.
-   [x] Ctrl+K Ctrl+S: Keyboard Shortcuts.
-   [x] Ctrl+Shift+E: Explorer.
-   [x] Ctrl+Shift+G: Source Control.
-   [x] Ctrl+Shift+D: Run and Debug.
-   [x] Ctrl+Shift+X: Extensions.
-   [x] F2: Rename Symbol.
-   [x] Shift+F12: Find References.
-   [x] F8 / Shift+F8: Next/Previous Problem.
-   [x] Ctrl+Tab: Switch editor.
-   [x] Ctrl+Shift+Tab: Switch previous editor.

## 5.3 Editing operations

-   [x] Multi-cursor editing.
-   [x] Column/box selection.
-   [x] Add cursor above/below.
-   [x] Select all occurrences.
-   [x] Expand/shrink selection.
-   [x] Delete line.
-   [x] Join lines.
-   [x] Move line up/down.
-   [x] Duplicate line/selection.
-   [x] Indent/outdent line.
-   [x] Transform case.
-   [x] Trim trailing whitespace.
-   [x] Insert line above/below.
-   [x] Surround with.
-   [x] Bracket matching.
-   [x] Auto-closing brackets/quotes.
-   [x] Auto-indent.
-   [x] Indentation detection.
-   [x] Word wrap.
-   [x] Minimap.
-   [x] Sticky Scroll.
-   [x] Breadcrumbs.
-   [x] Code folding.
-   [x] Bracket pair colorization.
-   [x] Editor rulers.
-   [x] Render whitespace.
-   [x] Line numbers modes.
-   [x] Font ligatures and font settings.

## 5.4 Editor groups and tabs

-   [x] Multiple Editor Groups.
-   [x] Split Editor left/right.
-   [x] Split Editor up/down.
-   [x] Move editor to another group.
-   [x] Focus next/previous editor group.
-   [x] Drag/drop editor tabs between groups.
-   [x] Preview tabs.
-   [x] Pinned tabs.
-   [x] Tab reordering.
-   [x] Close saved/other/all editors.
-   [x] Recently closed editors.
-   [x] Preserve editor view state per file.
-   [x] Restore editor groups after restart.
-   [x] Independent scroll position and cursor state per editor group.

------------------------------------------------------------------------

# 6. Multi-Terminal & Shell Profiles

**Tujuan:** menyediakan terminal terintegrasi yang stabil dengan
beberapa sesi dan shell.

## 6.1 Existing terminal

-   [x] Interactive Shell: PowerShell/Bash melalui `@xterm/xterm` dan
    Electron IPC.
-   [x] Clear support.
-   [x] Resize/fit support.

## 6.2 Terminal sessions

-   [x] Multiple terminal tabs.
-   [x] Create terminal session.
-   [x] Close terminal session.
-   [x] Restart terminal session.
-   [x] Rename terminal session.
-   [x] Terminal session status (running/exited).
-   [x] Terminal session persistence policy.
-   [x] Restore terminal tabs setelah restart jika aman.
-   [x] Per-session working directory.
-   [x] Per-session environment variables.
-   [x] Terminal split horizontal/vertical.
-   [x] Move terminal between groups.
-   [x] Terminal session resource cleanup.

## 6.3 Shell profiles

-   [x] PowerShell profile.
-   [x] Command Prompt (CMD).
-   [x] Git Bash.
-   [x] WSL distribution selector.
-   [x] Bash/Zsh profile pada Linux/macOS.
-   [x] Custom shell path dan arguments.
-   [x] Default shell per platform.
-   [x] Default shell per workspace.
-   [x] Shell profile validation.
-   [x] Shell environment inheritance.
-   [x] Working directory follows workspace/file context.
-   [x] Environment variable overrides.

## 6.4 Terminal UX and integration

-   [x] Search terminal output.
-   [x] Copy/paste/select all (Ctrl+C copies on selection, interrupts on no selection; Ctrl+V pastes; Ctrl+K clears).
-   [x] Robust Ctrl+C process tree interruption (terminates descendant process trees to prevent runaway loops/APIs like Discord bot rate-limits).
-   [x] Ctrl+D handling (EOF for active child processes, shell exit on empty prompt).
-   [x] Raw CLI streaming pass-through (arrow keys & single-key actions for interactive CLIs like Vite, Inquirer, and prompts).
-   [x] Up/Down arrow command history navigation at shell prompt.
-   [x] Explicit Stop / Interrupt command button in terminal header toolbar.
-   [x] Link detection (URL, file path, line/column).
-   [x] Open file path from terminal output.
-   [x] Detect process exit code.
-   [x] Detect terminal process state.
-   [x] Task runner integration.
-   [x] Terminal output panel integration.
-   [x] Clear scrollback.
-   [ ] Terminal accessibility.
-   [ ] PTY backend (misalnya `node-pty`) dengan lifecycle management.
-   [x] Validate shell executable and arguments.
-   [x] Handle terminal resize and encoding (dynamic buffer & window size synchronization).
-   [x] Prevent orphan shell processes (process tree termination on kill and exit).

------------------------------------------------------------------------

# 7. Configuration & VS Code Workspace Compatibility

**Tujuan:** membaca konfigurasi proyek yang umum digunakan dalam
ekosistem VS Code dan EditorConfig.

## 7.1 Existing configuration TODO

-   [x] Read `.vscode/settings.json`.
-   [x] `editor.tabSize`.
-   [x] `editor.insertSpaces`.
-   [x] `editor.wordWrap`.
-   [x] `editor.formatOnSave`.
-   [x] `files.exclude`.
-   [x] UI Settings Preferences untuk theme, font size, dan editor
    preferences.

## 7.2 Settings system

-   [x] User Settings.
-   [x] Workspace Settings.
-   [ ] Folder Settings.
-   [x] Language-specific settings.
-   [x] Settings registry/schema.
-   [x] Settings search.
-   [x] Settings validation.
-   [x] Settings reset.
-   [ ] Settings sync (opsional).
-   [ ] Effective value inspector.
-   [ ] Settings precedence dan override.
-   [ ] Unknown setting handling.
-   [ ] Settings migration/versioning.
-   [ ] JSON schema validation.
-   [x] Settings UI dan JSON editor.

## 7.3 Configuration files

-   [x] `.vscode/settings.json`.
-   [x] `.vscode/tasks.json`.
-   [x] `.vscode/launch.json`.
-   [x] `.vscode/extensions.json`.
-   [x] `.editorconfig`.
-   [ ] User `keybindings.json` compatibility.
-   [x] Workspace `.code-workspace` compatibility.
-   [ ] Language-specific configuration.
-   [ ] Preserve unknown fields ketika file konfigurasi diedit.
-   [ ] Do not overwrite user configuration without confirmation.

## 7.4 EditorConfig

-   [x] Parse `.editorconfig`.
-   [x] `root`.
-   [x] `[*]` and glob sections.
-   [x] `indent_style`.
-   [x] `indent_size`.
-   [x] `tab_width`.
-   [x] `end_of_line`.
-   [x] `charset`.
-   [x] `trim_trailing_whitespace`.
-   [x] `insert_final_newline`.
-   [x] Precedence against Maestro and VS Code settings.
-   [ ] Invalid configuration diagnostics.

------------------------------------------------------------------------

# 8. Extension Ecosystem & VS Code API Compatibility

**Tujuan:** membangun sistem extension native Maestro dan compatibility
layer untuk extension VS Code secara bertahap.

> Catatan arsitektur: Monaco Editor bukan VS Code Extension Host.
> Kompatibilitas extension memerlukan runtime, API surface, contribution
> model, lifecycle, dan security boundary tersendiri. Jangan
> mengasumsikan semua extension VS Code dapat berjalan hanya dengan
> memasang VSIX.

## 8.1 Extension management

-   [ ] Extension registry/marketplace integration.
-   [x] Search extensions.
-   [ ] Extension detail page.
-   [x] Install extension.
-   [x] Uninstall extension.
-   [x] Enable/disable extension.
-   [ ] Update extension.
-   [ ] Pin extension version.
-   [ ] Install from local VSIX.
-   [x] Validate extension manifest.
-   [ ] Dependency resolution.
-   [x] Extension recommendations.
-   [x] Workspace recommendations (`.vscode/extensions.json`).
-   [ ] Extension compatibility metadata.
-   [ ] Extension install/update rollback.
-   [ ] Extension inventory/export.
-   [ ] Offline extension installation.
-   [ ] Publisher/signature trust policy.

## 8.2 Extension runtime / host

-   [x] Define extension host architecture.
-   [x] Extension manifest parsing.
-   [x] Extension activation events.
-   [x] Extension lifecycle.
-   [ ] Extension API versioning.
-   [x] Extension commands.
-   [x] Command registration and disposal.
-   [ ] Menus and context menus.
-   [ ] Views and view containers.
-   [ ] Status bar contributions.
-   [x] Configuration contributions.
-   [x] Keybinding contributions.
-   [ ] Language contributions.
-   [ ] Snippet contributions.
-   [x] Theme contributions.
-   [ ] Webview support.
-   [ ] Extension storage.
-   [ ] Notifications and progress.
-   [ ] Workspace/document APIs.
-   [ ] Extension host crash recovery.
-   [ ] Extension host logs.
-   [ ] Extension enablement scope (global/workspace).
-   [ ] Extension resource and permission limits.

## 8.3 VS Code compatibility layer

-   [ ] Define supported VS Code API subset.
-   [ ] Define API compatibility/version policy.
-   [ ] Map VS Code commands to Maestro commands.
-   [ ] Map VS Code workspace APIs.
-   [ ] Map TextDocument/TextEditor APIs.
-   [ ] Map configuration APIs.
-   [ ] Map diagnostics and code actions.
-   [ ] Map tree views and webviews.
-   [ ] Map status bar and notifications.
-   [ ] Map language and debugger contributions.
-   [ ] Detect unsupported APIs.
-   [ ] Compatibility test suite using representative extensions.
-   [ ] Extension compatibility report.
-   [ ] Document unsupported APIs and limitations.
-   [ ] Do not claim universal VS Code extension compatibility until
    verified.

## 8.4 Extension security

-   [ ] Extension permission model.
-   [ ] Workspace trust integration.
-   [ ] Restrict filesystem access where possible.
-   [ ] Restrict process execution where possible.
-   [ ] Webview isolation and content security policy.
-   [ ] Extension publisher trust.
-   [ ] Extension update integrity.
-   [ ] Resource usage limits.
-   [ ] Extension crash containment.
-   [ ] User-visible permission prompts.

------------------------------------------------------------------------

# 9. Debugging --- Debug Adapter Protocol (DAP)

**Tujuan:** mendukung debugging lintas bahasa melalui Debug Adapter
Protocol.

-   [x] DAP client transport.
-   [x] Debug adapter process management.
-   [x] Debug adapter discovery/configuration.
-   [x] `launch.json` parsing.
-   [x] Debug configuration provider.
-   [x] Start debugging.
-   [x] Stop debugging.
-   [x] Restart debugging.
-   [x] Continue/pause.
-   [x] Step over.
-   [x] Step into.
-   [x] Step out.
-   [x] Breakpoints.
-   [ ] Conditional breakpoints.
-   [ ] Function breakpoints.
-   [ ] Logpoints.
-   [ ] Exception breakpoints.
-   [x] Variables panel.
-   [x] Watch expressions.
-   [x] Call stack.
-   [x] Debug console.
-   [x] Evaluate expression.
-   [x] Debug session lifecycle.
-   [ ] Multiple debug sessions.
-   [x] Debug toolbar.
-   [ ] Source mapping.
-   [ ] Breakpoint persistence.
-   [ ] Debug adapter crash recovery.
-   [ ] DAP protocol logging.
-   [ ] Security validation for launch commands and executable paths.

------------------------------------------------------------------------

# 10. Task Runner, Build & Automation

**Tujuan:** menjalankan build, test, lint, dan perintah proyek dari
Maestro tanpa mengharuskan pengguna mengetik semuanya secara manual.

-   [x] Parse `.vscode/tasks.json`.
-   [x] Task discovery.
-   [x] Task provider interface.
-   [x] Run task.
-   [x] Run build task.
-   [x] Run test task.
-   [ ] Task groups.
-   [ ] Task dependencies.
-   [ ] Sequential execution.
-   [ ] Parallel execution.
-   [ ] Background tasks.
-   [ ] Task cancellation.
-   [ ] Task termination.
-   [ ] Task output panel.
-   [ ] Task problem matcher.
-   [ ] Task presentation settings.
-   [ ] Task environment variables.
-   [ ] Workspace task scope.
-   [ ] Task input variables.
-   [ ] Task execution history.
-   [ ] Task failure diagnostics.
-   [x] Task-to-terminal session association.
-   [ ] Task runner integration with Maestro Project Management.
-   [ ] Command execution confirmation for untrusted workspaces.
-   [ ] Prevent unsafe shell command interpolation.

------------------------------------------------------------------------

# 11. Testing Integration

**Tujuan:** menyediakan workflow test discovery, execution, result
inspection, dan coverage.

-   [x] Test Explorer.
-   [x] Test provider/adapter interface.
-   [x] Test discovery.
-   [x] Test tree hierarchy.
-   [x] Run single test.
-   [x] Run test file.
-   [x] Run test suite.
-   [x] Run all tests.
-   [x] Run failed tests.
-   [ ] Debug test.
-   [x] Test result panel.
-   [x] Test output and error details.
-   [x] Test history.
-   [x] Test filtering.
-   [x] Test status decorations.
-   [ ] Test coverage integration.
-   [ ] Coverage gutter decorations.
-   [ ] Coverage summary.
-   [x] Jest integration.
-   [x] Vitest integration.
-   [ ] PHPUnit integration.
-   [x] pytest integration.
-   [ ] Document supported test adapters and versions.
-   [x] Test execution cancellation and process cleanup.

------------------------------------------------------------------------

# 12. Application Shell & Workbench UX

**Tujuan:** menyatukan editor, project management, terminal, Git, dan
extension dalam workbench yang dapat dikustomisasi.

## 12.1 Core shell

-   [x] Command Palette.
-   [x] Command registry.
-   [x] Command categories and descriptions.
-   [x] Quick Pick component.
-   [ ] Quick Input component.
-   [ ] Activity Bar.
-   [x] Primary Sidebar.
-   [ ] Secondary Sidebar.
-   [ ] Panel management.
-   [x] Status Bar.
-   [ ] Notification center.
-   [x] Context menus.
-   [x] Breadcrumbs.
-   [x] Keyboard shortcut editor.
-   [x] Layout persistence.
-   [ ] Customizable panel positions.
-   [ ] Resizable panels.
-   [ ] Drag-and-drop layout.
-   [x] Recent projects.
-   [ ] Welcome/getting started page.
-   [ ] Error notification management.

## 12.2 Panels and views

-   [x] Explorer.
-   [x] Search.
-   [x] Source Control.
-   [x] Run and Debug.
-   [x] Extensions.
-   [x] Problems.
-   [ ] Output.
-   [x] Debug Console.
-   [x] Terminal.
-   [x] Project Management.
-   [ ] Panel visibility and ordering.
-   [ ] Panel state persistence.
-   [ ] Panel focus navigation.
-   [ ] Panel resizing.

## 12.3 Layout and accessibility

-   [x] Zen Mode.
-   [x] Full Screen Mode.
-   [ ] Centered Layout.
-   [ ] Focus Mode.
-   [ ] Restore layout after restart.
-   [ ] Keyboard-only navigation.
-   [ ] Accessible labels and roles.
-   [ ] Focus indicators.
-   [ ] Screen reader support where feasible.
-   [ ] Reduced motion preference.
-   [ ] UI scaling and zoom.
-   [ ] High-contrast theme support.

## 12.4 Shortcut behavior

-   [ ] Command Palette shortcut resolution.
-   [ ] Context-aware keybindings.
-   [ ] Keybinding conflict detection.
-   [ ] User keybinding overrides.
-   [ ] Workspace keybinding policy if supported.
-   [ ] OS-specific shortcut mapping.
-   [ ] Shortcut discoverability in menus.
-   [ ] Prevent shortcuts from triggering in text inputs when
    inappropriate.

------------------------------------------------------------------------

# 13. Integrated Project Management

**Tujuan:** menjadikan project tracking sebagai subsystem native
Maestro, bukan sekadar panel tambahan atau plugin eksternal.

## 13.1 Existing Project Management features

-   [x] Dual Deck Split View: Editor dan Kanban Board.
-   [x] HTML5 Drag-and-Drop Tasks.
-   [x] Status: Backlog, To Do, In Progress, Review, Done.
-   [x] Subtasks Checklist.
-   [x] Code-Link untuk menautkan task ke file kode fisik.
-   [x] Focus Mode: task aktif di header dan editor banner.

## 13.2 Issue and task model

-   [x] Stable Task ID generator.
-   [x] Issue types: Epic, Story, Task, Bug, Subtask.
-   [x] Task title and description.
-   [x] Markdown description editor.
-   [x] Priority.
-   [x] Labels/components.
-   [x] Assignee.
-   [x] Reporter.
-   [x] Created/updated timestamps.
-   [x] Start date and due date.
-   [x] Parent/child relationships.
-   [x] Task dependencies and blockers.
-   [ ] Attachments.
-   [x] Comments.
-   [x] Activity timeline.
-   [x] Change history/audit trail.
-   [ ] Custom fields.
-   [ ] Task templates.
-   [x] Task cloning.
-   [ ] Archive/delete/restore.
-   [ ] Bulk edit.
-   [x] Task filtering and sorting.
-   [ ] Saved filters.
-   [x] Search by ID/title/description.
-   [ ] Configurable status workflow.
-   [ ] Workflow transition validation.

## 13.3 Planning and project views

-   [x] Backlog management.
-   [x] Sprint management.
-   [x] Milestones.
-   [ ] Release management.
-   [x] Roadmap view.
-   [ ] Timeline/Gantt view.
-   [ ] Calendar view.
-   [x] Workload view.
-   [x] Project dashboard.
-   [x] Project progress tracking.
-   [ ] Burndown chart.
-   [ ] Velocity chart.
-   [ ] Configurable estimation units.
-   [ ] Project templates.
-   [ ] Multiple projects/workspaces.
-   [ ] Project archive and restore.

## 13.4 Focus and editor integration

-   [x] Focus Mode.
-   [x] Code-Link.
-   [x] Multiple code links per task.
-   [x] Code link to line range/symbol.
-   [ ] Detect broken/stale code links.
-   [x] Open task from editor context menu.
-   [x] Create task from selected code.
-   [x] Attach current file/selection to task.
-   [x] Show active task context in editor.
-   [x] Show task status in editor tab or status bar.
-   [x] Navigate between linked code locations.
-   [ ] Task-aware search/filter.
-   [ ] Task context passed to task runner.

## 13.5 Git and task relationship

-   [x] Branch-per-Task Automation.
-   [x] Branch naming templates.
-   [x] Task-to-branch association.
-   [ ] Multiple branches per task.
-   [ ] Multiple tasks per branch.
-   [x] Git Commit Auto-Link.
-   [ ] Commit message templates.
-   [ ] Multiple tasks per commit.
-   [ ] Commit-to-task association.
-   [ ] Pull Request association.
-   [ ] Merge Request association.
-   [ ] Git activity timeline per task.
-   [x] Automatic task status transition rules.
-   [ ] Optional branch deletion after completion.
-   [ ] Branch cleanup preview.
-   [ ] Detect branch deletion outside Maestro.
-   [ ] Do not force status transition based only on branch existence.
-   [ ] Support configurable rules for commit, push, PR/MR, and merge
    events.

------------------------------------------------------------------------

# 14. Offline-first Data & Repository Synchronization

**Tujuan:** menjaga Project Management tetap berfungsi offline,
portable, dan dapat dibagikan melalui Git tanpa menjadikan Git sebagai
database operasional.

## 14.1 Local persistence

-   [x] Select local database technology.
-   [x] Define project/task schema.
-   [ ] Local database migrations.
-   [x] Automatic persistence.
-   [ ] Transactional task updates.
-   [x] Crash-safe writes.
-   [ ] Local attachment storage.
-   [x] Activity history persistence.
-   [x] Data export.
-   [x] Data import.
-   [x] Backup.
-   [x] Restore.
-   [x] Schema versioning.
-   [x] Data integrity validation.
-   [x] Recovery from corrupted local state.

## 14.2 Repository representation

-   [x] Define `.maestro/` directory structure.
-   [x] Define `project.json` schema.
-   [x] Define task serialization format.
-   [x] Define milestone/workflow serialization.
-   [ ] Define attachment storage policy.
-   [ ] Define schema version and migration policy.
-   [x] Define stable IDs independent of local database IDs.
-   [x] Define deterministic serialization.
-   [x] Define files safe to commit and files that must remain local.
-   [x] Define `.gitignore` recommendations for local-only data.
-   [x] Project export/import compatibility.
-   [ ] Avoid writing secrets into repository metadata.

## 14.3 Synchronization engine

-   [x] Local change tracking.
-   [ ] Change journal.
-   [x] Repository sync status.
-   [x] Export local changes to repository.
-   [x] Import repository changes to local database.
-   [x] Manual sync/publish.
-   [ ] Optional auto-sync policy.
-   [ ] Sync history.
-   [ ] Sync retry.
-   [ ] Partial sync recovery.
-   [x] Conflict detection.
-   [x] Conflict resolution UI.
-   [x] Concurrent edit protection.
-   [ ] Deleted/renamed task handling.
-   [x] Duplicate ID detection.
-   [ ] Schema mismatch handling.
-   [ ] Recovery after interrupted sync.
-   [x] Never silently overwrite a newer local or repository version.
-   [x] Sync must be idempotent.

## 14.4 Future collaboration

-   [ ] User identity model.
-   [ ] Author attribution.
-   [ ] Conflict-aware concurrent editing.
-   [ ] Shared project permissions.
-   [ ] Collaboration metadata.
-   [ ] Optional remote sync backend.
-   [ ] Sync protocol versioning.
-   [ ] Audit trail integrity.
-   [ ] Offline queue for remote operations.

------------------------------------------------------------------------

# 15. Security, Reliability & Performance

**Tujuan:** melindungi filesystem, proses, workspace, extension, dan
data pengguna serta menjaga aplikasi tetap stabil.

## 15.1 Electron security

-   [x] Context isolation enabled.
-   [ ] Renderer sandbox enabled where compatible.
-   [x] Node integration disabled in renderer.
-   [ ] Strict IPC allowlist.
-   [ ] Validate IPC sender and payload.
-   [ ] Narrow preload API surface.
-   [ ] No arbitrary filesystem access from renderer.
-   [ ] No arbitrary shell execution from renderer.
-   [x] Content Security Policy.
-   [x] Navigation/window-open restrictions.
-   [x] Secure external URL handling.
-   [ ] Dependency security audit.
-   [ ] Secure token/secret storage.

## 15.2 Workspace and process security

-   [x] Workspace Trust.
-   [ ] Untrusted project mode.
-   [ ] Command execution confirmation.
-   [x] Path traversal protection.
-   [x] Symlink escape protection.
-   [ ] Command injection protection.
-   [ ] Validate executable paths and arguments.
-   [ ] Extension permission model.
-   [x] Secret detection/prevention in logs.
-   [ ] Restrict sensitive environment variables.
-   [ ] Safe handling of repository hooks.
-   [ ] Safe handling of task and debug configurations.

## 15.3 Process lifecycle

-   [ ] Central process manager.
-   [ ] Child process lifecycle tracking.
-   [x] Graceful shutdown.
-   [x] Process exit detection.
-   [x] Orphan process prevention.
-   [ ] Kill process tree when required.
-   [x] LSP restart/recovery.
-   [x] Terminal process cleanup.
-   [x] Debug adapter cleanup.
-   [ ] Task process cancellation.
-   [ ] Application shutdown timeout policy.
-   [x] Process logs and diagnostics.

## 15.4 Performance and resource management

-   [ ] Lazy-load language servers.
-   [ ] Lazy-load extensions.
-   [x] File watcher debouncing.
-   [ ] Large workspace handling.
-   [x] Large file handling.
-   [ ] Search indexing/optimization.
-   [ ] Editor model memory management.
-   [ ] Terminal session resource management.
-   [ ] Background task scheduling.
-   [ ] Startup performance measurement.
-   [ ] Memory usage monitoring.
-   [ ] CPU usage monitoring.
-   [ ] Responsiveness profiling.
-   [ ] Performance regression benchmarks.

## 15.5 Reliability and recovery

-   [ ] Autosave/recovery strategy.
-   [ ] Unsaved buffer recovery.
-   [ ] Crash recovery.
-   [ ] Corrupted workspace recovery.
-   [ ] Failed file write recovery.
-   [ ] Failed task/commit recovery.
-   [x] LSP crash recovery.
-   [ ] Extension host crash recovery.
-   [x] Terminal crash recovery.
-   [ ] Sync interruption recovery.
-   [ ] Structured logs.
-   [x] Diagnostic bundle export.
-   [x] User-facing error messages with actionable details.

------------------------------------------------------------------------

# 16. Testing, QA & Distribution

**Tujuan:** memastikan Maestro stabil pada workflow nyata dan platform
yang didukung.

## 16.1 Automated testing

-   [x] Unit tests.
-   [x] Integration tests.
-   [ ] Electron IPC tests.
-   [ ] LSP protocol tests.
-   [ ] DAP protocol tests.
-   [x] Git integration tests.
-   [ ] Filesystem watcher tests.
-   [ ] Search tests.
-   [ ] Terminal integration tests.
-   [x] Project Management workflow tests.
-   [x] Repository synchronization tests.
-   [ ] Extension host tests.
-   [ ] Settings/configuration tests.
-   [ ] Keyboard shortcut tests.
-   [ ] End-to-end tests.
-   [x] Regression test suite.
-   [ ] Test fixtures for large workspaces and repositories.

## 16.2 Failure scenario testing

-   [ ] Language server missing.
-   [ ] Language server crashes during request.
-   [ ] Language server returns malformed response.
-   [x] File modified externally while dirty in editor.
-   [x] Git merge conflict.
-   [ ] Git remote unavailable.
-   [ ] Terminal killed unexpectedly.
-   [ ] Debug adapter fails to launch.
-   [ ] Task process hangs.
-   [ ] Workspace contains unreadable files.
-   [ ] Workspace contains symlinks.
-   [x] Application exits during save.
-   [x] Application exits during task update.
-   [x] Application exits during repository sync.
-   [x] Concurrent modification of task metadata.
-   [ ] Extension host crash.
-   [ ] Disk full / permission denied.
-   [ ] Very large file and very large workspace.

## 16.3 Cross-platform QA

-   [ ] Windows compatibility.
-   [ ] Linux compatibility.
-   [ ] macOS compatibility.
-   [ ] Windows path and drive-letter handling.
-   [ ] Linux/macOS case-sensitive filesystem handling.
-   [ ] Shell profile validation per platform.
-   [ ] Native dependency packaging.
-   [ ] PTY packaging.
-   [ ] File watcher behavior per platform.
-   [ ] Keyboard shortcut differences per platform.
-   [ ] High-DPI display testing.
-   [ ] Accessibility testing.

## 16.4 Packaging and updates

-   [ ] Application installer.
-   [ ] Portable build if applicable.
-   [ ] Code signing strategy.
-   [ ] Auto-update strategy.
-   [ ] Update rollback.
-   [ ] Data preservation across updates.
-   [ ] Extension preservation across updates.
-   [ ] Migration on application upgrade.
-   [ ] Release notes.
-   [ ] Version compatibility policy.
-   [ ] Crash reporting policy and user consent.

------------------------------------------------------------------------

# 17. Recommended implementation milestones

Milestone berikut adalah urutan dependency, bukan janji estimasi waktu.
Security, testing, dan reliability harus dikerjakan sejak awal dan
berlanjut pada setiap milestone.

  -----------------------------------------------------------------------
  Milestone               Fokus                   Exit criteria
  ----------------------- ----------------------- -----------------------
  M0                      Architecture & safety   IPC boundary, process
                          baseline                manager, data model,
                                                  test harness

  M1                      Editor and workspace    File watcher, external
                          hardening               modification handling,
                                                  editor groups

  M2                      LSP completion          Completion, snippets,
                                                  references, symbols,
                                                  semantic features

  M3                      Git workflow            Staging granular,
                                                  history, branches,
                                                  conflict resolution

  M4                      Workbench UX            Command Palette,
                                                  panels, settings,
                                                  keybinding management

  M5                      Terminal and task       Multi-terminal,
                          runner                  profiles, tasks,
                                                  process lifecycle

  M6                      Debugging and testing   DAP, Test Explorer,
                                                  coverage integration

  M7                      Extension foundation    Manifest, extension
                                                  host, commands,
                                                  contributions, security

  M8                      VS Code compatibility   API subset, VSIX
                                                  handling, compatibility
                                                  tests

  M9                      Project Management      Issue model, planning,
                          advanced                workflow, Git
                                                  association

  M10                     Offline-first           Local DB, repository
                          synchronization         serialization, conflict
                                                  handling

  M11                     Release readiness       Cross-platform QA,
                                                  performance, recovery,
                                                  packaging
  -----------------------------------------------------------------------

## 17.1 Suggested first implementation batch

Urutan kerja awal yang disarankan:

1.  [ ] Audit acceptance criteria untuk semua item yang sudah `[x]`
    tanpa mengubah status historisnya.
2.  [ ] Definisikan architecture decision records (ADR) untuk process
    manager, workspace model, extension host, dan local-first data.
3.  [ ] Implementasikan file watcher dan external modification conflict
    handling.
4.  [ ] Implementasikan LSP completion, signature help, references, dan
    symbols.
5.  [ ] Implementasikan editor groups dan command registry.
6.  [ ] Implementasikan granular Git staging dan staged diff.
7.  [ ] Implementasikan settings registry dan `.editorconfig`.
8.  [ ] Implementasikan multi-terminal dan shell profiles.
9.  [ ] Implementasikan task runner.
10. [ ] Buat proof of concept DAP dan extension host sebelum berkomitmen
    pada kompatibilitas penuh.

------------------------------------------------------------------------

# 18. Architecture decisions yang harus didokumentasikan

Sebelum modul besar dibangun, buat ADR untuk keputusan berikut.

-   [ ] **ADR-001 --- Editor/workbench boundary:** tanggung jawab
    Monaco, renderer, Electron Main, dan service layer.
-   [ ] **ADR-002 --- Process manager:** lifecycle untuk LSP, PTY, DAP,
    task, dan extension host.
-   [ ] **ADR-003 --- Workspace model:** single-root/multi-root,
    URI/path normalization, trust, dan persistence.
-   [ ] **ADR-004 --- LSP client architecture:** transport,
    capabilities, request lifecycle, dan server registry.
-   [ ] **ADR-005 --- Git integration:** Git CLI vs library, repository
    discovery, staging, dan conflict handling.
-   [ ] **ADR-006 --- Settings model:** schema, scope, precedence, dan
    migration.
-   [ ] **ADR-007 --- Extension compatibility:** native Maestro API, VS
    Code API subset, VSIX, dan runtime isolation.
-   [ ] **ADR-008 --- Debugging architecture:** DAP transport, adapter
    discovery, dan session lifecycle.
-   [ ] **ADR-009 --- Project Management storage:** local database,
    stable IDs, schema, dan backup.
-   [ ] **ADR-010 --- Repository sync:** serialization, change journal,
    idempotency, dan conflict resolution.
-   [ ] **ADR-011 --- Security model:** workspace trust, IPC, extension
    permissions, dan command execution.
-   [ ] **ADR-012 --- Cross-platform support:** native dependencies,
    filesystem, PTY, dan packaging.

------------------------------------------------------------------------

# 19. Compatibility scope and non-goals

Agar istilah "VS Code Compatibility" tidak menimbulkan ekspektasi yang
terlalu luas, dokumentasikan level dukungan Maestro.

-   [ ] **Level 1 --- Editor Compatibility:** Monaco editing,
    keybindings, workspace, Git, dan search.
-   [ ] **Level 2 --- Developer Workflow Compatibility:** LSP, terminal,
    settings, tasks, DAP, dan testing.
-   [ ] **Level 3 --- Extension Compatibility:** extension host, VS Code
    API subset, VSIX, dan contribution points.
-   [ ] **Level 4 --- Ecosystem Compatibility:** dukungan luas terhadap
    extension, marketplace, debugging, testing, dan workflow lintas
    bahasa.

Target strategis yang disarankan: Level 3 sebagai sasaran kompatibilitas
jangka panjang. Level 4 hanya boleh diklaim berdasarkan hasil
compatibility test nyata, bukan sekadar keberadaan Extension Host.

Non-goals/hal yang perlu diputuskan secara eksplisit:

-   [ ] Tidak harus menyalin seluruh UI VS Code; Maestro mempertahankan
    identitas Cozy Cyber-Bento.
-   [ ] Tidak harus mendukung semua extension VS Code.
-   [ ] Tidak harus mengimplementasikan semua API VS Code sekaligus.
-   [ ] Tidak menjadikan Jira atau layanan cloud eksternal sebagai
    dependency Project Management.
-   [ ] Tidak menjadikan Git sebagai database operasional langsung.
-   [ ] Tidak menjalankan task, extension, atau konfigurasi workspace
    yang tidak dipercaya tanpa kebijakan keamanan.

------------------------------------------------------------------------

# 20. Release checklist

Sebelum menyatakan versi Maestro sebagai release yang memiliki klaim
kompatibilitas tertentu:

-   [ ] Publish daftar fitur yang sudah didukung.
-   [ ] Publish daftar fitur yang belum didukung.
-   [ ] Publish versi LSP/DAP/API compatibility yang ditargetkan.
-   [ ] Publish platform yang sudah diuji.
-   [ ] Semua P0 release blockers diselesaikan.
-   [ ] Tidak ada known data-loss issue.
-   [ ] Workspace migration diuji.
-   [ ] Extension compatibility diuji jika fitur extension dirilis.
-   [ ] Git destructive operations memerlukan konfirmasi yang sesuai.
-   [ ] Crash recovery diuji.
-   [ ] Dokumentasi konfigurasi tersedia.
-   [ ] Release notes mencantumkan breaking changes.
-   [ ] Backup/migration path tersedia untuk perubahan schema.
-   [ ] Compatibility claims sesuai hasil pengujian aktual.

------------------------------------------------------------------------

## Changelog dokumen

-   **v2 --- Consolidated Master Roadmap:** menggabungkan roadmap awal
    Maestro dengan tambahan analisis LSP, Git, Workspace, Search,
    Editor, Terminal, Configuration, Extension Ecosystem, DAP, Task
    Runner, Testing, Application Shell, Project Management, Offline
    Sync, Security, Reliability, QA, dan Distribution.
-   Status `[x]` pada fitur yang telah ditandai selesai di roadmap awal
    dipertahankan.
-   Semua fitur baru ditambahkan sebagai `[ ]`.
-   Item yang sudah ada diperluas melalui subtask baru tanpa menghapus
    status implementasi sebelumnya.

## Catatan pemeliharaan

Dokumen ini adalah master backlog, bukan urutan pengerjaan yang wajib
diikuti secara linear. Ketika implementasi dimulai, pecah item besar
menjadi issue yang lebih kecil. Catat dependency, acceptance criteria,
test coverage, dan milestone pada issue terkait. Jangan mengubah status
selesai hanya berdasarkan UI yang terlihat; verifikasi juga lifecycle,
error handling, data integrity, dan regression behavior.
