# Mestro Code

**Mestro Code** adalah modern hybrid workspace yang menggabungkan kekuatan **Code Editor kelas profesional** (ditenagai Monaco Editor & Language Server Protocol) dengan **Project Management terintegrasi** (Linear-style Kanban & Task Tracker) dan **Cyber Terminal bawaan**.

---

## ✨ Fitur Unggulan

1. **Desain Cozy Minimalist**:
   - Palet warna hangat *Warm Charcoal & Honey Amber* (`#121318`, `#191b22`, `#e0a96d`) yang nyaman di mata saat sesi koding berjam-jam.
   - Custom Monaco Editor Theme (`cozy-dark`) dengan syntax highlighting lembut dan kursor bernuansa madu hangat.

2. **Omni-Mode Navigation**:
   - **Code Canvas**: Fokus penuh pada penulisan kode dengan floating pill tabs dan breadcrumbs.
   - **Dual Deck (Split View)**: Editor dan Kanban tampil berdampingan secara simultan — Anda dapat mengoding sambil mencentang task tanpa perlu berpindah tab!
   - **Project Deck**: Tampilan Kanban board penuh untuk mengelola backlog, sprint, dan issue.

3. **Language Server Protocol (LSP) & Code Intelligence**:
   - **LSP Hover Tooltips**: Menampilkan tipe data & dokumentasi saat mouse diarahkan ke simbol kode.
   - **Go to Definition (`F12` / `Ctrl + Click`)**: Melompat langsung ke deklarasi/definisi fungsi atau variabel.
   - **Format Document (`Shift + Alt + F`)**: Merapikan format kode secara instan.
   - Sinkronisasi dokumen real-time (`didOpen`, `didChange`, `didSave`).
   - Penanda diagnostik garis gelombang (*squigglies*) langsung di editor.

4. **Workspace File Management, Watcher & Search in Files (`Ctrl + Shift + F`)**:
   - **Real-Time File System Watcher**: Sinkronisasi otomatis saat ada file yang diubah/dibuat di luar aplikasi (misal saat `git checkout` atau menjalankan CLI di terminal), tanpa overwrite file yang sedang diedit.
   - **Aksi Cepat Berkas**: Reveal in File Explorer / OS, Copy Relative Path, Rename (`F2`), dan Delete.
   - Buat file baru (`+`), buat folder baru (`+📁`), dan filter cepat nama file di tree explorer.
   - **Pencarian Global Seluruh File**: Cari kata/regex di seluruh berkas proyek dengan filter *Case Sensitive*, *Whole Word*, dan *Regex*, serta fitur **Replace All**.

5. **Git Version Control & Side-by-Side Diff Viewer**:
   - Deteksi otomatis perubahan status Git (*Modified*, *Untracked*, *Deleted*).
   - **Monaco Diff Editor**: Klik file yang dimodifikasi untuk melihat komparasi baris demi baris sebelum vs sesudah diubah.
   - **Branch-per-Task & Git Tag Link**: Buat dan checkout branch khusus task secara otomatis, serta sematkan tag task aktif `[#id]` ke commit message dengan satu klik.
   - Git Commit langsung dari UI dengan shortcut `Ctrl + Enter`.

6. **Native Drag & Drop Kanban & Subtasks**:
   - Pindahkan kartu tugas antar kolom (*Backlog*, *To Do*, *In Progress*, *Review*, *Done*) dengan drag and drop intuitif.
   - **Branch-per-Task Automation**: Tombol branch pada setiap kartu task untuk membuat/checkout branch Git terkait (`feat/<id>-<slug>`).
   - **Subtasks Checklist**: Kelola checklist langkah pengerjaan di setiap task issue.
   - **Code-Link**: Tautkan task langsung ke file kode. Klik tombol file pada card task untuk langsung membuka file terkait di editor.
   - **Focus Mode**: Sematkan task yang sedang dikerjakan agar terpampang di header dan status bar.
   - Tersimpan otomatis di `.maestro/project.json` dalam workspace.

7. **Tabbed Bottom Deck: Multi-Terminal + Problems (LSP Diagnostics)**:
   - **Multi-Terminal Tabs**: Jalankan beberapa sesi terminal secara independen (Terminal 1, Terminal 2, dst) dengan buffer dan riwayat yang tetap tersimpan saat berpindah tab.
   - **Shell Profile Selector**: Deteksi otomatis shell sistem dengan menu pemilih untuk membuat terminal dengan **PowerShell**, **Command Prompt (CMD)**, **Git Bash**, atau **WSL (Linux)**.
   - Tab **Problems**: Daftar error & warning real-time dari Language Server dan Monaco Editor. Klik item problem langsung melompat ke baris & kolom terkait di editor!
   - Shortcut cepat: `Ctrl + \`` (backtick) untuk membuka/menutup panel bawah.

8. **Omni-Jump Command Palette (`Ctrl + P`)**:
   - Modal pencarian cepat untuk melompat antar file di seluruh direktori workspace atau berpindah ke task tertentu secara instan.

9. **VS Code Settings Compatibility & Preferences Modal (`Ctrl + ,`)**:
   - Membaca dan menulis secara sinkron file `.vscode/settings.json` di dalam workspace (`editor.tabSize`, `editor.fontSize`, `editor.wordWrap`, `editor.formatOnSave`, `editor.minimap.enabled`, `editor.lineNumbers`).
   - Modal preferensi visual bergaya Cyber-Bento yang menerapkan pengaturan langsung secara reaktif ke Monaco Editor tanpa perlu reload aplikasi.
   - Fitur **Format on Save** otomatis yang menjalankan pemformatan LSP / Prettier saat file disimpan (`Ctrl + S`).

---

## 🚀 Menjalankan Aplikasi

```bash
# Menjalankan aplikasi dalam mode Development (Live HMR)
pnpm run dev

# Kompilasi paket produksi
pnpm run build

# Menghasilkan installer executable Windows (.exe)
pnpm run build:win
```

### Shortcut Bawaan
- `Ctrl + P`: Buka Omni-Jump (pencarian file & task)
- `Ctrl + Shift + P`: Buka **Command Palette** (ketik `>` untuk menjalankan aksi editor)
- `Ctrl + ,`: Buka Modal Pengaturan & Preferensi Editor (`.vscode/settings.json`)
- `Ctrl + Shift + F`: Buka panel pencarian seluruh file (*Search in Files*)
- `Ctrl + B`: Buka / Tutup sidebar kiri (*Workspace Deck*)
- `Ctrl + \``: Buka / Tutup Bottom Deck (Terminal & Problems)
- `Ctrl + S`: Simpan file ke sistem & kirim sinyal ke LSP (dengan *Format on Save*)
- `Ctrl + W`: Tutup tab file aktif
- `Ctrl + /`: Toggle Line Comment (komentar satu baris)
- `Shift + Alt + A`: Toggle Block Comment (komentar blok)
- `Alt + Up / Down`: Pindahkan baris kode ke atas atau ke bawah (*Move Line*)
- `Shift + Alt + Down / Up`: Duplikasi baris kode (*Duplicate Line*)
- `Ctrl + D`: Multi-cursor seleksi kemunculan kata berikutnya (*Add Next Occurrence*)
- `Shift + Alt + F`: Format dokumen aktif
- `F12` / `Ctrl + Click`: Lompat ke Definisi (*Go to Definition*)
- `Ctrl + Enter`: Eksekusi Git Commit saat berada di input commit
