import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 1. KPI Metrics
    const totalSpd = await this.prisma.spd.count();
    const totalSuratTugas = await this.prisma.suratTugas.count();
    const spdActive = await this.prisma.spd.count({
      where: { status: 'DISETUJUI' },
    });
    const totalPegawai = await this.prisma.pegawai.count({
      where: { isASN: true },
    });

    // Monthly change calculations
    const startThisMonth = new Date(currentYear, currentMonth, 1);
    const startNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const startPrevMonth = new Date(currentYear, currentMonth - 1, 1);

    const spdThisMonth = await this.prisma.spd.count({
      where: { createdAt: { gte: startThisMonth, lt: startNextMonth } },
    });
    const spdPrevMonth = await this.prisma.spd.count({
      where: { createdAt: { gte: startPrevMonth, lt: startThisMonth } },
    });

    const stThisMonth = await this.prisma.suratTugas.count({
      where: { createdAt: { gte: startThisMonth, lt: startNextMonth } },
    });
    const stPrevMonth = await this.prisma.suratTugas.count({
      where: { createdAt: { gte: startPrevMonth, lt: startThisMonth } },
    });

    const spdDiff = spdThisMonth - spdPrevMonth;
    const spdMonthlyChange = spdDiff >= 0 ? `+${spdDiff} bln ini` : `${spdDiff} bln ini`;
    const spdChangeType = spdDiff >= 0 ? 'up' : 'down';

    const stDiff = stThisMonth - stPrevMonth;
    const suratTugasMonthlyChange = stDiff >= 0 ? `+${stDiff} bln ini` : `${stDiff} bln ini`;
    const suratTugasChangeType = stDiff >= 0 ? 'up' : 'down';

    // 2. Monthly Stats (Last 6 Months)
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthLabels: string[] = [];
    const luarDaerahCounts: number[] = [];
    const dalamDaerahCounts: number[] = [];
    const durationCounts: number[] = [];

    const localKeywords = [
      'banggai',
      'banggai laut',
      'banggai utara',
      'banggai tengah',
      'bokan',
      'labobo',
      'bangkurung',
      'dalam daerah',
    ];

    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(currentYear, currentMonth - i, 1);
      const mEnd = new Date(currentYear, currentMonth - i + 1, 1);
      monthLabels.push(MONTH_NAMES[mStart.getMonth()]);

      const spdsInMonth = await this.prisma.spd.findMany({
        where: {
          createdAt: { gte: mStart, lt: mEnd },
        },
        select: {
          tempatTujuan: true,
          lamaHari: true,
        },
      });

      let luar = 0;
      let dalam = 0;
      let days = 0;

      for (const item of spdsInMonth) {
        const dest = (item.tempatTujuan || '').toLowerCase().trim();
        const isLocal = localKeywords.some((kw) => dest.includes(kw));
        if (isLocal) {
          dalam++;
        } else {
          luar++;
        }
        days += item.lamaHari || 1;
      }

      luarDaerahCounts.push(luar);
      dalamDaerahCounts.push(dalam);
      durationCounts.push(days);
    }

    // 3. Transport Modes and Top Destinations from all records
    const allSpds = await this.prisma.spd.findMany({
      select: {
        id: true,
        tempatTujuan: true,
        alatAngkut: true,
        lamaHari: true,
      },
    });

    const transportMap: Record<string, number> = {
      'Pesawat Udara': 0,
      'Kapal Laut / Feri': 0,
      'Speedboat Pemda': 0,
      'Kendaraan Darat': 0,
    };

    for (const item of allSpds) {
      const text = item.alatAngkut || '';
      if (/pesawat/i.test(text)) {
        transportMap['Pesawat Udara']++;
      } else if (/kapal|feri/i.test(text)) {
        transportMap['Kapal Laut / Feri']++;
      } else if (/speedboat|speed/i.test(text)) {
        transportMap['Speedboat Pemda']++;
      } else if (/mobil|motor|kendaraan|darat/i.test(text)) {
        transportMap['Kendaraan Darat']++;
      } else if (text.trim()) {
        transportMap['Kendaraan Darat']++;
      }
    }

    // Average duration
    const totalDuration = allSpds.reduce((sum, s) => sum + (s.lamaHari || 1), 0);
    const averageDaysPerSpd = allSpds.length > 0 ? (totalDuration / allSpds.length).toFixed(1) : '0';

    // Top 5 Destinations
    const destMap: Record<string, number> = {};
    for (const item of allSpds) {
      const raw = (item.tempatTujuan || '').trim();
      if (!raw) continue;
      const clean = raw.split('/')[0]?.trim() || raw;
      destMap[clean] = (destMap[clean] || 0) + 1;
    }

    const sortedDests = Object.entries(destMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topDestLabels = sortedDests.length > 0 ? sortedDests.map(([name]) => name) : ['Belum ada destinasi'];
    const topDestData = sortedDests.length > 0 ? sortedDests.map(([, count]) => count) : [0];

    // 4. Recent 5 SPDs
    const recentList = await this.prisma.spd.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        pegawai: {
          select: {
            nama: true,
            nip: true,
          },
        },
      },
    });

    const recentSpd = recentList.map((s) => ({
      id: s.id,
      nomor: s.nomorSpd,
      pegawai: s.pegawai?.nama || 'Pegawai',
      nip: s.pegawai?.nip || '-',
      tujuan: s.tempatTujuan || '-',
      tanggal: s.tanggalBerangkat ? s.tanggalBerangkat.toISOString() : s.createdAt.toISOString(),
      durasi: `${s.lamaHari || 1} Hari`,
      status: s.status,
    }));

    return {
      kpi: {
        totalSpd,
        totalSuratTugas,
        spdActive,
        totalPegawai,
        spdMonthlyChange,
        spdChangeType,
        suratTugasMonthlyChange,
        suratTugasChangeType,
        spdActiveText: `${spdActive} dokumen disetujui`,
        pegawaiNewText: `${totalPegawai} ASN terdaftar`,
      },
      monthlyStats: {
        months: monthLabels,
        luarDaerah: luarDaerahCounts,
        dalamDaerah: dalamDaerahCounts,
        periodLabel: `${monthLabels[0]} - ${monthLabels[monthLabels.length - 1]} ${currentYear}`,
      },
      transportModes: {
        labels: Object.keys(transportMap),
        data: Object.values(transportMap),
      },
      durationTrends: {
        months: monthLabels,
        data: durationCounts,
        averageDaysPerSpd,
      },
      topDestinations: {
        labels: topDestLabels,
        data: topDestData,
        totalVisits: allSpds.length,
      },
      recentSpd,
    };
  }
}
