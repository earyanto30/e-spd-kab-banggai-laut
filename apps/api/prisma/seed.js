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
  const defaultAsnList = [
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
  ];

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

  // 2. Initial Super Admin User Account
  const adminNip = process.env.INITIAL_ADMIN_NIP || '198801152010011002';
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Fadli A. Arsad';
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'fadli.arsad@banggailautkab.go.id';

  const linkedPegawai = await prisma.pegawai.findUnique({
    where: { nip: adminNip },
  });

  const existingAdminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: adminUsername },
        { username: adminNip },
        { pegawaiId: linkedPegawai ? linkedPegawai.id : undefined },
      ],
    },
  });

  if (existingAdminUser) {
    await prisma.user.update({
      where: { id: existingAdminUser.id },
      data: {
        username: adminUsername,
        name: adminName,
        email: adminEmail,
        role: 'SUPER_ADMIN',
        isActive: true,
        pegawaiId: linkedPegawai ? linkedPegawai.id : null,
      },
    });
    console.log(`[Seed] Updated Super Admin user: ${adminUsername} (NIP: ${adminNip})`);
  } else {
    await prisma.user.create({
      data: {
        username: adminUsername,
        name: adminName,
        email: adminEmail,
        password: hashPassword(adminPassword),
        role: 'SUPER_ADMIN',
        isActive: true,
        pegawaiId: linkedPegawai ? linkedPegawai.id : null,
      },
    });
    console.log(`[Seed] Created initial Super Admin user: ${adminUsername} (NIP: ${adminNip})`);
  }

  // 3. Initial Kop Surat Template
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

  const existingKop = await prisma.kopSurat.findFirst({
    where: { id: 'kop-1' },
  });

  if (!existingKop) {
    await prisma.kopSurat.create({
      data: {
        id: 'kop-1',
        nama: 'Kop 1 (Sekda Kab. Banggai Laut)',
        keterangan: 'Kop surat dinas resmi Sekretariat Daerah Kabupaten Banggai Laut untuk SPD',
        fileName: 'kop_sekda_banggai_laut.pdf',
        storedFileName: defaultPdfName,
        fileSize: '1.2 KB',
        paperSize: 'A4',
        isDefault: true,
      },
    });
    console.log('[Seed] Seeded default Kop Surat metadata.');
  }

  // 4. Initial Dasar Hukum References
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
  console.log('[Seed] Seeded initial Dasar Hukum statutory references.');

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
