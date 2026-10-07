<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Chart from 'primevue/chart';
import Tag from 'primevue/tag';
import { GovButton } from '../components/core';
import { useTheme } from '../composables/useTheme';
import logoUrl from '../assets/logo.png';

const { isDark } = useTheme();

const authToken = ref<string | null>(null);
const userName = ref<string | null>(null);
const currentUsername = ref<string | null>(null);
const userRole = ref<string>('USER');

const checkAuth = () => {
  authToken.value = localStorage.getItem('auth_token');
  userName.value = localStorage.getItem('user_name');
  currentUsername.value = localStorage.getItem('username');
  userRole.value = localStorage.getItem('user_role') || 'USER';
};

// Summary metrics (mocked with realistic governmental numbers)
const kpiStats = [
  {
    title: 'Total SPD Diterbitkan',
    value: '148',
    unit: 'Dokumen',
    change: '+14% bln ini',
    changeType: 'up',
    icon: 'pi pi-file-check',
    colorClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50',
  },
  {
    title: 'SPD Sedang Aktif',
    value: '18',
    unit: 'Pegawai',
    change: 'Minggu berjalan',
    changeType: 'neutral',
    icon: 'pi pi-compass',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
  },
  {
    title: 'ASN Pelaksana Tugas',
    value: '64',
    unit: 'Orang',
    change: '+6 pegawai baru',
    changeType: 'up',
    icon: 'pi pi-users',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
  },
  {
    title: 'Realisasi Anggaran SPD',
    value: 'Rp 284,5 Jt',
    unit: 'Pagu 2026',
    change: '78.2% terserap',
    changeType: 'up',
    icon: 'pi pi-wallet',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50',
  },
];

// Recent mock SPD records for quick glance
const recentSpdList = [
  {
    nomor: '090/042/SPD/SETDA/2026',
    pegawai: 'Ir. Moh. Rizki, M.Si',
    nip: '19780512 200501 1 004',
    tujuan: 'Palu (Kantor Gubernur Sulteng)',
    tanggal: '12 Okt 2026',
    durasi: '4 Hari',
    status: 'DISETUJUI',
  },
  {
    nomor: '090/041/SPD/SETDA/2026',
    pegawai: 'Siti Rahmawati, S.STP',
    nip: '19890422 201202 2 003',
    tujuan: 'Jakarta (Kemendagri RI)',
    tanggal: '10 Okt 2026',
    durasi: '5 Hari',
    status: 'DISETUJUI',
  },
  {
    nomor: '090/040/SPD/SETDA/2026',
    pegawai: 'Drs. Supriadi Labani',
    nip: '19750918 200212 1 002',
    tujuan: 'Luwuk (Rakor Keuangan Daerah)',
    tanggal: '08 Okt 2026',
    durasi: '3 Hari',
    status: 'SELESAI',
  },
  {
    nomor: '090/039/SPD/SETDA/2026',
    pegawai: 'Nurul Hidayah, S.Sos',
    nip: '19920115 201704 2 001',
    tujuan: 'Banggai Utara (Monitoring OPD)',
    tanggal: '06 Okt 2026',
    durasi: '2 Hari',
    status: 'SELESAI',
  },
  {
    nomor: '090/043/SPD/SETDA/2026',
    pegawai: 'Fadli A. Arsad',
    nip: '19840310 200801 1 007',
    tujuan: 'Makassar (Bimtek Tata Kelola)',
    tanggal: '15 Okt 2026',
    durasi: '4 Hari',
    status: 'DRAFT',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Chart 1: Monthly SPD Issuance (Bar Chart - Dalam Daerah vs Luar Daerah)
// ─────────────────────────────────────────────────────────────────────────────
const monthlyBarData = computed(() => {
  const isD = isDark.value;
  return {
    labels: ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    datasets: [
      {
        label: 'Luar Daerah Sulteng',
        backgroundColor: isD ? '#38BDF8' : '#0F4C81',
        borderRadius: 6,
        data: [14, 19, 23, 17, 28, 22],
      },
      {
        label: 'Dalam Daerah (Kecamatan/Kab)',
        backgroundColor: isD ? '#F59E0B' : '#D97706',
        borderRadius: 6,
        data: [8, 12, 11, 15, 14, 18],
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart 2: Transportation Mode Distribution (Doughnut Chart)
// ─────────────────────────────────────────────────────────────────────────────
const transportDoughnutData = computed(() => {
  return {
    labels: ['Pesawat Udara', 'Kapal Laut / Feri', 'Speedboat Pemda', 'Kendaraan Darat'],
    datasets: [
      {
        data: [46, 28, 16, 10],
        backgroundColor: [
          '#0284C7', // Sky-600
          '#0D9488', // Teal-600
          '#F59E0B', // Amber-500
          '#64748B', // Slate-500
        ],
        hoverBackgroundColor: [
          '#38BDF8',
          '#14B8A6',
          '#FBBF24',
          '#94A3B8',
        ],
        borderWidth: 0,
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart 3: Travel Duration Trend (Line Area Chart)
// ─────────────────────────────────────────────────────────────────────────────
const trendLineData = computed(() => {
  const isD = isDark.value;
  return {
    labels: ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    datasets: [
      {
        label: 'Akumulasi Hari Dinas (Hari)',
        data: [58, 76, 92, 70, 114, 88],
        fill: true,
        borderColor: isD ? '#38BDF8' : '#0F4C81',
        backgroundColor: isD ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 76, 129, 0.12)',
        tension: 0.4,
        pointBackgroundColor: isD ? '#38BDF8' : '#0F4C81',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart 4: Top 5 Destinations (Horizontal Bar Chart)
// ─────────────────────────────────────────────────────────────────────────────
const topDestinationsData = computed(() => {
  const isD = isDark.value;
  return {
    labels: ['Palu (Provinsi)', 'Luwuk (Kab. Banggai)', 'Jakarta (Pusat)', 'Makassar', 'Gorontalo'],
    datasets: [
      {
        label: 'Frekuensi Kunjungan',
        data: [52, 44, 31, 18, 9],
        backgroundColor: isD ? '#10B981' : '#059669',
        borderRadius: 6,
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart Options Configuration (Dynamic Color Mapping for Dark / Light)
// ─────────────────────────────────────────────────────────────────────────────
const barChartOptions = computed(() => {
  const isD = isDark.value;
  const textColor = isD ? '#F8FAFC' : '#1E293B';
  const textMuted = isD ? '#94A3B8' : '#64748B';
  const gridColor = isD ? 'rgba(51, 72, 112, 0.35)' : 'rgba(226, 232, 240, 0.8)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: 'inherit', size: 12 },
        },
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: textMuted, font: { size: 11 }, precision: 0 },
        grid: { color: gridColor },
      },
    },
  };
});

const doughnutChartOptions = computed(() => {
  const isD = isDark.value;
  const textColor = isD ? '#F8FAFC' : '#1E293B';

  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          font: { family: 'inherit', size: 11 },
        },
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
      },
    },
  };
});

const lineChartOptions = computed(() => {
  const isD = isDark.value;
  const textMuted = isD ? '#94A3B8' : '#64748B';
  const gridColor = isD ? 'rgba(51, 72, 112, 0.35)' : 'rgba(226, 232, 240, 0.8)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: textMuted, font: { size: 11 } },
        grid: { color: gridColor },
      },
    },
  };
});

const horizontalBarOptions = computed(() => {
  const isD = isDark.value;
  const textColor = isD ? '#F8FAFC' : '#1E293B';
  const textMuted = isD ? '#94A3B8' : '#64748B';
  const gridColor = isD ? 'rgba(51, 72, 112, 0.35)' : 'rgba(226, 232, 240, 0.8)';

  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { size: 11 }, precision: 0 },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { display: false },
      },
    },
  };
});

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'DISETUJUI':
      return 'success';
    case 'SELESAI':
      return 'info';
    case 'DRAFT':
      return 'warn';
    default:
      return 'secondary';
  }
};

onMounted(() => {
  checkAuth();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Welcome & Officer Banner -->
    <div
      class="bg-gradient-to-r from-[#0F4C81] via-[#0d4373] to-[#0a365c] dark:from-[#162238] dark:via-[#1A2740] dark:to-[#162238] border border-blue-900/40 dark:border-border rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden"
    >
      <!-- Background decorative civic watermark -->
      <div class="absolute -right-10 -bottom-10 opacity-10 pointer-events-none w-64 h-64">
        <img :src="logoUrl" alt="Watermark" class="w-full h-full object-contain filter invert" />
      </div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-start sm:items-center gap-4">
          <div
            class="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow-md border border-white/20"
          >
            <img :src="logoUrl" alt="Logo Kab. Banggai Laut" class="w-full h-full object-contain" />
          </div>
          <div>
            <div class="flex items-center gap-2.5 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Dashboard SI-SPD Banggai Laut
              </h1>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 dark:bg-primary/20 text-white dark:text-primary border border-white/25 dark:border-primary/40 backdrop-blur-sm"
              >
                Tahun Anggaran 2026
              </span>
            </div>
            <p class="text-xs sm:text-sm text-white/85 dark:text-text-muted mt-1 max-w-2xl leading-relaxed">
              Monitoring penerbitan, penugasan dinas ASN, dan realisasi Surat Perjalanan Dinas Sekretariat Daerah.
            </p>
          </div>
        </div>

        <!-- Quick Top Action Buttons -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <router-link to="/spd/buat">
            <GovButton
              label="Buat SPD Baru"
              icon="pi pi-plus"
              severity="contrast"
              class="!bg-white !text-[#0F4C81] hover:!bg-blue-50 font-semibold shadow-sm"
            />
          </router-link>
          <router-link to="/spd">
            <GovButton
              label="Lihat Semua SPD"
              icon="pi pi-list"
              severity="secondary"
              class="!bg-white/15 !text-white hover:!bg-white/25 !border-white/20 shadow-sm"
            />
          </router-link>
        </div>
      </div>
    </div>

    <!-- 4 KPI Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="kpi in kpiStats"
        :key="kpi.title"
        class="bg-surface border border-border rounded-xl p-5 shadow-sm transition-all hover:shadow-md"
      >
        <div class="flex items-center justify-between gap-3 mb-3">
          <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {{ kpi.title }}
          </span>
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
            :class="[kpi.bgClass, kpi.colorClass]"
          >
            <i :class="[kpi.icon, 'text-lg']"></i>
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
            {{ kpi.value }}
          </span>
          <span class="text-xs font-medium text-text-muted">
            {{ kpi.unit }}
          </span>
        </div>
        <div class="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-1.5 text-xs text-text-muted">
          <i
            class="pi text-[10px]"
            :class="kpi.changeType === 'up' ? 'pi-arrow-up text-emerald-500' : 'pi-minus text-amber-500'"
          ></i>
          <span>{{ kpi.change }}</span>
        </div>
      </div>
    </div>

    <!-- Charts Row 1: Monthly Issuance (Bar) & Transport Distribution (Doughnut) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Monthly Bar Chart (2 cols on large screen) -->
      <div class="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-border">
          <div>
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-chart-bar text-primary"></i>
              Statistik Penerbitan SPD per Bulan
            </h2>
            <p class="text-xs text-text-muted mt-0.5">
              Komparasi penerbitan tugas dinas Luar Daerah vs Dalam Wilayah Banggai Laut
            </p>
          </div>
          <span class="text-xs font-mono font-medium px-2 py-1 rounded bg-slate-100 dark:bg-surface/50 text-text-muted border border-border">
            Mei - Okt 2026
          </span>
        </div>
        <div class="h-72 w-full pt-2">
          <Chart type="bar" :data="monthlyBarData" :options="barChartOptions" class="w-full h-full" />
        </div>
      </div>

      <!-- Transport Mode Doughnut (1 col) -->
      <div class="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
        <div class="pb-3 mb-2 border-b border-border">
          <h2 class="text-base font-bold text-text-main flex items-center gap-2">
            <i class="pi pi-compass text-amber-500"></i>
            Moda Transportasi Dinas
          </h2>
          <p class="text-xs text-text-muted mt-0.5">
            Persentase moda keberangkatan yang digunakan
          </p>
        </div>
        <div class="h-72 w-full flex items-center justify-center pt-1">
          <Chart type="doughnut" :data="transportDoughnutData" :options="doughnutChartOptions" class="w-full h-full" />
        </div>
      </div>
    </div>

    <!-- Charts Row 2: Duration Trend (Line Area) & Top Destinations (Horizontal Bar) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Duration Trend Line Chart -->
      <div class="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-border">
          <div>
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-chart-line text-emerald-500"></i>
              Tren Akumulasi Hari Dinas (Durasi)
            </h2>
            <p class="text-xs text-text-muted mt-0.5">
              Total hari penugasan perjalanan dinas yang dijalankan pegawai
            </p>
          </div>
          <div class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
            Rerata 3.8 Hari/SPD
          </div>
        </div>
        <div class="h-64 w-full pt-2">
          <Chart type="line" :data="trendLineData" :options="lineChartOptions" class="w-full h-full" />
        </div>
      </div>

      <!-- Top Destinations Horizontal Bar Chart -->
      <div class="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-border">
          <div>
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-map-marker text-rose-500"></i>
              5 Destinasi Perjalanan Terbanyak
            </h2>
            <p class="text-xs text-text-muted mt-0.5">
              Kota / wilayah dengan frekuensi kunjungan dinas tertinggi
            </p>
          </div>
          <span class="text-xs text-text-muted">Total 148 Kunjungan</span>
        </div>
        <div class="h-64 w-full pt-2">
          <Chart type="bar" :data="topDestinationsData" :options="horizontalBarOptions" class="w-full h-full" />
        </div>
      </div>
    </div>

    <!-- Recent SPD Table & Quick Shortcuts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent SPD List (2 cols) -->
      <div class="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div>
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-clock text-sky-500"></i>
              Daftar SPD Terbaru
            </h2>
            <p class="text-xs text-text-muted mt-0.5">
              Penerbitan Surat Perjalanan Dinas terkini di lingkungan Sekda
            </p>
          </div>
          <router-link to="/spd" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Lihat Rekap Lengkap
            <i class="pi pi-arrow-right text-[10px]"></i>
          </router-link>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-border text-text-muted uppercase tracking-wider text-[11px]">
                <th class="py-2.5 px-3 font-semibold">Nomor & Pegawai</th>
                <th class="py-2.5 px-3 font-semibold">Tujuan</th>
                <th class="py-2.5 px-3 font-semibold">Berangkat</th>
                <th class="py-2.5 px-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr
                v-for="item in recentSpdList"
                :key="item.nomor"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-3 px-3">
                  <div class="font-bold text-text-main">{{ item.pegawai }}</div>
                  <div class="text-[11px] font-mono text-text-muted">{{ item.nomor }}</div>
                </td>
                <td class="py-3 px-3 text-text-main font-medium">
                  {{ item.tujuan }}
                </td>
                <td class="py-3 px-3 text-text-muted">
                  <div>{{ item.tanggal }}</div>
                  <div class="text-[11px] text-text-muted/80">Durasi: {{ item.durasi }}</div>
                </td>
                <td class="py-3 px-3 text-center">
                  <Tag
                    :value="item.status"
                    :severity="getStatusSeverity(item.status)"
                    class="!text-[10px] !px-2 !py-0.5"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Administration Shortcuts & System Status (1 col) -->
      <div class="space-y-4">
        <!-- Quick Nav Card -->
        <div class="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h2 class="text-base font-bold text-text-main flex items-center gap-2 pb-2 border-b border-border">
            <i class="pi pi-bolt text-amber-500"></i>
            Akses Cepat Modul
          </h2>
          <div class="space-y-2">
            <router-link
              to="/spd/buat"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-plus-circle text-primary text-sm"></i>
                <span>Penerbitan Formulir SPD Baru</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              to="/pengaturan/kop-surat"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-file-edit text-primary text-sm"></i>
                <span>Kelola Template Kop Surat Legal</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              to="/kepegawaian/asn"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-users text-primary text-sm"></i>
                <span>Database Pegawai ASN Sekda</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              to="/pengaturan/pengguna"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-user-edit text-primary text-sm"></i>
                <span>Manajemen Hak Akses & Akun</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>
          </div>
        </div>

        <!-- System & Location Info Box -->
        <div class="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-surface dark:to-surface border border-border rounded-xl p-4 text-xs text-text-muted space-y-2">
          <div class="font-bold text-text-main flex items-center gap-1.5">
            <i class="pi pi-building text-primary"></i>
            Sekretariat Daerah Kab. Banggai Laut
          </div>
          <p class="leading-relaxed text-[11px]">
            Jl. Jogugu Zakaria No. 01, Banggai, Kab. Banggai Laut, Sulawesi Tengah.
          </p>
          <div class="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span>Status Layanan:</span>
            <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operasional Online
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
