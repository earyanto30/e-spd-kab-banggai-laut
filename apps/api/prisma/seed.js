const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('==> Starting Prisma Database Seeder...');

  // 1. Initial ASN / Pegawai Master Data
  const defaultAsnList = [
    {
      nip: process.env.INITIAL_ADMIN_NIP || '198801152010011002',
      nama: process.env.INITIAL_ADMIN_NAME || 'Fadli A. Arsad',
      pangkat: 'Pembina Utama Muda',
      golongan: 'IV/c',
      jabatan: 'Sekretaris Daerah / Super Admin',
      unitKerja: 'Sekretariat Daerah Kab. Banggai Laut',
      status: 'PNS',
      email: process.env.INITIAL_ADMIN_EMAIL || 'fadli.arsad@banggailautkab.go.id',
      noHp: '08114567890',
    },
    {
      nip: '19680512 199403 1 004',
      nama: 'Drs. H. Bambang Soeprapto, M.Si',
      pangkat: 'Pembina Utama Madya',
      golongan: 'IV/d',
      jabatan: 'Staf Ahli Sekretariat Daerah',
      unitKerja: 'Sekretariat Daerah',
      status: 'PNS',
      email: 'bambang.soeprapto@setda.go.id',
      noHp: '081234567890',
    },
    {
      nip: '19740821 199903 2 002',
      nama: 'Ir. Hj. Siti Rahmawati, MT',
      pangkat: 'Pembina Utama Muda',
      golongan: 'IV/c',
      jabatan: 'Asisten Pemerintahan dan Kesra',
      unitKerja: 'Sekretariat Daerah - Asisten I',
      status: 'PNS',
      email: 'siti.rahmawati@setda.go.id',
      noHp: '081234567891',
    },
    {
      nip: '19850214 200412 1 001',
      nama: 'Dedy Kurniawan, S.STP, M.AP',
      pangkat: 'Pembina',
      golongan: 'IV/a',
      jabatan: 'Kepala Bagian Umum dan Protokol',
      unitKerja: 'Sekretariat Daerah - Bagian Umum',
      status: 'PNS',
      email: 'dedy.kurniawan@setda.go.id',
      noHp: '081234567892',
    },
    {
      nip: '19890610 201101 2 008',
      nama: 'Ratna Juwita, S.H., M.H.',
      pangkat: 'Penata Tingkat I',
      golongan: 'III/d',
      jabatan: 'Kepala Bagian Hukum',
      unitKerja: 'Sekretariat Daerah - Bagian Hukum',
      status: 'PNS',
      email: 'ratna.juwita@setda.go.id',
      noHp: '081234567893',
    },
    {
      nip: '19920315 201802 1 003',
      nama: 'Fajar Prasetyo, S.Kom',
      pangkat: 'Penata',
      golongan: 'III/c',
      jabatan: 'Pranata Komputer Ahli Muda',
      unitKerja: 'Sekretariat Daerah - Bagian Organisasi',
      status: 'PNS',
      email: 'fajar.prasetyo@setda.go.id',
      noHp: '081234567894',
    },
    {
      nip: '19951104 202012 2 011',
      nama: 'Nurul Aini, A.Md',
      pangkat: 'Pengatur',
      golongan: 'II/c',
      jabatan: 'Pengelola Administrasi Perjalanan Dinas',
      unitKerja: 'Sekretariat Daerah - Bagian Umum',
      status: 'PNS',
      email: 'nurul.aini@setda.go.id',
      noHp: '081234567895',
    },
    {
      nip: '19900720 202321 1 005',
      nama: 'Eko Wahyudi, S.AP',
      pangkat: 'Ahli Pertama',
      golongan: 'IX',
      jabatan: 'Analis Kebijakan',
      unitKerja: 'Sekretariat Daerah - Bagian Perekonomian',
      status: 'PPPK',
      email: 'eko.wahyudi@setda.go.id',
      noHp: '081234567896',
    },
  ];

  for (const pegawaiData of defaultAsnList) {
    await prisma.pegawai.upsert({
      where: { nip: pegawaiData.nip },
      update: {
        nama: pegawaiData.nama,
        pangkat: pegawaiData.pangkat,
        golongan: pegawaiData.golongan,
        jabatan: pegawaiData.jabatan,
        unitKerja: pegawaiData.unitKerja,
        status: pegawaiData.status,
        email: pegawaiData.email,
        noHp: pegawaiData.noHp,
      },
      create: pegawaiData,
    });
  }
  console.log(`[Seed] Seeded ${defaultAsnList.length} ASN Pegawai records.`);

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
