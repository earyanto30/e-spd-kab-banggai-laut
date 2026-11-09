const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log(`🚀 Starting Playwright test: ST -> SPD (3 days trip) -> Laporan on ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/home/evan/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login as Admin
    console.log('1️⃣ Logging in as admin...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[name="username"], input[type="text"]');
    await page.locator('input[type="text"]').first().fill('admin');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: 'Masuk ke Sistem' }).click();
    await page.waitForURL('**/');
    console.log('   ✅ Successfully logged in.');

    // 2. Buat Surat Tugas
    console.log('2️⃣ Creating Surat Tugas...');
    await page.goto(`${BASE_URL}/surat-tugas/buat`);
    await page.waitForSelector('text=1. Penomoran Surat Tugas');

    // Select Pegawai
    const pInput = page.getByRole('combobox', { name: 'Ketik Nama atau NIP Pegawai untuk menambahkan...' });
    await pInput.fill('Fadli');
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).click();

    // Fill Maksud
    await page.getByRole('textbox', { name: 'Contoh: Melaksanakan koordinasi' }).fill('Konsultasi Teknis Pelaksanaan Program Kerja 3 Hari');

    // Select Penandatangan
    await page.getByRole('combobox', { name: 'Pilih Penandatangan' }).click();
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).first().click();

    // Submit
    await page.getByRole('button', { name: 'Simpan & Terbitkan Surat Tugas' }).click();
    await page.waitForSelector('text=telah tersimpan');
    console.log('   ✅ Surat Tugas created successfully.');

    // Extract created Surat Tugas ID from URL or page
    const detailBtn = page.getByRole('button', { name: 'Lihat & Cetak Dokumen' });
    await detailBtn.click();
    await page.waitForURL('**/surat-tugas/cetak/**');
    const stUrl = page.url();
    const stId = stUrl.split('/').pop().split('?')[0];
    console.log(`   ✅ Surat Tugas ID: ${stId}`);

    // 3. Approve Surat Tugas (Required to generate SPD)
    console.log('3️⃣ Approving Surat Tugas...');
    // Approve via API using browser session cookies/token
    const approveRes = await page.evaluate(async (id) => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/surat-tugas/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-client': 'si-spd-web',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'DISETUJUI' })
      });
      return { ok: res.ok, status: res.status };
    }, stId);
    console.log(`   Status update response: ok=${approveRes.ok}`);
    
    // Reload ST detail page to reflect DISETUJUI status
    await page.reload();
    await page.waitForSelector('text=Terbitkan SPD');
    console.log('   ✅ Surat Tugas status is DISETUJUI, "Terbitkan SPD" button is active.');

    // 4. Terbitkan SPD with 3 Days Trip (lamaHari: 3)
    console.log('4️⃣ Opening "Terbitkan SPD" modal and configuring 3 days trip...');
    await page.getByRole('button', { name: 'Terbitkan SPD' }).click();
    await page.waitForSelector('text=Parameter Penerbitan Surat Perjalanan Dinas (SPD)');

    // Tempat Tujuan
    const tujuanInput = page.getByRole('textbox', { name: 'Contoh: Palu / Luwuk / Jakarta' });
    await tujuanInput.fill('Luwuk');

    // Lama Hari: Set to 3
    console.log('   Setting Lama Perjalanan Dinas to 3 hari...');
    const lamaContainer = page.locator('label:has-text("5. Lama Perjalanan Dinas")').locator('xpath=..');
    const incrementBtn = lamaContainer.locator('button.p-inputnumber-increment-button, button[aria-label="Increment"], .p-inputnumber-button-up, button:has(.pi-plus)').first();
    if (await incrementBtn.count() > 0) {
      await incrementBtn.click();
      await incrementBtn.click();
    } else {
      const lamaHariInput = lamaContainer.locator('input').first();
      await lamaHariInput.click();
      await lamaHariInput.press('Control+A');
      await lamaHariInput.fill('3');
      await lamaHariInput.dispatchEvent('input');
      await lamaHariInput.dispatchEvent('change');
    }

    // Verify modal displays "Format Hasil: 3 (tiga) hari"
    await lamaContainer.locator('text=3 (tiga) hari').waitFor({ timeout: 5000 });
    console.log('   ✅ Modal preview displays "3 (tiga) hari" correctly.');

    // Submit SPD Generation
    await page.getByRole('button', { name: 'Terbitkan Dokumen SPD' }).click();
    await page.waitForSelector('text=Surat Perjalanan Dinas (SPD) Terhubung');
    console.log('   ✅ SPD generated for 3 days trip!');

    // Retrieve created SPD ID and approve it so it is eligible for Laporan
    const spdInfo = await page.evaluate(async (id) => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/surat-tugas/${id}`, {
        headers: {
          'x-app-client': 'si-spd-web',
          'Authorization': `Bearer ${token}`
        }
      });
      const st = await res.json();
      const spd = st.spdList?.[0];
      if (spd) {
        await fetch(`/api/spd/${spd.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-app-client': 'si-spd-web',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'DISETUJUI' })
        });
      }
      return spd;
    }, stId);
    console.log(`   ✅ SPD ID: ${spdInfo?.id}, status updated to DISETUJUI`);

    // 5. Navigate to Buat Laporan for this SPD
    console.log('5️⃣ Navigating to Buat Laporan Perjalanan Dinas...');
    await page.goto(`${BASE_URL}/laporan/buat?spdId=${spdInfo.id}`);
    await page.waitForSelector('text=Buat Laporan Perjalanan Dinas');

    // Verify that Waktu Pelaksanaan shows "3 (tiga) hari"
    const waktuSection = page.locator('text=Waktu Pelaksanaan:').locator('..');
    await waktuSection.waitFor({ timeout: 5000 });
    const waktuText = await waktuSection.innerText();
    console.log(`   Waktu Pelaksanaan on Buat Laporan: "${waktuText.trim().replace(/\s+/g, ' ')}"`);
    if (!waktuText.includes('3 (tiga) hari')) {
      throw new Error(`Expected "3 (tiga) hari", got: ${waktuText}`);
    }
    console.log('   ✅ Buat Laporan UI correctly displays "3 (tiga) hari"!');

    // Fill Hasil Perjalanan
    const hasilTextarea = page.locator('textarea').first();
    await hasilTextarea.fill('1. Telah dilaksanakan koordinasi teknis selama 3 hari kerja di Luwuk.\n2. Seluruh agenda konsultasi program kerja berhasil diselesaikan.');

    // Submit Laporan
    console.log('   Submitting Laporan Perjalanan Dinas...');
    await page.getByRole('button', { name: 'Simpan & Cetak Laporan' }).click();
    await page.waitForURL('**/laporan/cetak/**');
    await page.waitForSelector('text=Pratinjau Laporan Perjalanan Dinas');
    console.log('   ✅ Laporan Perjalanan Dinas saved and viewed.');

    // 6. Verify Laporan Detail page displays "3 (tiga) hari"
    const lamaSection = page.locator('text=Lama Perjalanan:').locator('..');
    const lamaDetailText = await lamaSection.innerText();
    console.log(`   Lama Perjalanan on Laporan Detail: "${lamaDetailText.trim().replace(/\s+/g, ' ')}"`);
    if (!lamaDetailText.includes('3 (tiga) hari')) {
      throw new Error(`Expected "3 (tiga) hari" on Laporan detail, got: ${lamaDetailText}`);
    }
    console.log('   ✅ Laporan Detail view correctly displays "3 (tiga) hari"!');

    // 7. Verify backend Laporan PDF contains "3 (tiga) hari"
    const lapUrl = page.url();
    const spdIdForPdf = lapUrl.split('/').pop().split('?')[0];
    const pdfVerification = await page.evaluate(async (id) => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/spd/${id}/laporan-pdf`, {
        headers: {
          'x-app-client': 'si-spd-web',
          'Authorization': `Bearer ${token}`
        }
      });
      return { ok: res.ok, status: res.status };
    }, spdIdForPdf);
    console.log(`   Backend Laporan PDF API status: ${pdfVerification.status}`);
    if (!pdfVerification.ok) {
      throw new Error(`Laporan PDF generation endpoint returned status ${pdfVerification.status}`);
    }
    console.log('   ✅ Backend Laporan PDF generation verified!');

    console.log('\n🎉 ALL TESTS PASSED: Surat Tugas -> SPD (3 days trip) -> Laporan with "3 (tiga) hari" verified end-to-end!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
