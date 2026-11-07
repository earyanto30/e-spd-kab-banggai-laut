const path = require('node:path');
const fs = require('node:fs');

// Load root .env file by searching upwards from process.cwd() and __dirname
(() => {
  const searchStarts = [process.cwd(), __dirname];
  for (const start of searchStarts) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      const candidate = path.resolve(dir, '.env');
      if (fs.existsSync(candidate) && process.loadEnvFile) {
        process.loadEnvFile(candidate);
        return;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
})();

const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('node:crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('==> Starting Prisma Database Seeder...');

  // 1. Initial Jabatan Master Data
  const defaultJabatanList = [
    { nama: 'Sekretaris Daerah', keterangan: 'Pimpinan Tinggi Pratama Sekretariat Daerah', urutan: 1 },
    { nama: 'Staf Ahli Sekretariat Daerah', keterangan: 'Staf Ahli Bupati / Sekretariat Daerah', urutan: 2 },
    { nama: 'Asisten Pemerintahan dan Kesra', keterangan: 'Asisten I Bidang Pemerintahan dan Kesejahteraan Rakyat', urutan: 3 },
    { nama: 'Asisten Perekonomian dan Pembangunan', keterangan: 'Asisten II Bidang Perekonomian dan Pembangunan', urutan: 4 },
    { nama: 'Asisten Administrasi Umum', keterangan: 'Asisten III Bidang Administrasi Umum', urutan: 5 },
    { nama: 'Kepala Bagian Umum', keterangan: 'Kepala Bagian Umum Sekretariat Daerah (KPA)', urutan: 6 },
    { nama: 'Kepala Bagian Umum dan Protokol', keterangan: 'Kepala Bagian Umum dan Protokol Sekretariat Daerah', urutan: 7 },
    { nama: 'Kepala Bagian Hukum', keterangan: 'Kepala Bagian Hukum Sekretariat Daerah', urutan: 8 },
    { nama: 'Kepala Bagian Organisasi', keterangan: 'Kepala Bagian Organisasi Sekretariat Daerah', urutan: 9 },
    { nama: 'Kepala Bagian Protokol dan Komunikasi Pimpinan', keterangan: 'Kepala Bagian Prokopim Sekretariat Daerah', urutan: 10 },
    { nama: 'Kepala Bagian Perekonomian dan SDA', keterangan: 'Kepala Bagian Perekonomian dan Sumber Daya Alam', urutan: 11 },
    { nama: 'Kepala Bagian Pengadaan Barang dan Jasa', keterangan: 'Kepala Bagian Pengadaan Barang dan Jasa (PBJ)', urutan: 12 },
    { nama: 'Kepala Bagian Tata Pemerintahan', keterangan: 'Kepala Bagian Tata Pemerintahan Sekretariat Daerah', urutan: 13 },
    { nama: 'Kepala Bagian Kesejahteraan Rakyat', keterangan: 'Kepala Bagian Kesra Sekretariat Daerah', urutan: 14 },
    { nama: 'Kepala Bagian Perencanaan dan Keuangan', keterangan: 'Kepala Bagian Perencanaan dan Keuangan Sekretariat Daerah', urutan: 15 },
    { nama: 'Kepala Sub Bagian Tata Usaha dan Kepegawaian', keterangan: 'Kasubag TU dan Kepegawaian Bagian Umum', urutan: 16 },
    { nama: 'Kepala Sub Bagian Rumah Tangga dan Perlengkapan', keterangan: 'Kasubag Rumah Tangga Bagian Umum', urutan: 17 },
    { nama: 'Pranata Komputer Ahli Muda', keterangan: 'Jabatan Fungsional Pranata Komputer Ahli Muda', urutan: 18 },
    { nama: 'Pengelola Administrasi Perjalanan Dinas', keterangan: 'Pelaksana Pengelola Administrasi SPD', urutan: 19 },
    { nama: 'Analis Kebijakan', keterangan: 'Jabatan Fungsional Analis Kebijakan', urutan: 20 },
    { nama: 'Analis Keuangan Pusat dan Daerah', keterangan: 'Jabatan Fungsional Analis Keuangan Pusat dan Daerah', urutan: 21 },
    { nama: 'Pengadministrasi Umum', keterangan: 'Staf Pelaksana Pengadministrasi Umum', urutan: 22 },
    { nama: 'Bendahara Pengeluaran', keterangan: 'Bendahara Pengeluaran Bagian Umum', urutan: 23 },
  ];

  const jabatanMap = new Map();
  for (const j of defaultJabatanList) {
    const savedJabatan = await prisma.jabatan.upsert({
      where: { nama: j.nama },
      update: {
        keterangan: j.keterangan,
        urutan: j.urutan,
      },
      create: j,
    });
    jabatanMap.set(savedJabatan.nama, savedJabatan);
  }
  console.log(`[Seed] Seeded ${defaultJabatanList.length} master Jabatan records.`);

  // Helper function to resolve best matching Jabatan
  function resolveJabatan(title) {
    if (!title) return null;
    const lower = title.toLowerCase();
    if (lower.includes('sekretaris daerah') || lower.includes('super admin')) return jabatanMap.get('Sekretaris Daerah') || null;
    if (lower.includes('staf ahli')) return jabatanMap.get('Staf Ahli Sekretariat Daerah') || null;
    if (lower.includes('asisten')) return jabatanMap.get('Asisten Pemerintahan dan Kesra') || null;
    if (lower.includes('umum dan protokol')) return jabatanMap.get('Kepala Bagian Umum dan Protokol') || null;
    if (lower.includes('bagian umum')) return jabatanMap.get('Kepala Bagian Umum') || null;
    if (lower.includes('bagian hukum')) return jabatanMap.get('Kepala Bagian Hukum') || null;
    if (lower.includes('organisasi')) return jabatanMap.get('Kepala Bagian Organisasi') || null;
    if (lower.includes('pranata komputer')) return jabatanMap.get('Pranata Komputer Ahli Muda') || null;
    if (lower.includes('perjalanan dinas') || lower.includes('administrasi perjalanan')) return jabatanMap.get('Pengelola Administrasi Perjalanan Dinas') || null;
    if (lower.includes('analis kebijakan')) return jabatanMap.get('Analis Kebijakan') || null;
    return jabatanMap.get('Pengadministrasi Umum') || null;
  }

  // 2. Initial ASN / Pegawai Master Data
  // In clean fresh installation, we do not insert dummy ASN records.
  // Instead, the system onboarding process will configure official KPA and PA officers.
  // Dummy records are only seeded if explicitly requested via SEED_DUMMY_DATA="true"
  const shouldSeedDummyAsn = process.env.SEED_DUMMY_DATA === 'true';

  const defaultAsnList = shouldSeedDummyAsn ? [
    {
      nip: process.env.INITIAL_ADMIN_NIP || '198801152010011002',
      nama: process.env.INITIAL_ADMIN_NAME || 'Fadli A. Arsad',
      pangkat: 'Pembina Utama Muda',
      golongan: 'IV/c',
      jabatan: 'Sekretaris Daerah',
      unitKerja: 'Sekretariat Daerah Kab. Banggai Laut',
      isASN: true,
      isPenandatangan: true,
    },
    {
      nip: '19700830 200312 1 003',
      nama: 'ARSID HAMIDI, SH',
      pangkat: 'Pembina',
      golongan: 'IV/a',
      jabatan: 'Kepala Bagian Umum',
      unitKerja: 'Bagian Umum Sekretariat Daerah',
      isASN: true,
      isPenandatangan: true,
    },
    {
      nip: '19750510 200012 1 004',
      nama: 'Saiful U. Usuria, SE., M.Si',
      pangkat: 'Pembina Utama Muda',
      golongan: 'IV/c',
      jabatan: 'Sekretaris Daerah',
      unitKerja: 'Sekretariat Daerah',
      isASN: true,
      isPenandatangan: true,
    },
    {
      nip: '19680512 199403 1 004',
      nama: 'Drs. H. Bambang Soeprapto, M.Si',
      pangkat: 'Pembina Utama Madya',
      golongan: 'IV/d',
      jabatan: 'Staf Ahli Sekretariat Daerah',
      unitKerja: 'Sekretariat Daerah',
      isASN: true,
      isPenandatangan: true,
    },
    {
      nip: '19740821 199903 2 002',
      nama: 'Ir. Hj. Siti Rahmawati, MT',
      pangkat: 'Pembina Utama Muda',
      golongan: 'IV/c',
      jabatan: 'Asisten Pemerintahan dan Kesra',
      unitKerja: 'Sekretariat Daerah - Asisten I',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19850214 200412 1 001',
      nama: 'Dedy Kurniawan, S.STP, M.AP',
      pangkat: 'Pembina',
      golongan: 'IV/a',
      jabatan: 'Kepala Bagian Umum dan Protokol',
      unitKerja: 'Sekretariat Daerah - Bagian Umum',
      isASN: true,
      isPenandatangan: true,
    },
    {
      nip: '19890610 201101 2 008',
      nama: 'Ratna Juwita, S.H., M.H.',
      pangkat: 'Penata Tingkat I',
      golongan: 'III/d',
      jabatan: 'Kepala Bagian Hukum',
      unitKerja: 'Sekretariat Daerah - Bagian Hukum',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19920315 201802 1 003',
      nama: 'Fajar Prasetyo, S.Kom',
      pangkat: 'Penata',
      golongan: 'III/c',
      jabatan: 'Pranata Komputer Ahli Muda',
      unitKerja: 'Sekretariat Daerah - Bagian Organisasi',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19951104 202012 2 011',
      nama: 'Nurul Aini, A.Md',
      pangkat: 'Pengatur',
      golongan: 'II/c',
      jabatan: 'Pengelola Administrasi Perjalanan Dinas',
      unitKerja: 'Sekretariat Daerah - Bagian Umum',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19900720 202321 1 005',
      nama: 'Eko Wahyudi, S.AP',
      pangkat: 'Ahli Pertama',
      golongan: 'IX',
      jabatan: 'Analis Kebijakan',
      unitKerja: 'Sekretariat Daerah - Bagian Perekonomian',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19820412 200801 1 009',
      nama: 'Hasanuddin, S.Sos',
      pangkat: 'Penata Tingkat I',
      golongan: 'III/d',
      jabatan: 'Kepala Sub Bagian Tata Usaha dan Kepegawaian',
      unitKerja: 'Bagian Umum Sekretariat Daerah',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19870918 201001 2 006',
      nama: 'Dewi Lestari, S.E.',
      pangkat: 'Penata',
      golongan: 'III/c',
      jabatan: 'Bendahara Pengeluaran',
      unitKerja: 'Bagian Umum Sekretariat Daerah',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19930122 201903 1 002',
      nama: 'Rian Pratama, S.STP',
      pangkat: 'Penata Muda Tingkat I',
      golongan: 'III/b',
      jabatan: 'Kepala Sub Bagian Rumah Tangga dan Perlengkapan',
      unitKerja: 'Bagian Umum Sekretariat Daerah',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19960515 202112 2 004',
      nama: 'Indah Permatasari, S.Tr.IP',
      pangkat: 'Penata Muda',
      golongan: 'III/a',
      jabatan: 'Analis Kebijakan',
      unitKerja: 'Bagian Organisasi Sekretariat Daerah',
      isASN: true,
      isPenandatangan: false,
    },
    {
      nip: '19981203 202203 1 001',
      nama: 'Ahmad Fauzi, A.Md.Kom',
      pangkat: 'Pengatur',
      golongan: 'II/c',
      jabatan: 'Pranata Komputer Ahli Muda',
      unitKerja: 'Bagian Protokol dan Komunikasi Pimpinan',
      isASN: true,
      isPenandatangan: false,
    },
  ] : [];

  for (const pegawaiData of defaultAsnList) {
    const matchedJabatan = resolveJabatan(pegawaiData.jabatan);
    const jabatanId = matchedJabatan ? matchedJabatan.id : null;
    const finalJabatan = matchedJabatan ? matchedJabatan.nama : pegawaiData.jabatan;

    await prisma.pegawai.upsert({
      where: { nip: pegawaiData.nip },
      update: {
        nama: pegawaiData.nama,
        pangkat: pegawaiData.pangkat,
        golongan: pegawaiData.golongan,
        jabatan: finalJabatan,
        jabatanId: jabatanId,
        unitKerja: pegawaiData.unitKerja,
        isASN: pegawaiData.isASN,
        isPenandatangan: pegawaiData.isPenandatangan,
      },
      create: {
        ...pegawaiData,
        jabatan: finalJabatan,
        jabatanId: jabatanId,
      },
    });
  }

  // Also link any existing Pegawai in database whose jabatanId is still null
  const unlinkedPegawai = await prisma.pegawai.findMany({
    where: { jabatanId: null },
  });
  for (const p of unlinkedPegawai) {
    const matched = resolveJabatan(p.jabatan);
    if (matched) {
      await prisma.pegawai.update({
        where: { id: p.id },
        data: {
          jabatanId: matched.id,
          jabatan: matched.nama,
        },
      });
    }
  }
  console.log(`[Seed] Seeded and linked ASN Pegawai records with master Jabatan.`);

  // 3. User Accounts
  // Default clean seed only creates the single INITIAL_ADMIN account (Super Admin).
  // Additional dummy user accounts are only created if SEED_DUMMY_DATA="true".
  const allPegawai = await prisma.pegawai.findMany({ orderBy: { nip: 'asc' } });
  const shouldSeedDummyUsers = process.env.SEED_DUMMY_DATA === 'true';

  const predefinedUsers = [
    {
      username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
      name: process.env.INITIAL_ADMIN_NAME || 'Fadli A. Arsad',
      email: process.env.INITIAL_ADMIN_EMAIL || 'fadli.arsad@banggailautkab.go.id',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'admin123',
      role: 'SUPER_ADMIN',
      nip: process.env.INITIAL_ADMIN_NIP || '198801152010011002',
    },
  ];

  if (shouldSeedDummyUsers) {
    predefinedUsers.push(
      {
        username: 'operator',
        name: 'ARSID HAMIDI, SH',
        email: 'arsid.hamidi@banggailautkab.go.id',
        password: 'admin123',
        role: 'ADMIN',
        nip: '19700830 200312 1 003',
      },
      {
        username: 'staff',
        name: 'Fajar Prasetyo, S.Kom',
        email: 'fajar.prasetyo@banggailautkab.go.id',
        password: 'user123',
        role: 'STAFF',
        nip: '19920315 201802 1 003',
      },
      {
        username: 'user',
        name: 'Nurul Aini, A.Md',
        email: 'nurul.aini@banggailautkab.go.id',
        password: 'user123',
        role: 'USER',
        nip: '19951104 202012 2 011',
      }
    );

    // Also create accounts for other Pegawai to trigger pagination (>10 rows) in dummy mode
    for (const p of allPegawai) {
      if (predefinedUsers.some((u) => u.nip === p.nip)) continue;
      const cleanFirstName = p.nama
        .toLowerCase()
        .replace(/^(drs\.|dr\.|ir\.|h\.|hj\.)\s*/g, '')
        .split(/[\s,.]+/)[0] || 'pegawai';
      const role = p.isPenandatangan ? 'ADMIN' : p.jabatan.toLowerCase().includes('pranata') || p.jabatan.toLowerCase().includes('analis') ? 'STAFF' : 'USER';
      predefinedUsers.push({
        username: cleanFirstName,
        name: p.nama,
        email: `${cleanFirstName}@banggailautkab.go.id`,
        password: 'user123',
        role,
        nip: p.nip,
      });
    }
  }

  for (const u of predefinedUsers) {
    const linked = await prisma.pegawai.findUnique({
      where: { nip: u.nip },
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: u.username },
          { username: u.nip },
          ...(linked ? [{ pegawaiId: linked.id }] : []),
        ],
      },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: true,
          pegawaiId: linked ? linked.id : null,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          username: u.username,
          name: u.name,
          email: u.email,
          password: hashPassword(u.password),
          role: u.role,
          isActive: true,
          pegawaiId: linked ? linked.id : null,
        },
      });
    }
  }
  console.log(`[Seed] Seeded ${predefinedUsers.length} User accounts (triggers >10 pagination).`);

  // 4. Initial Kop Surat Templates (6 items to trigger >5 pagination)
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'kop-surat');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const defaultPdfName = 'kop_setda_default.pdf';
  const defaultPdfPath = path.join(uploadDir, defaultPdfName);
  if (!fs.existsSync(defaultPdfPath)) {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 260 >>
stream
BT
/F1 16 Tf
50 790 Td
(PEMERINTAH KABUPATEN BANGGAI LAUT) Tj
/F1 18 Tf
0 -24 Td
(SEKRETARIAT DAERAH) Tj
/F1 10 Tf
0 -18 Td
(Jl. Jogugu Sopamena No. 01, Banggai - Kode Pos 94791) Tj
0 -14 Td
(Telepon: (0453) 21101  -  Email: setda@banggailautkab.go.id) Tj
ET
0 0 0 RG
2.5 w
50 715 m 545 715 l S
0.7 w
50 710 m 545 710 l S
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000556 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
631
%%EOF
`;
    fs.writeFileSync(defaultPdfPath, Buffer.from(rawPdf, 'utf-8'));
    console.log('[Seed] Created default Kop Surat PDF file on disk.');
  }

  const defaultKopList = [
    {
      id: 'kop-1',
      nama: 'Kop 1 (Sekda Kab. Banggai Laut)',
      keterangan: 'Kop surat dinas resmi Sekretariat Daerah Kabupaten Banggai Laut untuk SPD',
      fileName: 'kop_sekda_banggai_laut.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'A4',
      isDefault: true,
    },
    {
      id: 'kop-2',
      nama: 'Kop Bagian Umum (Sekretariat Daerah)',
      keterangan: 'Kop surat operasional Bagian Umum Sekretariat Daerah',
      fileName: 'kop_bagian_umum.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'A4',
      isDefault: false,
    },
    {
      id: 'kop-3',
      nama: 'Kop Bupati Banggai Laut',
      keterangan: 'Kop dinas Bupati Banggai Laut untuk penugasan luar daerah tingkat kepala daerah',
      fileName: 'kop_bupati.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'A4',
      isDefault: false,
    },
    {
      id: 'kop-4',
      nama: 'Kop Sekretariat Daerah (Format Folio / F4)',
      keterangan: 'Template resmi ukuran kertas F4 / Folio dinas',
      fileName: 'kop_setda_folio.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'F4',
      isDefault: false,
    },
    {
      id: 'kop-5',
      nama: 'Kop Bagian Protokol dan Komunikasi Pimpinan',
      keterangan: 'Kop resmi Prokopim Sekretariat Daerah Kab. Banggai Laut',
      fileName: 'kop_prokopim.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'A4',
      isDefault: false,
    },
    {
      id: 'kop-6',
      nama: 'Kop Bagian Hukum Sekretariat Daerah',
      keterangan: 'Kop resmi Bagian Hukum untuk konsultasi produk hukum daerah',
      fileName: 'kop_hukum.pdf',
      storedFileName: defaultPdfName,
      fileSize: '1.2 KB',
      paperSize: 'A4',
      isDefault: false,
    },
  ];

  for (const kop of defaultKopList) {
    const existing = await prisma.kopSurat.findUnique({ where: { id: kop.id } });
    if (!existing) {
      await prisma.kopSurat.create({ data: kop });
    }
  }
  console.log(`[Seed] Seeded ${defaultKopList.length} Kop Surat templates (triggers >5 pagination).`);

  // 5. Initial Dasar Hukum References (7 items to trigger >5 pagination)
  const defaultDasarHukum = [
    {
      judul: 'UU No. 09 Tahun 2015 tentang Pemerintahan Daerah',
      isi: 'Undang-undang Nomor 09 Tahun 2015 tentang Perubahan kedua atas Undang-undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah (Lembaran Negara Republik Indonesia Tahun 2015 Nomor 5679)',
      urutan: 1,
    },
    {
      judul: 'Perbup Banggai Laut tentang Perjalanan Dinas',
      isi: 'Peraturan Bupati Banggai Laut tentang Pedoman Pelaksanaan dan Pertanggungjawaban Perjalanan Dinas di Lingkungan Pemerintah Kabupaten Banggai Laut',
      urutan: 2,
    },
    {
      judul: 'Peraturan Daerah Kabupaten Banggai Laut Nomor 5 Tahun 2024',
      isi: 'Peraturan Daerah Kabupaten Banggai Laut tentang Anggaran Pendapatan dan Belanja Daerah (APBD) Tahun Anggaran Berjalan.',
      urutan: 3,
    },
    {
      judul: 'Permendagri No. 77 Tahun 2020 tentang Pengelolaan Keuangan Daerah',
      isi: 'Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020 tentang Pedoman Teknis Pengelolaan Keuangan Daerah.',
      urutan: 4,
    },
    {
      judul: 'Perpres No. 33 Tahun 2020 tentang Standar Harga Satuan Regional',
      isi: 'Peraturan Presiden Republik Indonesia Nomor 33 Tahun 2020 tentang Standar Harga Satuan Regional.',
      urutan: 5,
    },
    {
      judul: 'PMK No. 119/PMK.02/2020 tentang Standar Biaya Masukan',
      isi: 'Peraturan Menteri Keuangan Nomor 119/PMK.02/2020 tentang Standar Biaya Masukan Tahun Anggaran Berkenaan.',
      urutan: 6,
    },
    {
      judul: 'Instruksi Presiden Nomor 1 Tahun 2024 tentang Transformasi SPBE',
      isi: 'Instruksi Presiden tentang Percepatan Transformasi Digital dan Keterpaduan Layanan Digital Nasional.',
      urutan: 7,
    },
  ];

  for (const dh of defaultDasarHukum) {
    const existing = await prisma.dasarHukum.findFirst({
      where: { judul: dh.judul },
    });
    if (!existing) {
      await prisma.dasarHukum.create({
        data: dh,
      });
    }
  }
  console.log(`[Seed] Seeded ${defaultDasarHukum.length} Dasar Hukum records.`);

  // 6. Signatory Officials & Target Personnels
  const sekdaPegawai = (await prisma.pegawai.findFirst({
    where: { jabatan: { contains: 'Sekretaris Daerah' }, isPenandatangan: true },
  })) || allPegawai[0];

  const kabagUmumPegawai = (await prisma.pegawai.findFirst({
    where: { jabatan: { contains: 'Kepala Bagian Umum' } },
  })) || sekdaPegawai;

  const defaultKop = await prisma.kopSurat.findFirst({
    where: { isDefault: true },
  });

  // 7. Seed Surat Tugas & SPD
  if (isProduction) {
    console.log('[Seed] Production environment detected (NODE_ENV=production).');
    console.log('[Seed] Preserving existing transactional tables (Surat Tugas, SPD, Laporan Perjalanan).');
    console.log('[Seed] To force dummy transactional data in production, set SEED_DUMMY_DATA=true.');
    console.log('==> Database Seeding Finished Successfully.');
    return;
  }

  // Non-production dummy transactional data generation
  await prisma.laporanPerjalanan.deleteMany({});
  await prisma.spd.deleteMany({});
  await prisma.suratTugas.deleteMany({});

  const taskTemplates = [
    { maksud: 'Koordinasi teknis implementasi sistem e-SPD dan sinkronisasi data kepegawaian ke BKD Provinsi Sulawesi Tengah', tujuan: 'Palu', header: 'Koordinasi e-SPD BKD Provinsi', unit: 'Bag.Umum' },
    { maksud: 'Konsultasi Teknis Rencana Kerja Anggaran dan Pertanggungjawaban Perjalanan Dinas ke BPKAD Provinsi', tujuan: 'Palu', header: 'Konsultasi RKA BPKAD', unit: 'Bag.Umum' },
    { maksud: 'Monitoring dan Evaluasi Pelayanan Administrasi Pemerintahan Kecamatan Bokan Kepulauan', tujuan: 'Bokan Kepulauan', header: 'Monev Bokan Kepulauan', unit: 'Bag.Pem' },
    { maksud: 'Rapat Koordinasi Tata Kelola Pemerintahan Daerah dan Reformasi Birokrasi se-Sulawesi Tengah', tujuan: 'Palu', header: 'Rakor RB Pemda Sulteng', unit: 'Bag.Organisasi' },
    { maksud: 'Bimbingan Teknis Pengelolaan Arsip Dinamis dan Tata Naskah Dinas Elektronik', tujuan: 'Luwuk', header: 'Bimtek Kearsipan Dinamis', unit: 'Bag.Umum' },
    { maksud: 'Konsultasi Penyelenggaraan Sistem Informasi Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)', tujuan: 'Makassar', header: 'Konsultasi SAKIP Makassar', unit: 'Bag.Organisasi' },
    { maksud: 'Pelaksanaan Verifikasi dan Validasi Data Tenaga Non-ASN di Lingkungan Kecamatan Bangkurung', tujuan: 'Bangkurung', header: 'Verifikasi Non-ASN Bangkurung', unit: 'Bag.Organisasi' },
    { maksud: 'Penyelarasan Draft Peraturan Daerah tentang Kelembagaan Perangkat Daerah di Biro Hukum Kemendagri', tujuan: 'Jakarta', header: 'Harmonisasi Raperda Jakarta', unit: 'Bag.Hukum' },
    { maksud: 'Koordinasi Akselerasi Transformasi Digital SPBE dengan Diskominfo Provinsi Sulawesi Tengah', tujuan: 'Palu', header: 'Akselerasi SPBE Sulteng', unit: 'Bag.Organisasi' },
    { maksud: 'Pendampingan Teknis Pemeriksaan Laporan Keuangan Daerah oleh BPK RI di Luwuk', tujuan: 'Luwuk', header: 'Pendampingan BPK RI Luwuk', unit: 'Bag.Umum' },
    { maksud: 'Rapat Evaluasi Pengendalian Inflasi dan Distribusi Logistik Pangan Antar Pulau', tujuan: 'Palu', header: 'Rakor Pengendalian Inflasi', unit: 'Bag.Ekonomi' },
    { maksud: 'Monitoring Sarana dan Prasarana Penunjang Pelayanan Administrasi Terpadu Kecamatan Labobo', tujuan: 'Labobo', header: 'Monev PATEN Labobo', unit: 'Bag.Pem' },
    { maksud: 'Konsultasi Rekonsiliasi Pengelolaan Barang Milik Daerah (BMD) bersama BPKAD Sulteng', tujuan: 'Luwuk', header: 'Rekonsiliasi BMD Luwuk', unit: 'Bag.Umum' },
    { maksud: 'Workshop Penyusunan Standar Pelayanan Minimal (SPM) dan Standar Operasional Prosedur Pelayanan', tujuan: 'Makassar', header: 'Workshop SPM Pelayanan', unit: 'Bag.Organisasi' },
    { maksud: 'Sosialisasi Kebijakan Disiplin ASN dan Tata Tertib Administrasi Kepegawaian Kecamatan Bokan Kepulauan', tujuan: 'Bokan Kepulauan', header: 'Sosialisasi Disiplin ASN', unit: 'Bag.Prokopim' },
  ];

  const seededSuratTugas = [];
  for (let i = 0; i < taskTemplates.length; i++) {
    const tmpl = taskTemplates[i];
    const seq = String(i + 1).padStart(3, '0');
    const unitCode = tmpl.unit || 'Bag.Umum';
    const nomorSurat = `000.1.2.3/${seq}/${unitCode}/2026`;
    // Status distribution: i < 5 -> ARSIP, 5 <= i < 9 -> SELESAI (siap arsip), 9 <= i < 12 -> DISETUJUI, i >= 12 -> DRAFT
    const status = i < 5 ? 'ARSIP' : i < 9 ? 'SELESAI' : i < 12 ? 'DISETUJUI' : 'DRAFT';
    const day = 1 + (i * 2);
    const tanggalSurat = new Date(`2026-03-${String(day).padStart(2, '0')}T08:00:00.000Z`);

    // Assign 1 or 2 pegawai
    const p1 = allPegawai[i % allPegawai.length];
    const p2 = (i % 3 === 0) ? allPegawai[(i + 3) % allPegawai.length] : null;
    const assignedIds = [p1.id, ...(p2 && p2.id !== p1.id ? [p2.id] : [])];

    const isSekdaSignatory = i % 2 === 0;
    const signatory = isSekdaSignatory ? sekdaPegawai : kabagUmumPegawai;

    const stData = {
      nomorSurat,
      dasarHukum: '1. UU No. 09 Tahun 2015\n2. Perbup Banggai Laut tentang Perjalanan Dinas',
      dalamRangka: tmpl.maksud,
      maksudHeader: tmpl.header,
      tempatDikeluarkan: 'Banggai',
      tanggalSurat,
      penandatanganId: signatory ? signatory.id : null,
      penandatanganNama: signatory ? signatory.nama : null,
      penandatanganJabatan: signatory ? signatory.jabatan : null,
      penandatanganPangkat: signatory ? signatory.pangkat : null,
      penandatanganNip: signatory ? signatory.nip : null,
      kopSuratId: defaultKop ? defaultKop.id : null,
      pegawaiIds: JSON.stringify(assignedIds),
      status,
    };

    const created = await prisma.suratTugas.create({
      data: stData,
    });
    seededSuratTugas.push({
      ...created,
      targetPegawai: assignedIds,
      tujuan: tmpl.tujuan,
      isKpa: !isSekdaSignatory,
    });
  }
  console.log(`[Seed] Seeded ${seededSuratTugas.length} Surat Tugas records (Standard format: 000.1.2.3/[seq]/[unit]/2026).`);

  // 8. Seed SPD (Standard format: [Prefix/]001/SPD/2026)
  const seededSpdList = [];
  let spdCounter = 1;

  for (const st of seededSuratTugas) {
    const assignedIds = st.targetPegawai;
    const isFlight = ['Palu', 'Jakarta', 'Makassar'].includes(st.tujuan);
    const transport = isFlight ? 'Pesawat' : ['Luwuk', 'Bokan Kepulauan', 'Labobo', 'Bangkurung'].includes(st.tujuan) ? 'Speedboat / Kapal Laut' : 'Mobil Dinas';

    for (const pId of assignedIds) {
      const p = allPegawai.find((item) => item.id === pId);
      if (!p) continue;

      const seq = String(spdCounter).padStart(3, '0');
      const prefixPart = st.isKpa ? 'KPA/' : '';
      const nomorSpd = `${prefixPart}${seq}/SPD/2026`;
      spdCounter++;

      const stDate = new Date(st.tanggalSurat);
      const berangkat = new Date(stDate.getTime() + 24 * 60 * 60 * 1000);
      const kembali = new Date(berangkat.getTime() + 3 * 24 * 60 * 60 * 1000);

      const spdPayload = {
        nomorSpd,
        pemberiPerintah: st.isKpa ? 'Kuasa Pengguna Anggaran (KPA)' : 'Pengguna Anggaran (PA)',
        pegawaiId: p.id,
        dalamRangka: st.dalamRangka,
        alatAngkut: transport,
        tempatBerangkat: 'Banggai',
        tempatTujuan: st.tujuan,
        lamaHari: 4,
        tanggalBerangkat: berangkat,
        tanggalKembali: kembali,
        skpd: 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
        kodeRekening: '5.1.02.04.01.0001',
        tingkatBiaya: p.golongan.startsWith('IV') ? 'Tingkat B' : 'Tingkat C',
        keterangan: `Pelaksanaan perjalanan dinas sesuai Surat Tugas ${st.nomorSurat}`,
        kopSuratId: st.kopSuratId,
        suratTugasId: st.id,
        penandatanganId: st.penandatanganId,
        penandatanganNama: st.penandatanganNama,
        penandatanganJabatan: st.isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran',
        penandatanganPangkat: st.penandatanganPangkat,
        penandatanganNip: st.penandatanganNip,
        status: st.status,
      };

      const created = await prisma.spd.create({
        data: spdPayload,
      });
      seededSpdList.push(created);
    }
  }
  console.log(`[Seed] Seeded ${seededSpdList.length} SPD records (Standard format: [KPA/]001/SPD/2026).`);

  // 9. Seed Laporan Perjalanan for all completed and archived SPDs
  let seededLaporanCount = 0;
  for (const spd of seededSpdList) {
    if (spd.status !== 'SELESAI' && spd.status !== 'ARSIP') continue;

    const laporanDate = spd.tanggalKembali ? new Date(new Date(spd.tanggalKembali).getTime() + 24 * 60 * 60 * 1000) : new Date();

    await prisma.laporanPerjalanan.upsert({
      where: { spdId: spd.id },
      update: {
        suratTugasId: spd.suratTugasId,
        hasilPerjalanan: `Telah terlaksana dengan baik ${spd.dalamRangka} bertempat di ${spd.tempatTujuan}. Seluruh agenda koordinasi teknis, verifikasi dokumen, dan konsultasi telah diselesaikan sesuai target kerja dan pedoman peraturan perundang-undangan.`,
        penandatangan: 'Sekertaris Daerah',
        tanggalLaporan: laporanDate,
      },
      create: {
        spdId: spd.id,
        suratTugasId: spd.suratTugasId,
        hasilPerjalanan: `Telah terlaksana dengan baik ${spd.dalamRangka} bertempat di ${spd.tempatTujuan}. Seluruh agenda koordinasi teknis, verifikasi dokumen, dan konsultasi telah diselesaikan sesuai target kerja dan pedoman peraturan perundang-undangan.`,
        penandatangan: 'Sekertaris Daerah',
        tanggalLaporan: laporanDate,
      },
    });
    seededLaporanCount++;
  }
  console.log(`[Seed] Seeded ${seededLaporanCount} Laporan Perjalanan records (triggers pagination).`);

  console.log('==> Database Seeding Finished Successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
