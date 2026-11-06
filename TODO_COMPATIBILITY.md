# 📋 VS Code Compatibility Roadmap & TODO List

Dokumen ini adalah panduan lengkap fitur dan kapabilitas **VS Code Compatibility** untuk **Maestro Studio**. Tujuannya adalah menghadirkan kemampuan ekosistem profesional setara Visual Studio Code dengan tetap mempertahankan antarmuka khas **Cozy Cyber-Bento** dan integrasi **Project Management bawaan**.

---

## 1. Language Server Protocol (LSP) & IntelliSense

Fitur inti yang membuat VS Code sangat unggul dalam navigasi dan pemahaman kode (*code intelligence*).

- [x] **Fondasi JSON-RPC over stdio**: Spawner proses child di Electron Main dan proxy Context Bridge ke Renderer.
- [x] **Document Synchronization**: `textDocument/didOpen`, `textDocument/didChange`, `textDocument/didSave`.
- [x] **Real-time Diagnostics**: Penanda garis gelombang (*squigglies*) merah (error) dan kuning (warning) di editor.
- [x] **Problems Panel**: Daftar error/warning interaktif dengan kemampuan klik untuk melompat ke baris & kolom terkait.
- [ ] **LSP Hover Tooltips (`textDocument/hover`)**:
  - [ ] Menampilkan tooltip tipe data, dokumentasi JSDoc/Markdown saat kursor berada di atas variabel/fungsi.
- [ ] **Advanced Auto-Completion & Snippets (`textDocument/completion`)**:
  - [ ] IntelliSense suggestion popup yang mem-proxy ke Language Server.
  - [ ] Dukungan snippet tab stops (`$1`, `$2`, `$0`).
- [ ] **Navigation & References**:
  - [ ] **Go to Definition (`F12` / `Ctrl+Click`)**: Melompat langsung ke definisi fungsi/variabel (antar file).
  - [ ] **Go to Type Definition**: Melompat ke deklarasi interface/tipe.
  - [ ] **Find All References (`Shift+F12`)**: Daftar seluruh lokasi pemanggilan fungsi/variabel di seluruh proyek.
  - [ ] **Breadcrumb Symbol Hierarchy**: Menampilkan hirarki fungsi/class di breadcrumb atas editor.
- [ ] **Refactoring & Code Actions**:
  - [ ] **Rename Symbol (`F2`)**: Mengubah nama variabel/fungsi di seluruh file proyek secara aman via `textDocument/rename`.
  - [ ] **Code Actions (`Ctrl+.`)**: Quick fix (misal auto-import modul yang belum di-import, hapus unused variables).
- [ ] **Formatting**:
  - [ ] **Format Document (`Shift+Alt+F`)**: Memformat kode via LSP / Prettier bawaan.
  - [ ] **Format on Save**: Opsi otomatis merapikan kode setiap kali file disimpan (`Ctrl+S`).
- [ ] **Language Server Auto-Spawner**:
  - [ ] Deteksi otomatis proyek TypeScript/JavaScript, Python, Go, Rust dan menjalankan LSP yang sesuai.

---

## 2. Git Version Control & Diff Viewer

Kompatibilitas alur kerja Git standar industri yang ada di VS Code.

- [x] **Git Branch Detection**: Menampilkan branch aktif saat ini di FloatingHUD dan Git tab.
- [x] **Git Status Panel**:
  - [x] Menampilkan daftar file yang diubah (*Modified* `M`), ditambah (*Untracked* `U`), atau dihapus (*Deleted* `D`).
- [x] **Side-by-Side Diff Viewer (Monaco Diff Editor)**:
  - [x] Membuka tab diff editor untuk membandingkan kode sebelum vs sesudah diubah (HEAD vs Working Tree).
  - [x] Visualisasi penambahan (hijau) dan penghapusan (merah) baris kode.
- [x] **Git Staging & Commit Flow**:
  - [x] Otomatis stage all file saat commit.
  - [x] Kotak input commit message + shortcut `Ctrl+Enter` untuk commit.
  - [x] Tombol Git Push & Git Pull langsung dari UI.
- [ ] **Editor Gutter Git Indicators**:
  - [ ] Garis hijau di samping nomor baris untuk baris baru.
  - [ ] Garis biru untuk baris yang dimodifikasi.
  - [ ] Segitiga merah untuk baris yang dihapus.

---

## 3. Workspace, File System & File Watcher

Memastikan file di editor selalu sinkron dengan sistem operasi dan terminal.

- [x] **Open Directory / Workspace**: Membuka folder proyek lokal.
- [x] **Recursive Directory Tree**: Navigasi folder bertingkat.
- [x] **File Operations**:
  - [x] Create New File
  - [x] Create New Folder
  - [x] Delete File / Folder (dengan dialog konfirmasi)
  - [x] **Rename File / Folder** (inline input dengan tombol edit)
  - [ ] **Duplicate File**
  - [ ] **Copy Path & Copy Relative Path**
- [ ] **Real-time File System Watcher (`chokidar`)**:
  - [ ] Memantau perubahan file dari luar aplikasi (misal saat `git checkout`, `npm install`, atau kompilasi build).
  - [ ] Otomatis merefresh tree explorer dan me-reload file di editor jika diubah aplikasi lain.
- [ ] **Reveal in OS Explorer**:
  - [ ] Opsi klik kanan untuk membuka file/folder di File Explorer Windows / Finder macOS.

---

## 4. Search in Files / Global Search (`Ctrl+Shift+F`)

Pencarian menyeluruh di seluruh basis kode seperti pada VS Code.

- [x] **Quick File Jump (`Ctrl+P`)**: Mencari nama file dan task di workspace.
- [x] **In-file Find & Replace (`Ctrl+F` / `Ctrl+H`)**: Bawaan Monaco Editor di dalam file aktif.
- [x] **Workspace Global Search (`Ctrl+Shift+F`)**:
  - [x] Input pencarian teks dan regex di seluruh isi file proyek.
  - [x] Opsi *Match Case*, *Match Whole Word*, dan *Use Regular Expression*.
  - [x] Tampilan hasil pencarian yang dikelompokkan per file dengan nomor baris dan cuplikan teks.
  - [x] Klik hasil pencarian untuk langsung melompat ke file, baris, dan kolom terkait.
  - [x] **Global Replace All**: Mengganti teks yang cocok di seluruh file sekaligus.

---

## 5. VS Code Keybindings & Editor Ergonomics

Memastikan memori otot (*muscle memory*) developer dari VS Code langsung bekerja.

- [x] `Ctrl + S`: Simpan file aktif.
- [x] `Ctrl + P`: Quick open / Omni-Jump.
- [x] `Ctrl + \``: Buka / Tutup Terminal & Problems Deck.
- [x] `Ctrl + W`: Menutup tab aktif.
- [x] `Ctrl + Enter`: Commit perubahan Git.
- [x] `Ctrl + Shift + F`: Buka panel pencarian global seluruh file (*Search in Files*).
- [x] `Ctrl + B`: Toggle visibilitas sidebar kiri (*Workspace Deck*).
- [ ] `Ctrl + Shift + P`: Command Palette lengkap untuk menjalankan semua perintah editor.
- [ ] `Ctrl + /`: Toggle Line Comment (komentar kode otomatis sesuai sintaks bahasa).
- [ ] `Shift + Alt + A`: Toggle Block Comment.
- [ ] `Alt + Up / Down`: Memindahkan baris kode ke atas atau ke bawah (*Move Line*).
- [ ] `Shift + Alt + Down`: Menduplikasi baris kode (*Duplicate Line*).
- [ ] `Ctrl + D`: Menyeleksi kemunculan kata berikutnya (*Add Next Occurrence / Multi-cursor*).

---

## 6. Multi-Terminal & Shell Profiles

Pengalaman terminal bawaan yang setara dengan terminal terintegrasi VS Code.

- [x] **Interactive Shell**: PowerShell / Bash berbasis `@xterm/xterm` dengan Electron IPC.
- [x] **Clear & Resize Support**: Fitur fit dan clear terminal.
- [ ] **Multiple Terminal Tabs**:
  - [ ] Tombol `+` untuk membuat beberapa sesi terminal simultan (Terminal 1, Terminal 2, Terminal 3).
  - [ ] Mengganti nama tab terminal (*Rename Terminal*).
- [ ] **Shell Profile Selector**:
  - [ ] Kemampuan memilih shell yang diinginkan: PowerShell, Command Prompt (CMD), Git Bash, atau WSL (Ubuntu).
- [ ] **Split Terminal View**:
  - [ ] Menampilkan dua sesi terminal berdampingan (*Side-by-side terminal*).

---

## 7. VS Code Configuration (`.vscode/settings.json`)

Kompatibilitas dengan pengaturan workspace tim.

- [ ] **Membaca `.vscode/settings.json`**:
  - [ ] `editor.tabSize`: Ukuran indentasi (2 atau 4 spasi).
  - [ ] `editor.insertSpaces`: Menggunakan spasi vs tab.
  - [ ] `editor.wordWrap`: Bungkus baris teks (`on` / `off`).
  - [ ] `editor.formatOnSave`: Format otomatis saat save.
  - [ ] `files.exclude`: Pola file/folder yang disembunyikan dari tree explorer.
- [ ] **UI Settings Preferences**:
  - [ ] Modal pengaturan grafis untuk mengubah tema, ukuran font, dan preferensi editor tanpa perlu mengedit JSON manual.

---

## 8. Integrated Project Management Synergy (Fitur Unik Maestro)

Fitur khas Maestro Studio yang menghubungkan dunia code editor dengan project tracking:

- [x] **Dual Deck Split View**: Layar terbelah 50:50 antara Editor dan Kanban Board.
- [x] **HTML5 Drag-and-Drop Tasks**: Memindahkan task antar status (*Backlog*, *To Do*, *In Progress*, *Review*, *Done*).
- [x] **Subtasks Checklist**: Daftar langkah pengerjaan per task issue.
- [x] **Code-Link**: Menautkan task issue ke file kode fisik.
- [x] **Focus Mode**: Menyorot task aktif di header dan editor banner.
- [ ] **Branch-per-Task Automation**:
  - [ ] Opsi membuat Git branch baru otomatis saat task dipindahkan ke status *"In Flight"* (misal `feat/task-123-lsp-client`).
- [ ] **Git Commit Auto-Link**:
  - [ ] Menambahkan ID task otomatis pada commit message (misal `[#task-123] implement hover`).
