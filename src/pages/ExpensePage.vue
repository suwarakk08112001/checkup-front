<template>
    <q-page class="expense-page">
      <div class="expense-container">
      
  
        <!-- ===== KPI cards ===== -->
        <div class="kpi-grid">
          <div v-for="k in kpis" :key="k.title" class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">{{ k.title }}</span>
              <div class="kpi-icon" :style="{ background: k.iconBg, color: k.iconColor }">
                <q-icon :name="k.icon" size="16px" />
              </div>
            </div>
            <div class="kpi-value" :style="{ color: k.valueColor }">{{ k.value }}</div>
            <div class="kpi-sub">{{ k.sub }}</div>
          </div>
        </div>
  
        <!-- ===== Charts: fund status donut + overdue buckets ===== -->
        <div class="charts-grid">
          <div class="chart-card donut-card">
            <div class="chart-header">
              <q-icon name="donut_large" size="18px" class="chart-header-icon" />
              <span>สัดส่วนยอดเงิน</span>
            </div>
            <div class="chart-subtitle">ยอดที่ได้รับแล้ว เทียบกับยอดค้างเบิกจ่าย</div>
  
            <div class="donut-wrap">
              <div class="donut" :style="{ background: donutGradient }">
                <div class="donut-hole">
                  <span class="donut-hole-value">{{ receivedPercent }}%</span>
                  <span class="donut-hole-label">ได้รับแล้ว</span>
                </div>
              </div>
            </div>
  
            <div class="donut-legend">
              <div v-for="d in donutSlices" :key="d.label" class="legend-item">
                <span class="dot" :style="{ background: d.color }" />
                {{ d.label }}: <strong>{{ fmtBaht(d.value) }}</strong>
              </div>
            </div>
          </div>
  
          <div class="chart-card">
            <div class="chart-header">
              <q-icon name="warning_amber" size="18px" class="chart-header-icon" />
              <span>ยอดค้างชำระตามระยะเวลา</span>
            </div>
            <div class="chart-subtitle">จำนวนรอบและยอดเงินค้างจ่าย แยกตามความล่าช้า</div>
  
            <div class="bucket-list">
              <div v-for="b in overdueBuckets" :key="b.label" class="bucket-row">
                <div class="bucket-label">
                  <span class="dot" :style="{ background: b.color }" />
                  {{ b.label }}
                </div>
                <div class="bucket-bar-track">
                  <div
                    class="bucket-bar-fill"
                    :style="{ width: `${b.percent}%`, background: b.color }"
                  />
                </div>
                <div class="bucket-value">
                  {{ fmtBaht(b.amount) }}
                  <span class="bucket-count">({{ b.count }} รอบ)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- ===== Claims table ===== -->
        <div class="table-card">
          <div class="chart-header-row">
            <div class="chart-header">
              <q-icon name="fact_check" size="18px" class="chart-header-icon" />
              <span>รายการเบิกจ่ายรายรอบ</span>
            </div>
            <span class="table-count">{{ filteredClaims.length }} รายการ</span>
          </div>
  
          <!-- Horizontal-scroll wrapper: on mobile the table is wider than the
               viewport, so we let it scroll sideways inside the card instead
               of squeezing columns or breaking the page layout. -->
          <div class="table-scroll">
            <q-table
              flat
              :rows="filteredClaims"
              :columns="tableColumns"
              row-key="id"
              :pagination="{ rowsPerPage: 10 }"
              :grid="isMobile"
              class="claims-table"
            >
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    rounded
                    class="status-badge"
                    :style="{ background: statusMeta(props.row.status).bg, color: statusMeta(props.row.status).color }"
                  >
                    {{ props.row.status }}
                  </q-badge>
                </q-td>
              </template>
  
              <template #body-cell-overdueDays="props">
                <q-td :props="props">
                  <span v-if="props.row.overdueDays > 0" class="overdue-days">
                    {{ props.row.overdueDays }} วัน
                  </span>
                  <span v-else class="overdue-none">—</span>
                </q-td>
              </template>
  
              <template #body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    v-if="isOverdue(props.row)"
                    dense
                    flat
                    no-caps
                    size="sm"
                    icon="notifications"
                    label="แจ้งเตือน"
                    class="row-alert-btn"
                    :loading="sendingRowId === props.row.id"
                    @click="sendLineAlert(props.row)"
                  />
                  <span v-else class="row-alert-done">
                    <q-icon name="check_circle" size="16px" color="positive" /> ปกติ
                  </span>
                </q-td>
              </template>
            </q-table>
          </div>
        </div>
      </div>
    </q-page>
  </template>
  
  <script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from "vue";
  import { Notify } from "quasar";
  import * as XLSX from "xlsx";
  
  /* =========================================================================
   * Shared design tokens
   *
   * Single source of truth for the colors used across the KPI cards, donut,
   * bucket bars, and status badges, so a palette change only happens here.
   * Kept consistent with the overview dashboard's palette.
   * ========================================================================= */
  
  const COLORS = {
    revenue: "#1e6fd9",
    profit: "#17a865",
    warning: "#f5a524",
    danger: "#e5484d"
  } as const;
  
  /* =========================================================================
   * Responsive helper
   *
   * q-table's default row layout gets cramped under ~600px even with a
   * scroll wrapper, so below that width we switch it into Quasar's built-in
   * "grid" mode (renders each row as a stacked card instead of a table row).
   * ========================================================================= */
  
  const MOBILE_BREAKPOINT = 599;
  const viewportWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1280);
  
  function handleResize(): void {
    viewportWidth.value = window.innerWidth;
  }
  
  onMounted(() => window.addEventListener("resize", handleResize));
  onUnmounted(() => window.removeEventListener("resize", handleResize));
  
  const isMobile = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT);
  
  /* =========================================================================
   * Toolbar: fiscal year / period / status filters
   * ========================================================================= */
  
  interface Option {
    value: string;
    label: string;
  }
  
  // Only fiscal year 2026 has real claim records right now (see
  // CLAIM_RECORDS below) — 2024/2025 are included so the selector is usable
  // immediately, matching the overview dashboard's REAL_DATA_YEAR pattern.
  // Replace this once historical claim data is wired in.
  const REAL_DATA_YEAR = "2026";
  const fiscalYears: readonly Option[] = [
    { value: "2024", label: "พ.ศ. 2567" },
    { value: "2025", label: "พ.ศ. 2568" },
    { value: "2026", label: "พ.ศ. 2569" }
  ];
  const fiscalYear = ref<string>(REAL_DATA_YEAR);
  
  const periods: readonly Option[] = [
    { value: "all", label: "ทุกไตรมาส" },
    { value: "q1", label: "ไตรมาส 1" },
    { value: "q2", label: "ไตรมาส 2" },
    { value: "q3", label: "ไตรมาส 3" },
    { value: "q4", label: "ไตรมาส 4" }
  ];
  const activePeriod = ref<string>("all");
  
  const statusFilterOptions: readonly Option[] = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "normal", label: "ปกติ / รออนุมัติ" },
    { value: "warning3", label: "ล่าช้าเกิน 3 เดือน" },
    { value: "warning6", label: "ล่าช้าเกิน 6 เดือน" },
    { value: "paid", label: "ได้รับเงินแล้ว" }
  ];
  const statusFilter = ref<string>("all");
  
  /* =========================================================================
   * Claim register
   *
   * One row per disbursement round. `claimAmount` is the amount formally
   * submitted to the fund; rounds still in planning (not yet submitted) are
   * flagged `submitted: false` and excluded from the "total sent" KPI, but
   * their forecast amount is still counted toward "pending" since it's money
   * the department expects to have to chase once it is submitted.
   * ========================================================================= */
  
  type ClaimStatus =
    | "ได้รับเงินแล้ว"
    | "ปกติ / รออนุมัติ"
    | "ล่าช้าเกิน 3 เดือน"
    | "ล่าช้าเกิน 6 เดือน";
  
  interface ClaimRecord {
    id: string;
    orgName: string;
    fundSource: string;
    claimDate: string;
    claimAmount: number;
    receivedAmount: number;
    overdueDays: number;
    status: ClaimStatus;
    submitted: boolean;
    period: "q1" | "q2" | "q3" | "q4";
  }
  
  const CLAIM_RECORDS: readonly ClaimRecord[] = [
    {
      id: "PLH-69-001",
      orgName: "โรงเรียนปะเหลียนวิทยา",
      fundSource: "UC (สปสช.)",
      claimDate: "2026-01-20",
      claimAmount: 122640,
      receivedAmount: 122640,
      overdueDays: 0,
      status: "ได้รับเงินแล้ว",
      submitted: true,
      period: "q1"
    },
    {
      id: "PLH-69-002",
      orgName: "อบต.ท่าข้าม",
      fundSource: "อปท.",
      claimDate: "2026-02-15",
      claimAmount: 75420,
      receivedAmount: 0,
      overdueDays: 161,
      status: "ล่าช้าเกิน 3 เดือน",
      submitted: true,
      period: "q2"
    },
    {
      id: "PLH-69-003",
      orgName: "บริษัท แปรรูปยางตรัง จำกัด",
      fundSource: "ประกันสังคม",
      claimDate: "2026-04-10",
      claimAmount: 75850,
      receivedAmount: 0,
      overdueDays: 107,
      status: "ล่าช้าเกิน 3 เดือน",
      submitted: true,
      period: "q2"
    },
    {
      id: "PLH-69-004",
      orgName: "อบต.ปะเหลียน",
      fundSource: "CSMBS (กรมบัญชีกลาง)",
      claimDate: "2026-06-22",
      claimAmount: 96800,
      receivedAmount: 0,
      overdueDays: 31,
      status: "ปกติ / รออนุมัติ",
      submitted: true,
      period: "q3"
    },
    {
      id: "PLH-69-005",
      orgName: "รพ.สต.บ้านแหลมสอม / อบต.แหลมสอม",
      fundSource: "UC (สปสช.)",
      claimDate: "2026-08-15",
      claimAmount: 76000,
      receivedAmount: 0,
      overdueDays: 0,
      status: "ปกติ / รออนุมัติ",
      submitted: false,
      period: "q4"
    }
  ];
  
  const STATUS_FILTER_MATCH: Readonly<Record<string, ClaimStatus | null>> = {
    all: null,
    normal: "ปกติ / รออนุมัติ",
    warning3: "ล่าช้าเกิน 3 เดือน",
    warning6: "ล่าช้าเกิน 6 เดือน",
    paid: "ได้รับเงินแล้ว"
  };
  
  /* ---------------- Claims for the selected period ---------------- */
  
  // Only fiscal year 2026 has real claim-level records (see REAL_DATA_YEAR
  // above), so selecting a different year collapses this list to empty
  // rather than fabricating rows — the KPIs, charts, and table below all
  // read through this list, so they all fall back to zero together instead
  // of drifting out of sync with each other.
  const periodClaims = computed<ClaimRecord[]>(() => {
    if (fiscalYear.value !== REAL_DATA_YEAR) return [];
    return CLAIM_RECORDS.filter(
      c => activePeriod.value === "all" || c.period === activePeriod.value
    );
  });
  
  // Table rows apply the status filter on top of the period filter above.
  // KPIs/donut/buckets intentionally use `periodClaims` (period only) so the
  // summary cards always describe the whole period, while the table narrows
  // further to whatever status the user is looking for.
  const filteredClaims = computed<ClaimRecord[]>(() => {
    const wantedStatus = STATUS_FILTER_MATCH[statusFilter.value];
    return periodClaims.value.filter(
      c => wantedStatus === null || c.status === wantedStatus
    );
  });
  
  function isOverdue(row: ClaimRecord): boolean {
    return row.status === "ล่าช้าเกิน 3 เดือน" || row.status === "ล่าช้าเกิน 6 เดือน";
  }
  
  // The header "broadcast" button always covers every overdue round in the
  // system, independent of the current filters — it's a notification action,
  // not a view of the filtered data.
  const overdueCount = computed(() => CLAIM_RECORDS.filter(isOverdue).length);
  
  /* =========================================================================
   * Formatting helpers
   * ========================================================================= */
  
  function fmtBaht(amount: number): string {
    return `฿${Math.round(amount).toLocaleString("en-US")}`;
  }
  
  /* =========================================================================
   * KPI cards (fully derived from periodClaims)
   * ========================================================================= */
  
  const totalClaimed = computed(() =>
    periodClaims.value.filter(c => c.submitted).reduce((sum, c) => sum + c.claimAmount, 0)
  );
  
  const totalReceived = computed(() =>
    periodClaims.value.reduce((sum, c) => sum + c.receivedAmount, 0)
  );
  
  // Pending = unpaid portion of everything already submitted, plus the
  // forecast amount of rounds still awaiting submission — this is the
  // figure the department actually needs to chase or plan for.
  const totalPending = computed(() =>
    periodClaims.value.reduce((sum, c) => sum + (c.claimAmount - c.receivedAmount), 0)
  );
  
  const receivedPercent = computed(() =>
    totalClaimed.value ? Math.round((totalReceived.value / totalClaimed.value) * 100) : 0
  );
  
  const overdue3mCount = computed(
    () => periodClaims.value.filter(c => c.status === "ล่าช้าเกิน 3 เดือน").length
  );
  const overdue6mCount = computed(
    () => periodClaims.value.filter(c => c.status === "ล่าช้าเกิน 6 เดือน").length
  );
  
  interface Kpi {
    title: string;
    value: string;
    sub: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    valueColor?: string;
  }
  
  const kpis = computed<Kpi[]>(() => [
    {
      title: "ยอดเงินส่งเคลมตั้งเบิกทั้งหมด",
      value: fmtBaht(totalClaimed.value),
      sub: `จากการออกหน่วยทั้งหมด ${periodClaims.value.length} รอบ`,
      icon: "send",
      iconBg: "#e6f0fb",
      iconColor: COLORS.revenue
    },
    {
      title: "ยอดเงินที่ได้รับโอนแล้ว (Received)",
      value: fmtBaht(totalReceived.value),
      valueColor: COLORS.profit,
      sub: `${receivedPercent.value}% ของยอดส่งเคลม`,
      icon: "task_alt",
      iconBg: "#e3f7ea",
      iconColor: COLORS.profit
    },
    {
      title: "ยอดเงินค้างชำระรอเบิกจ่าย (Pending)",
      value: fmtBaht(totalPending.value),
      valueColor: COLORS.warning,
      sub: `เบิกจ่ายล่าช้าเกิน 3M (${overdue3mCount.value} รอบ) • เกิน 6M (${overdue6mCount.value} รอบ)`,
      icon: "hourglass_bottom",
      iconBg: "#fdf3dd",
      iconColor: COLORS.warning
    }
  ]);
  
  /* =========================================================================
   * Donut: received vs pending
   * ========================================================================= */
  
  const donutSlices = computed(() => [
    { label: "ได้รับแล้ว", value: totalReceived.value, color: COLORS.profit },
    { label: "ค้างชำระ", value: totalPending.value, color: COLORS.warning }
  ]);
  
  const donutGradient = computed(() => {
    const items = donutSlices.value;
    const total = items.reduce((sum, d) => sum + d.value, 0) || 1;
    let cursor = 0;
    const stops = items.map(d => {
      const start = (cursor / total) * 360;
      cursor += d.value;
      const end = (cursor / total) * 360;
      return `${d.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  });
  
  /* =========================================================================
   * Overdue buckets (normal / >3 months / >6 months / paid)
   * ========================================================================= */
  
  interface Bucket {
    label: string;
    color: string;
    amount: number;
    count: number;
    percent: number;
  }
  
  const BUCKET_ORDER: readonly ClaimStatus[] = [
    "ได้รับเงินแล้ว",
    "ปกติ / รออนุมัติ",
    "ล่าช้าเกิน 3 เดือน",
    "ล่าช้าเกิน 6 เดือน"
  ];
  
  const BUCKET_COLOR: Readonly<Record<ClaimStatus, string>> = {
    "ได้รับเงินแล้ว": COLORS.profit,
    "ปกติ / รออนุมัติ": COLORS.revenue,
    "ล่าช้าเกิน 3 เดือน": COLORS.warning,
    "ล่าช้าเกิน 6 เดือน": COLORS.danger
  };
  
  const overdueBuckets = computed<Bucket[]>(() => {
    const totals = new Map<ClaimStatus, { amount: number; count: number }>();
  
    periodClaims.value.forEach(c => {
      const pendingAmount = c.claimAmount - c.receivedAmount;
      const bucketAmount = c.status === "ได้รับเงินแล้ว" ? c.receivedAmount : pendingAmount;
      const existing = totals.get(c.status) ?? { amount: 0, count: 0 };
      totals.set(c.status, { amount: existing.amount + bucketAmount, count: existing.count + 1 });
    });
  
    const maxAmount = Math.max(...Array.from(totals.values(), t => t.amount), 1);
  
    // Only renders a row for statuses that actually appear this period, so
    // the bucket list never shows a stray zero-width bar.
    return BUCKET_ORDER.filter(status => totals.has(status)).map(status => {
      const t = totals.get(status)!;
      return {
        label: status,
        color: BUCKET_COLOR[status],
        amount: t.amount,
        count: t.count,
        percent: Math.round((t.amount / maxAmount) * 100)
      };
    });
  });
  
  /* =========================================================================
   * Status badge styling helper
   * ========================================================================= */
  
  const STATUS_BADGE_COLOR: Readonly<Record<ClaimStatus, { bg: string; color: string }>> = {
    "ได้รับเงินแล้ว": { bg: "#e3f7ea", color: COLORS.profit },
    "ล่าช้าเกิน 6 เดือน": { bg: "#fce8e8", color: COLORS.danger },
    "ล่าช้าเกิน 3 เดือน": { bg: "#fdf3dd", color: COLORS.warning },
    "ปกติ / รออนุมัติ": { bg: "#e6f0fb", color: COLORS.revenue }
  };
  
  function statusMeta(status: ClaimStatus): { bg: string; color: string } {
    return STATUS_BADGE_COLOR[status];
  }
  
  /* =========================================================================
   * Table columns
   * ========================================================================= */
  
  const tableColumns = [
    { name: "id", label: "รหัสรอบ", field: "id", align: "left" as const },
    { name: "orgName", label: "หน่วยงานเป้าหมาย", field: "orgName", align: "left" as const },
    { name: "fundSource", label: "กองทุน", field: "fundSource", align: "left" as const },
    { name: "claimDate", label: "วันที่ส่งเคลม", field: "claimDate", align: "left" as const },
    {
      name: "claimAmount",
      label: "ยอดส่งเคลม (บาท)",
      field: (row: ClaimRecord) => fmtBaht(row.claimAmount),
      align: "right" as const
    },
    {
      name: "receivedAmount",
      label: "ยอดที่ได้รับ (บาท)",
      field: (row: ClaimRecord) => fmtBaht(row.receivedAmount),
      align: "right" as const
    },
    { name: "overdueDays", label: "ค้างชำระ", field: "overdueDays", align: "center" as const },
    { name: "status", label: "สถานะ", field: "status", align: "center" as const },
    { name: "actions", label: "การแจ้งเตือน", field: "actions", align: "center" as const }
  ];
  
  /* =========================================================================
   * LINE alert action
   * ========================================================================= */
  
  const isSendingAlert = ref(false);
  const sendingRowId = ref<string | null>(null);
  
  // Sends an alert to the LINE group. Called either from the header button
  // (no argument -> broadcasts a summary of every overdue round) or from a
  // single table row's own "แจ้งเตือน" button (argument -> that round only).
  // Wired to an actual LINE Notify / Messaging API webhook by the backend
  // team; here it drives the loading state and confirmation toast.
  async function sendLineAlert(row?: ClaimRecord): Promise<void> {
    if (row) {
      sendingRowId.value = row.id;
    } else {
      isSendingAlert.value = true;
    }
  
    try {
      // Simulated network delay; replace with the real webhook call.
      await new Promise(resolve => setTimeout(resolve, 600));
  
      const message = row
        ? `ส่งแจ้งเตือนรอบ ${row.id} (${row.orgName}) ค้างชำระ ${row.overdueDays} วัน สำเร็จ`
        : `ส่งแจ้งเตือนสรุปยอดค้างชำระ ${overdueCount.value} รอบ ไปยังกลุ่มงานเทคนิคการแพทย์สำเร็จ`;
  
      Notify.create({ type: "positive", message, position: "top" });
    } catch (error) {
      console.error("Failed to send LINE alert:", error);
      Notify.create({
        type: "negative",
        message: "ส่งแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        position: "top"
      });
    } finally {
      isSendingAlert.value = false;
      sendingRowId.value = null;
    }
  }
  
  /* =========================================================================
   * Excel export
   * ========================================================================= */
  
  const isExporting = ref(false);
  
  interface ClaimExportRow {
    รหัสรอบ: string;
    หน่วยงานเป้าหมาย: string;
    กองทุน: string;
    วันที่ส่งเคลม: string;
    "ยอดส่งเคลม (บาท)": number;
    "ยอดที่ได้รับ (บาท)": number;
    "ยอดค้างชำระ (บาท)": number;
    จำนวนวันค้างชำระ: number;
    สถานะ: string;
  }
  
  const CLAIM_EXPORT_COL_WIDTHS: readonly number[] = [14, 32, 18, 14, 18, 18, 18, 16, 20];
  
  function exportClaimsToExcel(): void {
    // Only fiscal year 2026 has real claim records right now — see
    // REAL_DATA_YEAR / periodClaims above. Exporting a different year would
    // mean writing an empty sheet, so stop and tell the user instead
    // (mirrors the overview dashboard's exportTripsToExcel).
    if (fiscalYear.value !== REAL_DATA_YEAR) {
      const label = fiscalYears.find(y => y.value === fiscalYear.value)?.label ?? fiscalYear.value;
      Notify.create({
        type: "warning",
        message: `ยังไม่มีข้อมูลการเบิกจ่ายสำหรับ${label}`,
        caption: `มีข้อมูลจริงเฉพาะปีงบประมาณ ${fiscalYears.find(y => y.value === REAL_DATA_YEAR)?.label}`,
        position: "top"
      });
      return;
    }
  
    isExporting.value = true;
    try {
      const rows: ClaimExportRow[] = filteredClaims.value.map(c => ({
        รหัสรอบ: c.id,
        หน่วยงานเป้าหมาย: c.orgName,
        กองทุน: c.fundSource,
        วันที่ส่งเคลม: c.claimDate,
        "ยอดส่งเคลม (บาท)": c.claimAmount,
        "ยอดที่ได้รับ (บาท)": c.receivedAmount,
        "ยอดค้างชำระ (บาท)": c.claimAmount - c.receivedAmount,
        จำนวนวันค้างชำระ: c.overdueDays,
        สถานะ: c.status
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = CLAIM_EXPORT_COL_WIDTHS.map(wch => ({ wch }));
  
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ติดตามการเบิกจ่าย");
  
      const yearLabel = fiscalYears.find(y => y.value === fiscalYear.value)?.label ?? fiscalYear.value;
      const periodLabel = periods.find(p => p.value === activePeriod.value)?.label ?? "ทุกไตรมาส";
      XLSX.writeFile(
        workbook,
        `รายงานการเบิกจ่าย_${yearLabel.replace(/\s|\./g, "")}_${periodLabel}.xlsx`
      );
    } catch (error) {
      console.error("Failed to export claims report:", error);
      Notify.create({
        type: "negative",
        message: "ส่งออกไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        position: "top"
      });
    } finally {
      isExporting.value = false;
    }
  }
  </script>
  
  <style scoped>
  .expense-page {
    background: #f5f7fa;
    padding: 20px 16px 40px;
    overflow-x: hidden;
  }
  
  .expense-container {
    max-width: 1320px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  
  
  /* ===== KPI cards ===== */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }
  
  .kpi-card {
    background: #ffffff;
    border: 1px solid #e6e9ee;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  
  .kpi-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  
  .kpi-title {
    font-size: 0.76rem;
    color: #6b7280;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  
  .kpi-icon {
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    color: #1a1f27;
    line-height: 1.1;
  }
  
  .kpi-sub {
    font-size: 0.74rem;
    color: #8a94a3;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  
  /* ===== Charts =====
     Explicit two-column grid so the layout is predictable at every width
     instead of wrapping unpredictably between ~600–900px. */
  .charts-grid {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.3fr);
    gap: 14px;
    align-items: stretch;
  }
  
  .chart-card {
    background: #ffffff;
    border: 1px solid #e6e9ee;
    border-radius: 12px;
    padding: 18px;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  
  .donut-card {
    align-items: stretch;
  }
  
  .chart-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 700;
    color: #1a1f27;
  }
  
  .chart-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  
  .chart-header-icon {
    color: #1e6fd9;
  }
  
  .chart-subtitle {
    font-size: 0.8rem;
    color: #8a94a3;
    margin: 2px 0 12px;
    overflow-wrap: anywhere;
  }
  
  .donut-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 18px;
  }
  
  .donut {
    width: 168px;
    height: 168px;
    border-radius: 50%;
    position: relative;
    flex: none;
  }
  
  .donut-hole {
    position: absolute;
    inset: 30px;
    background: #ffffff;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .donut-hole-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: #1a1f27;
  }
  
  .donut-hole-label {
    font-size: 0.68rem;
    color: #8a94a3;
  }
  
  .donut-legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.78rem;
    color: #4b5563;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-wrap: anywhere;
  }
  
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex: none;
  }
  
  /* Overdue bucket bars */
  .bucket-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 6px;
  }
  
  .bucket-row {
    display: grid;
    grid-template-columns: 130px 1fr auto;
    align-items: center;
    gap: 10px;
  }
  
  .bucket-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: #4b5563;
    overflow-wrap: anywhere;
  }
  
  .bucket-bar-track {
    height: 8px;
    border-radius: 4px;
    background: #eef0f3;
    overflow: hidden;
  }
  
  .bucket-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .bucket-value {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1a1f27;
    text-align: right;
    white-space: nowrap;
  }
  
  .bucket-count {
    font-weight: 500;
    color: #8a94a3;
  }
  
  /* ===== Claims table ===== */
  .table-card {
    background: #ffffff;
    border: 1px solid #e6e9ee;
    border-radius: 12px;
    padding: 18px;
  }
  
  .table-count {
    font-size: 0.78rem;
    color: #8a94a3;
  }
  
  /* Lets the table scroll sideways inside its card on narrower screens
     instead of squeezing columns unreadably or blowing out the page. */
  .table-scroll {
    margin-top: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .claims-table {
    min-width: 760px;
  }
  
  /* q-table's grid mode (used on mobile via :grid="isMobile") renders full
     width cards instead of a fixed-width table, so drop the min-width. */
  .claims-table.q-table--grid {
    min-width: 0;
  }
  
  .claims-table :deep(thead th) {
    font-size: 0.74rem;
    font-weight: 700;
    color: #6b7280;
    background: #f8f9fb;
  }
  
  .claims-table :deep(tbody td) {
    font-size: 0.8rem;
    color: #1a1f27;
  }
  
  .status-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
  }
  
  .overdue-days {
    color: #e5484d;
    font-weight: 700;
  }
  
  .overdue-none {
    color: #b3bac5;
  }
  
  .row-alert-btn {
    color: #1e6fd9;
    font-size: 0.72rem;
    font-weight: 600;
  }
  
  .row-alert-done {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.74rem;
    color: #8a94a3;
  }
  
  /* ===== Tablet (600px–960px) =====
     Previously jumped straight from desktop styling to the 599px mobile
     override, leaving tablet widths (e.g. iPads, split-screen) using
     desktop spacing that felt cramped. */
  @media (max-width: 960px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  
    .kpi-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }
  
  /* ===== Mobile ===== */
  @media (max-width: 599px) {
    .expense-page {
      padding: 14px 10px 28px;
    }
  
    .header-card {
      grid-template-columns: 24px minmax(0, 1fr);
      column-gap: 8px;
      row-gap: 6px;
      padding: 10px 12px;
    }
  
    .header-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }
  
    .header-title-row {
      gap: 4px;
    }
  
    .header-title {
      font-size: 0.82rem;
      line-height: 1.25;
    }
  
    .header-title-en {
      font-size: 0.68rem;
      line-height: 1.2;
      white-space: normal;
    }
  
    .header-sub {
      font-size: 0.68rem;
      line-height: 1.3;
      margin-top: 1px;
    }
  
    .line-btn {
      min-height: 30px;
      padding: 0 10px;
      font-size: 0.68rem;
    }
  
    .filter-card {
      flex-direction: column;
      align-items: stretch;
    }
  
    .filter-select,
    .export-btn {
      width: 100%;
      min-width: 0;
    }
  
    .kpi-grid {
      grid-template-columns: 1fr;
    }
  
    .kpi-value {
      font-size: 1.3rem;
    }
  
    .bucket-row {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  
    .bucket-value {
      text-align: left;
      white-space: normal;
    }
  
    .chart-card,
    .table-card {
      padding: 14px;
    }
  
    .donut {
      width: 140px;
      height: 140px;
    }
  
    .donut-hole {
      inset: 24px;
    }
  }
  </style>