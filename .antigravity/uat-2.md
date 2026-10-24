# UAT 2 Feedback & Requirements Specification

## 1. Surat Tugas (ST) Requirements

* **Header Spacing:** Add additional space above/below the document header (`Header Space`).
* **Travel Date (*Tanggal Berangkat*):** Make the departure date optional (can be left blank).
* **Page Margins:** Set document margins to **Narrow**.
* **Directive Text (*Memerintahkan*):** 
  * Add 3 line spaces **above** the "MEMERINTAHKAN:" section.
  * Add 2 line spaces **below** the "MEMERINTAHKAN:" section.
* **Signature Formatting (Tanda Tangan):**
  * Remove the "PA" prefix text when signed by *Pengguna Anggaran*.
  * **Sekda Rule:** When signed by *Sekda*, do not show the job position line; list directly as `SEKRETARIS DAERAH KABUPATEN BANGGAI LAUT`.
* **Purpose Field (*Dalam Rangka*):** Add an unnumbered title/header field when there are multiple purpose items listed.

---

## 2. Surat Perjalanan Dinas (SPD) Requirements

* **Header Spacing:** Add additional space above/below the document header (`Header Space`).
* **SPD Numbering (*Nomor Surat*):** Ensure `KPA` code still displays on the SPD letter number string.
* **Travel Duration (*Lama Perjalanan Dinas*):** Item #7 (Travel Duration) must be made optional.
* **Page Margins:** Set margins to **Narrow** for both front and back pages.
* **Departure Date (*Tanggal Berangkat*):** Make optional; if blank, leave Item #7 empty/blank.
* **Signature Rules:** Update signature configuration to match new UAT guidelines.

---

## 3. Summary of Consolidated UAT Changes

| Feature Domain | ST (Surat Tugas) | SPD (Surat Perjalanan Dinas) |
| :--- | :--- | :--- |
| **Margins** | Narrow | Narrow (Front & Back) |
| **Header Spacing** | Extra spacing added | Extra spacing added |
| **Departure Date** | Optional | Optional (Leaves Item 7 blank) |
| **Duration Field** | - | Item 7 made optional |
| **Signatures** | Remove "PA" text; Direct Sekda text | Updated logic per rules |
