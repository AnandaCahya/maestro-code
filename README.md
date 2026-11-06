# Maestro Studio

**Maestro Studio** adalah modern hybrid workspace yang menggabungkan kekuatan **Code Editor kelas profesional** (ditenagai Monaco Editor & Language Server Protocol) dengan **Project Management terintegrasi** (Linear-style Kanban & Task Tracker) dan **Cyber Terminal bawaan**.

---

## ✨ Fitur Unggulan

1. **Desain Cozy Minimalist**:
   - Palet warna hangat *Warm Charcoal & Honey Amber* (`#121318`, `#191b22`, `#e0a96d`) yang nyaman di mata saat sesi koding berjam-jam.
   - Custom Monaco Editor Theme (`cozy-dark`) dengan syntax highlighting lembut dan kursor bernuansa madu hangat.

2. **Omni-Mode Navigation**:
   - **Code Canvas**: Fokus penuh pada penulisan kode dengan floating pill tabs dan breadcrumbs.
   - **Dual Deck (Split View)**: Editor dan Kanban tampil berdampingan secara simultan — Anda dapat mengoding sambil mencentang task tanpa perlu berpindah tab!
   - **Project Deck**: Tampilan Kanban board penuh untuk mengelola backlog, sprint, dan issue.

3. **Interactive File Management**:
   - Buat file baru (`+`) dan folder baru (`+📁`) langsung dari Workspace Deck.
   - Hapus file/folder dengan tombol trash saat hover.
   - Live filter pencarian file instan.

4. **Native Drag & Drop Kanban & Subtasks**:
   - Pindahkan kartu tugas antar kolom (*Backlog*, *To Do*, *In Progress*, *Review*, *Done*) dengan drag and drop intuitif.
   - **Subtasks Checklist**: Kelola checklist langkah pengerjaan di setiap task issue.
   - **Code-Link**: Tautkan task langsung ke file kode. Klik tombol file pada card task untuk langsung membuka file terkait di editor.
   - **Focus Mode**: Sematkan task yang sedang dikerjakan agar terpampang di header dan status bar.
   - Tersimpan otomatis di `.maestro/project.json` dalam workspace.

5. **Tabbed Bottom Deck: Terminal + Problems (LSP Diagnostics)**:
   - Tab **Terminal**: Terminal interaktif berbasis `@xterm/xterm` terhubung langsung ke PowerShell / Bash via IPC.
   - Tab **Problems**: Daftar error & warning real-time dari Language Server dan Monaco Editor. Klik item problem langsung melompat ke baris & kolom terkait di editor!
   - Shortcut cepat: `Ctrl + \`` (backtick) untuk membuka/menutup panel bawah.

6. **Omni-Jump Command Palette (`Ctrl + P`)**:
   - Modal pencarian cepat untuk melompat antar file di seluruh direktori workspace atau berpindah ke task tertentu secara instan.

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
- `Ctrl + \``: Buka / Tutup Bottom Deck (Terminal & Problems)
- `Ctrl + S`: Simpan file ke sistem & kirim sinyal ke LSP
