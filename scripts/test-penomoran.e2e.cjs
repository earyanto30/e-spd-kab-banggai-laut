const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function run() {
  console.log(`🚀 Starting Playwright test against ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/home/evan/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1️⃣ Logging in as admin...');
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Username atau NIP' }).fill('admin');
    await page.getByRole('textbox', { name: 'Masukkan kata sandi' }).fill('admin123');
    await page.getByRole('button', { name: 'Masuk ke Sistem' }).click();
    await page.waitForURL(`${BASE_URL}/`);
    console.log('   ✅ Successfully logged in.');

    // 2. Test Custom Penomoran on Buat Surat Tugas
    console.log('2️⃣ Testing Buat Surat Tugas with Custom Penomoran...');
    await page.goto(`${BASE_URL}/surat-tugas/buat`);
    await page.waitForSelector('text=1. Penomoran Surat Tugas');

    // Enter custom sequence
    const randomSeq = String(Math.floor(100 + Math.random() * 899));
    await page.getByRole('textbox', { name: 'Contoh: 001 atau kosongkan' }).fill(randomSeq);
    
    // Check preview reflects custom sequence
    const previewEl = page.locator('text=Pratinjau Nomor Dokumen:').locator('..');
    const previewText = await previewEl.innerText();
    console.log(`   Preview after custom input: "${previewText.trim().replace(/\s+/g, ' ')}"`);
    if (!previewText.includes(randomSeq)) {
      throw new Error(`Preview does not contain custom sequence ${randomSeq}!`);
    }

    // Fill required fields
    const pegawaiInput = page.getByRole('combobox', { name: 'Ketik Nama atau NIP Pegawai untuk menambahkan...' });
    await pegawaiInput.fill('Fadli');
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).click();

    await page.getByRole('textbox', { name: 'Contoh: Melaksanakan koordinasi' }).fill('Test Penomoran Kustom E2E Playwright');
    
    // Select penandatangan
    await page.getByRole('combobox', { name: 'Pilih Penandatangan' }).click();
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).first().click();

    // Submit
    await page.getByRole('button', { name: 'Simpan & Terbitkan Surat Tugas' }).click();
    await page.waitForSelector('text=telah tersimpan');
    console.log(`   ✅ Surat Tugas created with custom seq ${randomSeq}!`);

    // 3. Test Custom Penomoran on Buat SPD
    console.log('3️⃣ Testing Buat SPD with Custom Penomoran (Prefix + Seq)...');
    await page.goto(`${BASE_URL}/spd/buat`);
    await page.waitForSelector('text=Penomoran SPD');

    const spdSeq = String(Math.floor(100 + Math.random() * 899));
    await page.getByRole('textbox', { name: 'Contoh: KPA atau kosongkan' }).fill('KPA');
    await page.getByRole('textbox', { name: 'Contoh: 001 atau kosongkan' }).fill(spdSeq);

    const spdPreviewEl = page.locator('text=Pratinjau Nomor SPD:').locator('..');
    const spdPreviewText = await spdPreviewEl.innerText();
    console.log(`   Preview SPD after custom input: "${spdPreviewText.trim().replace(/\s+/g, ' ')}"`);
    if (!spdPreviewText.includes(`KPA/${spdSeq}/SPD/`)) {
      throw new Error(`SPD Preview does not contain KPA/${spdSeq}/SPD/!`);
    }

    // Fill required SPD fields
    const spdPegawaiInput = page.getByRole('combobox', { name: 'Ketik Nama atau NIP Pegawai...' });
    await spdPegawaiInput.fill('Fadli');
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).click();

    await page.getByRole('textbox', { name: 'Contoh: Mendampingi Bupati' }).fill('Test SPD Kustom E2E Playwright');
    await page.getByRole('textbox', { name: 'Contoh: Palu / Luwuk / Jakarta' }).fill('Luwuk');

    // Moda transportasi
    await page.locator('div').filter({ hasText: /^Pilih moda transportasi\.\.\.$/ }).first().click();
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Pesawat' }).click();
    await page.keyboard.press('Escape');

    // Submit SPD
    await page.getByRole('button', { name: 'Simpan / Buat SPD' }).click();
    await page.waitForSelector('text=Berhasil! Surat Perjalanan Dinas telah tersimpan');
    console.log(`   ✅ SPD created with custom number KPA/${spdSeq}/SPD/...!`);

    // 4. Test Buat Surat Tugas with EMPTY number sequence and custom unit code (Bag.Prokopim)
    console.log('4️⃣ Testing Buat Surat Tugas with EMPTY number sequence and custom unit Bag.Prokopim...');
    await page.goto(`${BASE_URL}/surat-tugas/buat`);
    await page.waitForSelector('text=1. Penomoran Surat Tugas');

    // Ensure custom sequence is empty
    await page.getByRole('textbox', { name: 'Contoh: 001 atau kosongkan' }).fill('');
    // Set custom unit code to Bag.Prokopim
    await page.getByRole('textbox', { name: 'Contoh: Bag.Umum' }).fill('Bag.Prokopim');

    // Check preview reflects Bag.Prokopim
    const prokopimPreviewEl = page.locator('text=Pratinjau Nomor Dokumen:').locator('..');
    const prokopimPreviewText = await prokopimPreviewEl.innerText();
    console.log(`   Preview after custom unit input: "${prokopimPreviewText.trim().replace(/\s+/g, ' ')}"`);
    if (!prokopimPreviewText.includes('Bag.Prokopim')) {
      throw new Error(`Preview does not contain Bag.Prokopim!`);
    }

    // Fill required fields
    const pInput = page.getByRole('combobox', { name: 'Ketik Nama atau NIP Pegawai untuk menambahkan...' });
    await pInput.fill('Fadli');
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).click();

    await page.getByRole('textbox', { name: 'Contoh: Melaksanakan koordinasi' }).fill('Test Penomoran Unit Prokopim E2E');
    
    // Select penandatangan
    await page.getByRole('combobox', { name: 'Pilih Penandatangan' }).click();
    await page.waitForSelector('[role="option"]');
    await page.getByRole('option', { name: 'Fadli A. Arsad' }).first().click();

    // Clear Tanggal Surat to test empty date
    const dateInput = page.locator('input[placeholder="Pilih tanggal atau kosongkan"]');
    await dateInput.click();
    await dateInput.press('Control+A');
    await dateInput.press('Backspace');
    await page.getByRole('textbox', { name: 'Contoh: Melaksanakan koordinasi' }).click();

    // Submit
    await page.getByRole('button', { name: 'Simpan & Terbitkan Surat Tugas' }).click();
    await page.waitForSelector('text=telah tersimpan');
    
    // Check saved notification text contains Bag.Prokopim and does NOT contain numeric sequence like 018
    const successBanner = page.locator('text=telah tersimpan').locator('..');
    const bannerText = await successBanner.innerText();
    console.log(`   Success notification banner: "${bannerText.trim().replace(/\s+/g, ' ')}"`);
    if (!bannerText.includes('Bag.Prokopim')) {
      throw new Error(`Saved Surat Tugas does NOT contain Bag.Prokopim! Got: ${bannerText}`);
    }
    // Check that number sequence is empty (not auto-filled with digits like 018/Bag.Prokopim)
    if (/\/\d+\/Bag\.Prokopim/.test(bannerText)) {
      throw new Error(`Saved Surat Tugas should NOT have auto-filled sequence digits! Got: ${bannerText}`);
    }
    console.log('   ✅ Surat Tugas with empty number sequence successfully saved with blank sequence (no number filled) and custom unit Bag.Prokopim!');

    // Click "Lihat & Cetak Dokumen" to verify detail page
    await page.getByRole('button', { name: 'Lihat & Cetak Dokumen' }).click();
    await page.waitForURL('**/surat-tugas/cetak/**');
    await page.waitForSelector('text=Dokumen Surat Tugas');
    console.log('   ✅ Successfully viewed Surat Tugas detail/print page with empty sequence number!');

    console.log('🎉 ALL PLAYWRIGHT CUSTOM PENOMORAN TESTS PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
