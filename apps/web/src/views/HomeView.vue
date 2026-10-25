<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Chart from 'primevue/chart';
import Tag from 'primevue/tag';
import { GovButton } from '../components/core';
import { useTheme } from '../composables/useTheme';
import { apiFetch } from '../utils/api';
import logoUrl from '../assets/logo.png';

const { isDark } = useTheme();

const authToken = ref<string | null>(null);
const userName = ref<string | null>(null);
const currentUsername = ref<string | null>(null);
const userRole = ref<string>('USER');
const canManage = computed(() => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole.value));
const canAccessSettings = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(userRole.value));

const checkAuth = () => {
  authToken.value = localStorage.getItem('auth_token');
  userName.value = localStorage.getItem('user_name');
  currentUsername.value = localStorage.getItem('username');
  userRole.value = localStorage.getItem('user_role') || 'USER';
};

const currentYear = new Date().getFullYear();
const loadingStats = ref(true);
const statsData = ref<any>(null);

const fetchDashboardStats = async () => {
  loadingStats.value = true;
  try {
    const res = await apiFetch('/api/dashboard/stats');
    if (res.ok) {
      statsData.value = await res.json();
    }
  } catch (err) {
    console.error('Gagal memuat data statistik dashboard:', err);
  } finally {
    loadingStats.value = false;
  }
};

// Summary metrics (Calculated from Real Database Data)
const kpiStats = computed(() => {
  const k = statsData.value?.kpi;
  return [
    {
      title: 'Total SPD Diterbitkan',
      value: k ? String(k.totalSpd) : '0',
      unit: 'Dokumen',
      change: k ? k.spdMonthlyChange : '0 bln ini',
      changeType: k ? k.spdChangeType : 'neutral',
      icon: 'pi pi-file-check',
      colorClass: 'text-sky-600 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50',
    },
    {
      title: 'Total Surat Tugas',
      value: k ? String(k.totalSuratTugas) : '0',
      unit: 'Dokumen',
      change: k ? k.suratTugasMonthlyChange : '0 bln ini',
      changeType: k ? k.suratTugasChangeType : 'neutral',
      icon: 'pi pi-file',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50',
    },
    {
      title: 'SPD Sedang Aktif',
      value: k ? String(k.spdActive) : '0',
      unit: 'Dokumen',
      change: k ? k.spdActiveText : '0 dokumen disetujui',
      changeType: 'neutral',
      icon: 'pi pi-compass',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    },
    {
      title: 'ASN Pelaksana Tugas',
      value: k ? String(k.totalPegawai) : '0',
      unit: 'Orang',
      change: k ? k.pegawaiNewText : '0 ASN terdaftar',
      changeType: 'up',
      icon: 'pi pi-users',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
    },
  ];
});

// Recent real SPD records for quick glance
const recentSpdList = computed(() => statsData.value?.recentSpd || []);

// ─────────────────────────────────────────────────────────────────────────────
// Chart 1: Monthly SPD Issuance (Bar Chart - Dalam Daerah vs Luar Daerah)
// ─────────────────────────────────────────────────────────────────────────────
const monthlyBarData = computed(() => {
  const isD = isDark.value;
  const m = statsData.value?.monthlyStats;
  return {
    labels: m?.months || ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    datasets: [
      {
        label: 'Luar Daerah Sulteng',
        backgroundColor: isD ? '#38BDF8' : '#0F4C81',
        borderRadius: 6,
        data: m?.luarDaerah || [0, 0, 0, 0, 0, 0],
      },
      {
        label: 'Dalam Daerah (Kecamatan/Kab)',
        backgroundColor: isD ? '#F59E0B' : '#D97706',
        borderRadius: 6,
        data: m?.dalamDaerah || [0, 0, 0, 0, 0, 0],
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart 2: Transportation Mode Distribution (Doughnut Chart)
// ─────────────────────────────────────────────────────────────────────────────
const hasTransportData = computed(() => {
  const d = statsData.value?.transportModes?.data;
  return Array.isArray(d) && d.some((v: number) => v > 0);
});

const transportDoughnutData = computed(() => {
  const t = statsData.value?.transportModes;
  return {
    labels: t?.labels || ['Pesawat Udara', 'Kapal Laut / Feri', 'Speedboat Pemda', 'Kendaraan Darat'],
    datasets: [
      {
        data: t?.data || [0, 0, 0, 0],
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
  const t = statsData.value?.durationTrends;
  return {
    labels: t?.months || ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    datasets: [
      {
        label: 'Akumulasi Hari Dinas (Hari)',
        data: t?.data || [0, 0, 0, 0, 0, 0],
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
  const d = statsData.value?.topDestinations;
  return {
    labels: d?.labels || ['Belum ada destinasi'],
    datasets: [
      {
        label: 'Frekuensi Kunjungan',
        data: d?.data || [0],
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
        ticks: { color: textMuted, font: { size: 11 }, precision: 0 },
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

const formatDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

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

onMounted(async () => {
  checkAuth();
  await fetchDashboardStats();
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
                Tahun {{ currentYear }}
              </span>
            </div>
            <p class="text-xs sm:text-sm text-white/85 dark:text-text-muted mt-1 max-w-2xl leading-relaxed">
              Monitoring penerbitan, penugasan dinas ASN, dan pelaksanaan Surat Perjalanan Dinas Sekretariat Daerah.
            </p>
          </div>
        </div>

        <!-- Quick Top Action Buttons -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <router-link v-if="canManage" to="/surat-tugas/buat">
            <GovButton
              label="Buat Surat Tugas"
              icon="pi pi-file-plus"
              severity="secondary"
              class="!bg-white/15 !text-white hover:!bg-white/25 !border-white/20 shadow-sm"
            />
          </router-link>
          <router-link v-if="canManage" to="/spd/buat">
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
          <router-link to="/surat-tugas">
            <GovButton
              label="Lihat Surat Tugas"
              icon="pi pi-file"
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
            <i v-if="loadingStats" class="pi pi-spin pi-spinner text-xl text-text-muted"></i>
            <template v-else>{{ kpi.value }}</template>
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
          <span class="text-xs font-mono font-medium px-2 py-1 rounded bg-canvas text-text-muted border border-border">
            {{ statsData?.monthlyStats?.periodLabel || `Tahun ${currentYear}` }}
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
          <div v-if="!hasTransportData" class="text-center text-xs text-text-muted py-8">
            <i class="pi pi-compass text-3xl mb-2 text-text-muted/40 block"></i>
            <span>Belum ada data moda transportasi dinas.</span>
          </div>
          <Chart v-else type="doughnut" :data="transportDoughnutData" :options="doughnutChartOptions" class="w-full h-full" />
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
            Rerata {{ statsData?.durationTrends?.averageDaysPerSpd || 0 }} Hari/SPD
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
          <span class="text-xs text-text-muted">Total {{ statsData?.topDestinations?.totalVisits || 0 }} Kunjungan</span>
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
              <tr v-if="loadingStats">
                <td colspan="4" class="py-8 text-center text-text-muted">
                  <i class="pi pi-spin pi-spinner text-xl text-primary mb-2 block"></i>
                  <span>Memuat data riil SPD...</span>
                </td>
              </tr>
              <tr v-else-if="recentSpdList.length === 0">
                <td colspan="4" class="py-8 text-center text-text-muted">
                  <i class="pi pi-inbox text-3xl mb-2 block opacity-40"></i>
                  <span>Belum ada dokumen Surat Perjalanan Dinas (SPD) yang diterbitkan.</span>
                </td>
              </tr>
              <tr
                v-for="item in recentSpdList"
                :key="item.id || item.nomor"
                class="hover:bg-canvas transition-colors"
              >
                <td class="py-3 px-3">
                  <router-link
                    v-if="item.id"
                    :to="`/spd/cetak/${item.id}`"
                    class="font-bold text-text-main hover:text-primary transition-colors block"
                  >
                    {{ item.pegawai }}
                  </router-link>
                  <div v-else class="font-bold text-text-main">{{ item.pegawai }}</div>
                  <div class="text-[11px] font-mono text-primary font-medium">{{ item.nomor }}</div>
                </td>
                <td class="py-3 px-3 text-text-main font-medium">
                  {{ item.tujuan }}
                </td>
                <td class="py-3 px-3 text-text-muted">
                  <div>{{ formatDate(item.tanggal) }}</div>
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
              v-if="canManage"
              to="/surat-tugas/buat"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-file-plus text-primary text-sm"></i>
                <span>Penerbitan Surat Tugas Baru</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              v-if="canManage"
              to="/spd/buat"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-plus-circle text-primary text-sm"></i>
                <span>Penerbitan Formulir SPD Baru</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              to="/surat-tugas"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-list text-primary text-sm"></i>
                <span>Daftar Surat Tugas</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              to="/spd"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-briefcase text-primary text-sm"></i>
                <span>Daftar Dokumen SPD</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              v-if="canAccessSettings"
              to="/pengaturan/kop-surat"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-file-edit text-primary text-sm"></i>
                <span>Kelola Template Kop Surat Legal</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              v-if="canAccessSettings"
              to="/kepegawaian/asn"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
            >
              <div class="flex items-center gap-2.5">
                <i class="pi pi-users text-primary text-sm"></i>
                <span>Database Pegawai ASN Sekda</span>
              </div>
              <i class="pi pi-chevron-right text-text-muted text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>

            <router-link
              v-if="canAccessSettings"
              to="/pengaturan/pengguna"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-canvas transition-all text-xs font-semibold text-text-main group"
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
        <div class="bg-surface border border-border rounded-xl p-4 text-xs text-text-muted space-y-2">
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
