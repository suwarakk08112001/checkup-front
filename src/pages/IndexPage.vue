<template>
  <q-page class="dash-page">
    <div class="dash-container">
      <!-- ===== Toolbar ===== -->
      <div class="toolbar-card">
        <div class="toolbar-left">
          <div class="toolbar-title-row">
            <span class="toolbar-title">สรุปผลภาพรวมการออกหน่วยตรวจสุขภาพ</span>
            <q-badge rounded class="fy-badge"
              >ปีงบประมาณ {{ fiscalYearShortLabel }}</q-badge
            >
          </div>
          <div class="toolbar-sub">
            ศูนย์ตรวจสุขภาพ โรงพยาบาลปะเหลียน (PLH Wellness Center)
          </div>
        </div>

        <div class="toolbar-right">
          <q-select
            v-model="fiscalYear"
            :options="filteredFiscalYears"
            label="ปีงบประมาณ"
            outlined
            dense
            emit-value
            map-options
            use-input
            hide-selected
            fill-input
            clearable
            input-debounce="0"
            class="year-select"
            popup-content-class="filter-popup"
            @filter="filterFiscalYears"
            @clear="filteredFiscalYears = fiscalYears"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey"
                  >ไม่พบปีงบประมาณ</q-item-section
                >
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="activePeriod"
            :options="periods"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            dense
            outlined
            class="period-select"
          />

          <q-btn
            outline
            no-caps
            class="export-btn"
            icon="file_download"
            label="Export Excel"
            :loading="isExporting"
            @click="exportTripsToExcel"
          />
        </div>
      </div>

      <!-- ===== KPI cards ===== -->
      <div class="kpi-grid">
        <div v-for="k in kpis" :key="k.title" class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">{{ k.title }}</span>
            <div
              class="kpi-icon"
              :style="{ background: k.iconBg, color: k.iconColor }"
            >
              <q-icon :name="k.icon" size="16px" />
            </div>
          </div>

          <div class="kpi-value-row">
            <span class="kpi-value" :style="{ color: k.valueColor }">{{
              k.value
            }}</span>
            <q-badge
              v-if="k.chip"
              rounded
              class="kpi-chip"
              :style="{ background: k.chipBg, color: k.chipColor }"
            >
              {{ k.chip }}
            </q-badge>
            <span v-if="k.chipMuted" class="kpi-chip-muted">{{
              k.chipMuted
            }}</span>
          </div>

          <div class="kpi-sub">{{ k.sub }}</div>
        </div>
      </div>

      <!-- ===== Charts (revenue / cost breakdown) ===== -->
      <div class="charts-grid">
        <!-- Bar chart -->
        <div class="chart-card">
          <div class="chart-header">
            <q-icon name="bar_chart" size="18px" class="chart-header-icon" />
            <span>การเปรียบเทียบทางการเงิน</span>
          </div>
          <div class="chart-subtitle">
            เปรียบเทียบ รายได้ ต้นทุน และกำไรสุทธิ รายรอบออกหน่วย (ชี้เมาส์ที่แท่งเพื่อดูค่า)
          </div>

          <div v-if="!hasBarData" class="chart-empty">
            ไม่มีข้อมูลสำหรับช่วงเวลานี้
          </div>
          <template v-else>
            <div class="bar-scroll">
              <svg
                class="bar-svg"
                :viewBox="`0 0 ${BAR_CHART.width} ${BAR_CHART.height}`"
                preserveAspectRatio="xMidYMid meet"
              >
                <!-- gridlines -->
                <g class="grid">
                  <template v-for="g in gridLines" :key="g.value">
                    <line
                      :x1="BAR_CHART.marginLeft"
                      :x2="BAR_CHART.width - BAR_CHART.marginRight"
                      :y1="g.pos"
                      :y2="g.pos"
                    />
                    <text
                      :x="BAR_CHART.marginLeft - 8"
                      :y="g.pos + 4"
                      text-anchor="end"
                    >
                      {{ g.label }}
                    </text>
                  </template>
                </g>

                <!-- bars -->
                <g>
                  <rect
                    v-for="(b, idx) in bars"
                    :key="idx"
                    :x="b.x"
                    :y="b.y"
                    :width="b.width"
                    :height="b.height"
                    :fill="b.color"
                    rx="3"
                    class="chart-rect"
                    :class="{ 'is-dim': hoveredBarIndex !== null && hoveredBarIndex !== idx }"
                    @mouseenter="onBarHover($event, b, idx)"
                    @mousemove="moveTooltip($event)"
                    @mouseleave="onBarLeave"
                  />
                </g>

                <!-- x labels -->
                <g class="x-labels">
                  <text
                    v-for="u in unitLabels"
                    :key="u.id"
                    :x="u.x"
                    :y="BAR_CHART.height - BAR_CHART.marginBottom + 20"
                    text-anchor="middle"
                  >
                    {{ u.id }}
                  </text>
                </g>
              </svg>
            </div>

            <div class="chart-legend">
              <div class="legend-item">
                <span class="dot" :style="{ background: COLORS.profit }" />
                กำไรสุทธิ
              </div>
              <div class="legend-item">
                <span class="dot" :style="{ background: COLORS.cost }" />
                ต้นทุน
              </div>
              <div class="legend-item">
                <span class="dot" :style="{ background: COLORS.revenue }" />
                รายได้
              </div>
            </div>
          </template>
        </div>

        <!-- Donut chart -->
        <div class="chart-card donut-card">
          <div class="chart-header">
            <q-icon name="donut_large" size="18px" class="chart-header-icon" />
            <span>โครงสร้างต้นทุน</span>
          </div>
          <div class="chart-subtitle">
            สัดส่วนสถิติโครงสร้างต้นทุน (Cost Breakdown) — ชี้เมาส์หรือคลิกที่รายการเพื่อไฮไลต์
          </div>

          <div v-if="!hasDonutData" class="chart-empty">
            ไม่มีข้อมูลสำหรับช่วงเวลานี้
          </div>
          <template v-else>
            <div class="donut-wrap">
              <svg
                class="donut-svg"
                viewBox="0 0 200 200"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  v-for="s in donutSlices"
                  :key="s.label"
                  :d="s.path"
                  :fill="s.color"
                  class="chart-path"
                  :class="{ 'is-dim': hoveredDonutLabel !== null && hoveredDonutLabel !== s.label }"
                  @mouseenter="onDonutHover($event, s)"
                  @mousemove="moveTooltip($event)"
                  @mouseleave="onDonutLeave"
                />
              </svg>
            </div>

            <div class="donut-legend">
              <div
                v-for="c in donutSlices"
                :key="c.label"
                class="legend-item legend-item-clickable"
                :class="{ 'is-dim': hoveredDonutLabel !== null && hoveredDonutLabel !== c.label }"
                @mouseenter="hoveredDonutLabel = c.label"
                @mouseleave="hoveredDonutLabel = null"
              >
                <span class="dot" :style="{ background: c.color }" />
                {{ c.label }}:
                <strong>฿{{ c.amountLabel }}</strong>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ===== Charts (fund tracking / revenue mix) ===== -->
      <div class="charts-grid">
        <!-- Pie chart: financial tracking status -->
        <div class="chart-card status-card">
          <div class="chart-header-row">
            <div class="chart-header">
              <q-icon
                name="account_balance_wallet"
                size="18px"
                class="chart-header-icon"
              />
              <span>FINANCIAL TRACKING</span>
            </div>
            <span class="chart-link">จัดการการเบิกจ่าย →</span>
          </div>
          <div class="chart-subtitle">
            สถานะการรับเงินและติดตามเบิกจ่ายจากกองทุน — ชี้เมาส์เพื่อดูรายละเอียด
          </div>

          <div v-if="isLoadingPayStatus" class="chart-empty">
            กำลังโหลดข้อมูล...
          </div>
          <div v-else-if="!hasStatusData" class="chart-empty">
            ไม่มีข้อมูลสำหรับช่วงเวลานี้
          </div>
          <template v-else>
            <div class="status-pie-wrap">
              <svg
                class="status-pie-svg"
                :viewBox="`0 0 ${STATUS_PIE.viewBoxW} ${STATUS_PIE.viewBoxH}`"
                preserveAspectRatio="xMidYMid meet"
              >
                <g>
                  <path
                    v-for="s in statusSlices"
                    :key="s.label"
                    :d="s.path"
                    :fill="s.color"
                    class="chart-path"
                    :class="{ 'is-dim': hoveredStatusLabel !== null && hoveredStatusLabel !== s.label }"
                    @mouseenter="onStatusHover($event, s)"
                    @mousemove="moveTooltip($event)"
                    @mouseleave="onStatusLeave"
                  />
                </g>
                <g class="status-pie-labels">
                  <template v-for="s in statusSlices" :key="`${s.label}-label`">
                    <line
                      :x1="s.labelLine.x1"
                      :y1="s.labelLine.y1"
                      :x2="s.labelLine.x2"
                      :y2="s.labelLine.y2"
                    />
                    <text
                      v-for="(line, li) in s.labelLines"
                      :key="li"
                      :x="s.labelPos.x"
                      :y="s.labelPos.y + (li === 0 ? -4 : 10)"
                      :text-anchor="s.labelPos.anchor"
                      fill="#4b5563"
                    >
                      {{ line }}
                    </text>
                  </template>
                </g>
              </svg>
            </div>

            <!-- Renders one line per status that actually exists this period,
                 driven by the same statusItems the pie chart uses, so the
                 footer can never drift out of sync with the number of
                 slices. -->
            <div class="status-footer">
              <div
                v-for="s in statusItems"
                :key="s.label"
                class="status-footer-item status-footer-item-clickable"
                :class="{ 'is-dim': hoveredStatusLabel !== null && hoveredStatusLabel !== s.label }"
                @mouseenter="hoveredStatusLabel = s.label"
                @mouseleave="hoveredStatusLabel = null"
              >
                <span class="dot" :style="{ background: s.color }" />
                {{ statusFooterLabel(s.label) }}:
                <strong :style="{ color: s.color }"
                  >฿{{ fmtNum(s.amount) }}</strong
                >
                <span v-if="s.overdueAmount" class="status-footer-overdue">
                  (ค้าง ฿{{ fmtNum(s.overdueAmount) }})
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Horizontal bar chart: revenue mix -->
        <div class="chart-card">
          <div class="chart-header">
            <q-icon
              name="stacked_bar_chart"
              size="18px"
              class="chart-header-icon"
            />
            <span>REVENUE MIX</span>
          </div>
          <div class="chart-subtitle">
            จำนวนผู้รับบริการแยกตามสิทธิ์การรักษา — ชี้เมาส์ที่แท่งเพื่อดูค่า
          </div>

          <div v-if="isLoadingBenefitTotals" class="hbar-loading">
            กำลังโหลดข้อมูล...
          </div>
          <div
            v-else-if="revenueMix.length === 0"
            class="hbar-empty"
          >
            ไม่มีข้อมูลสำหรับช่วงเวลานี้
          </div>
          <template v-else>
            <div class="hbar-scroll">
              <svg
                class="hbar-svg"
                :viewBox="`0 0 ${HBAR_CHART.width} ${HBAR_CHART.height}`"
                preserveAspectRatio="xMidYMid meet"
              >
                <g class="hbar-grid">
                  <template v-for="g in hbarGridLines" :key="g.value">
                    <line
                      :x1="g.pos"
                      :x2="g.pos"
                      :y1="HBAR_CHART.marginTop"
                      :y2="HBAR_CHART.height - HBAR_CHART.marginBottom"
                    />
                    <text
                      :x="g.pos"
                      :y="HBAR_CHART.height - HBAR_CHART.marginBottom + 18"
                      text-anchor="middle"
                    >
                      {{ g.label }}
                    </text>
                  </template>
                </g>

                <g>
                  <rect
                    v-for="b in hbars"
                    :key="b.value"
                    :x="HBAR_CHART.marginLeft"
                    :y="b.y"
                    :width="b.width"
                    :height="b.height"
                    :fill="b.color"
                    rx="3"
                    class="chart-rect"
                    :class="{
                      'is-dim': hoveredHbarLabel !== null && hoveredHbarLabel !== b.label.join(' '),
                      'is-empty': b.isEmpty
                    }"
                    @mouseenter="onHbarHover($event, b)"
                    @mousemove="moveTooltip($event)"
                    @mouseleave="onHbarLeave"
                  />
                </g>

                <g class="hbar-labels">
                  <template v-for="b in hbars" :key="`${b.value}-label`">
                    <text
                      v-for="(line, li) in b.label"
                      :key="li"
                      :x="HBAR_CHART.marginLeft - 10"
                      :y="b.y + b.height / 2 + (li === 0 ? -4 : 10)"
                      text-anchor="end"
                      fill="#4b5563"
                    >
                      {{ line }}
                    </text>
                  </template>
                </g>
              </svg>
            </div>

            <!-- Legend footer, same treatment as the FINANCIAL TRACKING
                 status-footer: one clickable row per benefit, driven by
                 the same revenueMix data the bars use so it can never
                 drift out of sync with the chart. -->
            <div class="status-footer">
              <div
                v-for="r in revenueMix"
                :key="r.label.join(' ')"
                class="status-footer-item status-footer-item-clickable"
                :class="{ 'is-dim': hoveredHbarLabel !== null && hoveredHbarLabel !== r.label.join(' ') }"
                @mouseenter="hoveredHbarLabel = r.label.join(' ')"
                @mouseleave="hoveredHbarLabel = null"
              >
                <span class="dot" :style="{ background: r.color }" />
                {{ r.label.join(' ') }}:
                <strong :style="{ color: r.color }">฿{{ fmtNum(r.value) }}</strong>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ===== Shared hover tooltip (used by every chart) ===== -->
    <div
      v-if="tooltip.visible"
      class="chart-tooltip"
      :style="{ left: `${tooltip.x + 14}px`, top: `${tooltip.y + 14}px` }"
    >
      <div class="chart-tooltip-title">{{ tooltip.title }}</div>
      <div v-for="(line, i) in tooltip.lines" :key="i" class="chart-tooltip-line">
        {{ line }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Notify } from "quasar";
import * as XLSX from "xlsx";
import { api } from '@/boot/axios';
import type { AxiosError } from 'axios';
/* =========================================================================
 * Shared design tokens
 * ========================================================================= */

/** Single source of truth for series/status colors, reused across the bar
 *  chart legend, the cost-breakdown donut, and the fund-tracking pie so a
 *  palette change only happens in one place. */
const COLORS = {
  revenue: "#1e6fd9",
  cost: "#94a3b8",
  profit: "#17a865",
  warning: "#f5a524",
  purple: "#7e3ff2",
  info: "#29b6f6",
  danger: "#e5484d"
} as const;

/* =========================================================================
 * Shared hover tooltip
 *
 * A single tooltip instance is reused by every chart (bar, donut, status
 * pie, hbar) — each chart just calls showTooltip()/moveTooltip()/
 * hideTooltip() on hover, keeping the positioning logic in one place.
 * ========================================================================= */

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  lines: string[];
}

const tooltip = ref<TooltipState>({
  visible: false,
  x: 0,
  y: 0,
  title: "",
  lines: []
});

function showTooltip(event: MouseEvent, title: string, lines: string[]): void {
  tooltip.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    title,
    lines
  };
}

function moveTooltip(event: MouseEvent): void {
  if (!tooltip.value.visible) return;
  tooltip.value.x = event.clientX;
  tooltip.value.y = event.clientY;
}

function hideTooltip(): void {
  tooltip.value.visible = false;
}

/* =========================================================================
 * Toolbar: period filter
 * ========================================================================= */

interface Period {
  value: string;
  label: string;
}

const periods: readonly Period[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "q1", label: "ไตรมาส 1" },
  { value: "q2", label: "ไตรมาส 2" },
  { value: "q3", label: "ไตรมาส 3" },
  { value: "q4", label: "ไตรมาส 4" }
];

const activePeriod = ref<string>("all");

/* =========================================================================
 * Toolbar: fiscal year filter
 * ========================================================================= */

interface FiscalYear {
  value: string;
  label: string;
}

const THAI_MONTHS_ABBR: readonly string[] = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค."
];

// Thai fiscal year N (พ.ศ.) runs 1 ต.ค. of (N-1) through 30 ก.ย. of N.
// `gregorianYear` is the internal key used everywhere else (matches
// UNITS_BY_PERIOD / STATUS_BY_PERIOD / YEAR_SCALE); the label is derived
// from it purely for display.
function fiscalYearLabel(gregorianYear: number): string {
  const buddhistEra = gregorianYear + 543;
  const startBuddhistEra = buddhistEra - 1;
  return `พ.ศ. ${buddhistEra} (${THAI_MONTHS_ABBR[9]} ${startBuddhistEra} – ${THAI_MONTHS_ABBR[8]} ${buddhistEra})`;
}

// Only 2026 has real recorded trips right now. 2024/2025 are included so
// the selector is usable immediately, scaled down from the 2026 base
// figures as a stand-in until actual historical data is wired in —
// replace YEAR_SCALE with real per-year datasets when available.
const REAL_DATA_YEAR = "2026";
const fiscalYears: readonly FiscalYear[] = [2024, 2025, 2026].map(year => ({
  value: String(year),
  label: fiscalYearLabel(year)
}));

// Separate ref for what the dropdown currently displays vs. the full
// list — @filter narrows this down as the user types, mirroring
// Quasar's own "use-input" filtering example.
const filteredFiscalYears = ref<readonly FiscalYear[]>(fiscalYears);

function filterFiscalYears(
  val: string,
  update: (cb: () => void) => void
): void {
  if (val === "") {
    update(() => {
      filteredFiscalYears.value = fiscalYears;
    });
    return;
  }

  update(() => {
    const needle = val.toLowerCase();
    filteredFiscalYears.value = fiscalYears.filter(y =>
      y.label.toLowerCase().includes(needle)
    );
  });
}

const fiscalYear = ref<string | null>(REAL_DATA_YEAR);

// Short label ("พ.ศ. 2569") for the badge next to the page title, where
// the full "(ต.ค. – ก.ย.)" range would be too long. Falls back to a
// neutral label when the select has been cleared.
const fiscalYearShortLabel = computed<string>(() =>
  fiscalYear.value ? `พ.ศ. ${Number(fiscalYear.value) + 543}` : "ทั้งหมด"
);

const YEAR_SCALE: Readonly<Record<string, number>> = {
  "2024": 0.82,
  "2025": 0.91,
  "2026": 1
};

// Clearing the year select falls back to the latest year's figures
// (scale 1) rather than showing nothing.
const yearScale = computed<number>(() =>
  fiscalYear.value ? (YEAR_SCALE[fiscalYear.value] ?? 1) : 1
);

/* =========================================================================
 * Underlying per-period datasets
 * ========================================================================= */

interface Unit {
  id: string;
  revenue: number;
  cost: number;
}

// Typed as a fixed 5-tuple (not a generic array) so that UNITS_ALL[0..4]
// below resolve to `Unit`, not `Unit | undefined`, under
// noUncheckedIndexedAccess. If a trip is ever added or removed here, the
// tuple length must be updated to match, or TS will flag the mismatch.
const UNITS_ALL: readonly [Unit, Unit, Unit, Unit, Unit] = [
  { id: "PLH-69-001", revenue: 108000, cost: 34000 },
  { id: "PLH-69-002", revenue: 76000, cost: 36000 },
  { id: "PLH-69-003", revenue: 77000, cost: 32000 },
  { id: "PLH-69-004", revenue: 93000, cost: 31000 },
  { id: "PLH-69-005", revenue: 92710, cost: 35360 }
];

// Each quarter maps to the trip(s) that happened in it; "all" is the
// full-year rollup. This keeps every number below internally consistent
// instead of being separate mock data per period.
const UNITS_BY_PERIOD: Readonly<Record<string, readonly Unit[]>> = {
  all: UNITS_ALL,
  q1: [UNITS_ALL[0]],
  q2: [UNITS_ALL[1], UNITS_ALL[2]],
  q3: [UNITS_ALL[3]],
  q4: [UNITS_ALL[4]]
};

interface CostSlice {
  label: string;
  value: number;
  color: string;
}

const COST_BREAKDOWN_BY_PERIOD: Readonly<Record<string, readonly CostSlice[]>> =
  {
    all: [
      { label: "วัสดุ/น้ำยาแล็บ", value: 66500, color: COLORS.profit },
      { label: "ค่าแรงบุคลากร", value: 80900, color: COLORS.revenue },
      { label: "ค่าพาหนะ/น้ำมัน", value: 2400, color: COLORS.warning },
      { label: "ค่าใช้สอยอื่นๆ", value: 18600, color: COLORS.purple }
    ],
    q1: [
      { label: "วัสดุ/น้ำยาแล็บ", value: 13430, color: COLORS.profit },
      { label: "ค่าแรงบุคลากร", value: 16340, color: COLORS.revenue },
      { label: "ค่าพาหนะ/น้ำมัน", value: 490, color: COLORS.warning },
      { label: "ค่าใช้สอยอื่นๆ", value: 3740, color: COLORS.purple }
    ],
    q2: [
      { label: "วัสดุ/น้ำยาแล็บ", value: 26870, color: COLORS.profit },
      { label: "ค่าแรงบุคลากร", value: 32680, color: COLORS.revenue },
      { label: "ค่าพาหนะ/น้ำมัน", value: 970, color: COLORS.warning },
      { label: "ค่าใช้สอยอื่นๆ", value: 7510, color: COLORS.purple }
    ],
    q3: [
      { label: "วัสดุ/น้ำยาแล็บ", value: 12240, color: COLORS.profit },
      { label: "ค่าแรงบุคลากร", value: 14890, color: COLORS.revenue },
      { label: "ค่าพาหนะ/น้ำมัน", value: 440, color: COLORS.warning },
      { label: "ค่าใช้สอยอื่นๆ", value: 3420, color: COLORS.purple }
    ],
    q4: [
      { label: "วัสดุ/น้ำยาแล็บ", value: 13970, color: COLORS.profit },
      { label: "ค่าแรงบุคลากร", value: 16990, color: COLORS.revenue },
      { label: "ค่าพาหนะ/น้ำมัน", value: 500, color: COLORS.warning },
      { label: "ค่าใช้สอยอื่นๆ", value: 3900, color: COLORS.purple }
    ]
  };

interface StatusItem {
  label: string;
  count: number;
  color: string;
  /** Baht amount tied to this specific status (see getStatusDisplayAmount
   *  for which underlying API field this pulls from per status). */
  amount: number;
  /** Only set for "ชำระเงินไม่ครบถ้วน" — the outstanding portion still
   *  owed, shown alongside `amount` (received so far). */
  overdueAmount?: number;
}

// Labels in STATUS_BY_PERIOD are now already the friendly Thai names the
// finance team asked for, so the footer no longer needs to rewrite them —
// this simply passes the label through. Kept as a function (rather than
// removing the call sites) so future relabeling only needs to happen here.
function statusFooterLabel(pieLabel: string): string {
  return pieLabel;
}

/* =========================================================================
 * Fund tracking status: fetched from /dashboard/totalPayStatus (replaces
 * the old STATUS_BY_PERIOD mock map — that data is gone now that this is
 * wired to the real API, same pattern as revenueMix/benefitTotals below).
 * ========================================================================= */

interface PayStatusTotal {
  statusId: number;
  statusName: string;
  totalCount: number;
  totalClaimAmount: number;
  totalReceiveAmount: number;
  totalOverdueAmount: number;
  isFullyPaid: boolean;
  displayAmount: number;
}

// Fixed color per status name so the pie/footer/legend stay visually
// consistent across periods regardless of what order the API returns
// them in. Falls back to COLORS.purple for any future/unknown status.
const PAY_STATUS_COLOR: Readonly<Record<string, string>> = {
  รอเบิกจ่ายปกติ: COLORS.info,
  ชำระเงินครบถ้วน: COLORS.profit,
  ชำระเงินไม่ครบถ้วน: COLORS.warning,
  ยังไม่ชำระเงิน: COLORS.danger
};

// Picks the Baht figure that actually matters for each status, rather
// than trusting whatever the API happens to put in displayAmount:
//   - รอเบิกจ่ายปกติ:     ยอดที่เบิกไว้ (ยังไม่ถึงกำหนด)     -> totalClaimAmount
//   - ชำระเงินครบถ้วน:    ยอดที่ได้รับเงินแล้วเต็มจำนวน       -> totalReceiveAmount
//   - ชำระเงินไม่ครบถ้วน: ยอดที่ได้รับมาแล้วบางส่วน           -> totalReceiveAmount
//                          (ยอดที่ยังค้างอยู่โชว์แยกผ่าน overdueAmount)
//   - ยังไม่ชำระเงิน:     ยอดที่ยังไม่ได้รับเลย ต้องติดตาม     -> totalOverdueAmount
function getStatusDisplayAmount(s: PayStatusTotal): number {
  switch (s.statusName) {
    case "รอเบิกจ่ายปกติ":
      return s.totalClaimAmount;
    case "ชำระเงินครบถ้วน":
      return s.totalReceiveAmount;
    case "ชำระเงินไม่ครบถ้วน":
      return s.totalReceiveAmount;
    case "ยังไม่ชำระเงิน":
      return s.totalOverdueAmount;
    default:
      return s.displayAmount;
  }
}

const payStatusTotals = ref<PayStatusTotal[]>([]);
const isLoadingPayStatus = ref(false);

async function fetchPayStatusTotals(): Promise<void> {
  if (!fiscalYear.value) {
    payStatusTotals.value = [];
    return;
  }

  isLoadingPayStatus.value = true;
  try {
    const res = await api.get<PayStatusTotal[]>("/dashboard/totalPayStatus", {
      params: {
        financialYear: fiscalYear.value,
        quater: toQuaterParam(activePeriod.value)
      }
    });
    // กันกรณี response ถูกห่อไว้อีกชั้น หรือไม่ใช่ array
    const data = res.data as unknown;
    payStatusTotals.value = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
  } catch (err) {
    const error = err as AxiosError;
    console.error("Failed to fetch pay status totals:", error);
    Notify.create({
      type: "negative",
      message: "ดึงข้อมูลสถานะการเบิกจ่ายไม่สำเร็จ",
      caption: error.response
        ? `HTTP ${error.response.status}`
        : error.message,
      position: "top"
    });
    payStatusTotals.value = [];
  } finally {
    isLoadingPayStatus.value = false;
  }
}

// Re-fetch whenever the toolbar's year or period changes — same trigger
// as fetchBenefitTotals above.
watch([fiscalYear, activePeriod], fetchPayStatusTotals, { immediate: true });

interface RevenueSource {
  label: readonly string[];
  value: number;
  color: string;
}

const PATIENTS_BY_PERIOD: Readonly<Record<string, number>> = {
  all: 610,
  q1: 148,
  q2: 209,
  q3: 127,
  q4: 126
};

const PLAN_PERCENT_BY_PERIOD: Readonly<Record<string, number>> = {
  all: 73,
  q1: 71,
  q2: 78,
  q3: 69,
  q4: 74
};

/* =========================================================================
 * Revenue mix: fetched from /dashboard/totalbenefit (replaces the old
 * REVENUE_MIX_BY_PERIOD mock map — that data is gone now that this is
 * wired to the real API).
 * ========================================================================= */

// Adjust to wherever the project's real API base URL is configured.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface BenefitTotal {
  benefitId: number;
  benefitname: string | null;
  total: number;
}

// "q1".."q4" -> "1".."4", "all" -> "all"
function toQuaterParam(period: string): string {
  return period.startsWith("q") ? period.slice(1) : period;
}

const benefitTotals = ref<BenefitTotal[]>([]);
const isLoadingBenefitTotals = ref(false);

async function fetchBenefitTotals(): Promise<void> {
  if (!fiscalYear.value) {
    benefitTotals.value = [];
    return;
  }

  isLoadingBenefitTotals.value = true;
  try {
    const res = await api.get<BenefitTotal[]>("/dashboard/totalbenefit", {
      params: {
        financialYear: fiscalYear.value,
        quater: toQuaterParam(activePeriod.value)
      }
    });
    // กันกรณี response ถูกห่อไว้อีกชั้น หรือไม่ใช่ array
    const data = res.data as unknown;
    benefitTotals.value = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
  } catch (err) {
    const error = err as AxiosError;
    console.error("Failed to fetch benefit totals:", error);
    Notify.create({
      type: "negative",
      message: "ดึงข้อมูลสิทธิ์การรักษาไม่สำเร็จ",
      caption: error.response
        ? `HTTP ${error.response.status}`
        : error.message,
      position: "top"
    });
    benefitTotals.value = [];
  } finally {
    isLoadingBenefitTotals.value = false;
  }
}

// Re-fetch whenever the toolbar's year or period changes.
watch([fiscalYear, activePeriod], fetchBenefitTotals, { immediate: true });

// Cycles through the palette so each benefit gets a distinguishable bar
// color instead of every row rendering in the same COLORS.revenue blue.
const BENEFIT_COLOR_CYCLE: readonly string[] = [
  COLORS.revenue,
  COLORS.purple,
  COLORS.warning,
  COLORS.info,
  COLORS.profit
];

// No longer filters out b.total === 0 — a category with no data this
// period should still render as a (minimum-width) bar rather than
// disappearing from the chart entirely. See hbars below for the
// minimum-width handling.
const revenueMix = computed<RevenueSource[]>(() =>
  benefitTotals.value.map((b, i) => ({
    label: [b.benefitname ?? "ไม่ระบุสิทธิ์"],
    value: b.total,
    color: BENEFIT_COLOR_CYCLE[i % BENEFIT_COLOR_CYCLE.length]
  }))
);

/* =========================================================================
 * Trip register (source for Excel export)
 *
 * One row per trip with the full column set the finance team asked for —
 * this is richer than UNITS_ALL above (which only carries revenue/cost
 * for the charts), so it's kept as its own table rather than derived.
 * Fields that don't apply yet (a trip still in planning) use "-" because
 * that's what should literally appear in the exported spreadsheet cell.
 * ========================================================================= */

interface TripRecord {
  รหัสการออกหน่วย: string;
  "ชื่องาน / วัตถุประสงค์": string;
  หน่วยงานเป้าหมาย: string;
  วันที่ออกหน่วย: string;
  สถานะการออกหน่วย: string;
  "เป้าหมายผู้รับบริการ (คน)": number | "-";
  "ผู้รับบริการจริง (คน)": number | "-";
  "ต้นทุนพยากรณ์ (บาท)": number | "-";
  "ต้นทุนจริง (บาท)": number | "-";
  "รายได้พยากรณ์ (บาท)": number | "-";
  "รายได้จริง (บาท)": number | "-";
  "กำไรสุทธิจริง (บาท)": number | "-";
  "% Margin จริง": string;
  สถานะการเบิกจ่ายเงิน: string;
  "ยอดเงินรอเบิกจ่าย (บาท)": number;
  "ยอดเงินที่ได้รับแล้ว (บาท)": number;
  จำนวนวันค้างชำระ: number;
}

const TRIP_RECORDS: readonly TripRecord[] = [
  {
    รหัสการออกหน่วย: "PLH-69-001",
    "ชื่องาน / วัตถุประสงค์":
      "ออกหน่วยตรวจสุขภาพประจำปี ครูและบุคลากร โรงเรียนปะเหลียนวิทยา",
    หน่วยงานเป้าหมาย: "โรงเรียนปะเหลียนวิทยา",
    วันที่ออกหน่วย: "2026-01-15",
    สถานะการออกหน่วย: "เสร็จสิ้น",
    "เป้าหมายผู้รับบริการ (คน)": 150,
    "ผู้รับบริการจริง (คน)": 142,
    "ต้นทุนพยากรณ์ (บาท)": 33680,
    "ต้นทุนจริง (บาท)": 32860,
    "รายได้พยากรณ์ (บาท)": 128400,
    "รายได้จริง (บาท)": 122640,
    "กำไรสุทธิจริง (บาท)": 89780,
    "% Margin จริง": "73.21%",
    สถานะการเบิกจ่ายเงิน: "รับเงินครบถ้วน",
    "ยอดเงินรอเบิกจ่าย (บาท)": 0,
    "ยอดเงินที่ได้รับแล้ว (บาท)": 122640,
    จำนวนวันค้างชำระ: 0
  },
  {
    รหัสการออกหน่วย: "PLH-69-002",
    "ชื่องาน / วัตถุประสงค์":
      "ออกหน่วยตรวจสุขภาพประชาชนกลุ่มเสี่ยง NCD อบต.ท่าข้าม",
    หน่วยงานเป้าหมาย: "องค์การบริหารส่วนตำบลท่าข้าม",
    วันที่ออกหน่วย: "2026-02-10",
    สถานะการออกหน่วย: "เสร็จสิ้น",
    "เป้าหมายผู้รับบริการ (คน)": 220,
    "ผู้รับบริการจริง (คน)": 205,
    "ต้นทุนพยากรณ์ (บาท)": 38450,
    "ต้นทุนจริง (บาท)": 37550,
    "รายได้พยากรณ์ (บาท)": 81200,
    "รายได้จริง (บาท)": 75420,
    "กำไรสุทธิจริง (บาท)": 37870,
    "% Margin จริง": "50.21%",
    สถานะการเบิกจ่ายเงิน: "ล่าช้าเกิน 3 เดือน (เตือน)",
    "ยอดเงินรอเบิกจ่าย (บาท)": 75420,
    "ยอดเงินที่ได้รับแล้ว (บาท)": 0,
    จำนวนวันค้างชำระ: 161
  },
  {
    รหัสการออกหน่วย: "PLH-69-003",
    "ชื่องาน / วัตถุประสงค์":
      "ออกหน่วยตรวจสุขภาพพนักงาน บริษัท แปรรูปยางตรัง จำกัด",
    หน่วยงานเป้าหมาย: "บริษัท แปรรูปยางตรัง จำกัด",
    วันที่ออกหน่วย: "2026-04-05",
    สถานะการออกหน่วย: "เสร็จสิ้น",
    "เป้าหมายผู้รับบริการ (คน)": 160,
    "ผู้รับบริการจริง (คน)": 155,
    "ต้นทุนพยากรณ์ (บาท)": 31580,
    "ต้นทุนจริง (บาท)": 31180,
    "รายได้พยากรณ์ (บาท)": 78400,
    "รายได้จริง (บาท)": 75850,
    "กำไรสุทธิจริง (บาท)": 44670,
    "% Margin จริง": "58.89%",
    สถานะการเบิกจ่ายเงิน: "ล่าช้าเกิน 3 เดือน (เตือน)",
    "ยอดเงินรอเบิกจ่าย (บาท)": 75850,
    "ยอดเงินที่ได้รับแล้ว (บาท)": 0,
    จำนวนวันค้างชำระ: 107
  },
  {
    รหัสการออกหน่วย: "PLH-69-004",
    "ชื่องาน / วัตถุประสงค์":
      "ออกหน่วยตรวจสุขภาพข้าราชการและพนักงาน อบต.ปะเหลียน",
    หน่วยงานเป้าหมาย: "องค์การบริหารส่วนตำบลปะเหลียน",
    วันที่ออกหน่วย: "2026-06-18",
    สถานะการออกหน่วย: "เสร็จสิ้น",
    "เป้าหมายผู้รับบริการ (คน)": 110,
    "ผู้รับบริการจริง (คน)": 108,
    "ต้นทุนพยากรณ์ (บาท)": 29920,
    "ต้นทุนจริง (บาท)": 29720,
    "รายได้พยากรณ์ (บาท)": 98500,
    "รายได้จริง (บาท)": 96800,
    "กำไรสุทธิจริง (บาท)": 67080,
    "% Margin จริง": "69.3%",
    สถานะการเบิกจ่ายเงิน: "รอเบิกจ่าย",
    "ยอดเงินรอเบิกจ่าย (บาท)": 96800,
    "ยอดเงินที่ได้รับแล้ว (บาท)": 0,
    จำนวนวันค้างชำระ: 31
  },
  {
    รหัสการออกหน่วย: "PLH-69-005",
    "ชื่องาน / วัตถุประสงค์":
      "วางแผนออกหน่วยตรวจสุขภาพเคลื่อนที่ กลุ่มผู้สูงอายุและ อสม. ต.แหลมสอม",
    หน่วยงานเป้าหมาย: "รพ.สต.บ้านแหลมสอม / อบต.แหลมสอม",
    วันที่ออกหน่วย: "2026-08-15",
    สถานะการออกหน่วย: "อยู่ระหว่างวางแผน",
    "เป้าหมายผู้รับบริการ (คน)": 200,
    "ผู้รับบริการจริง (คน)": "-",
    "ต้นทุนพยากรณ์ (บาท)": 37050,
    "ต้นทุนจริง (บาท)": "-",
    "รายได้พยากรณ์ (บาท)": 76000,
    "รายได้จริง (บาท)": "-",
    "กำไรสุทธิจริง (บาท)": "-",
    "% Margin จริง": "-",
    สถานะการเบิกจ่ายเงิน: "รอเบิกจ่าย",
    "ยอดเงินรอเบิกจ่าย (บาท)": 76000,
    "ยอดเงินที่ได้รับแล้ว (บาท)": 0,
    จำนวนวันค้างชำระ: 0
  }
];

/** Column widths, one entry per column above, in the same order. */
const TRIP_EXPORT_COL_WIDTHS: readonly number[] = [
  14, 50, 32, 14, 18, 14, 14, 16, 16, 16, 16, 16, 12, 22, 18, 18, 16
];

// Same index groupings as UNITS_BY_PERIOD above (q1 = trip 0, q2 = trips
// 1–2, q3 = trip 3, q4 = trip 4) — kept as its own map since TRIP_RECORDS
// is a separate, richer dataset from UNITS_ALL.
const PERIOD_TO_TRIP_INDEXES: Readonly<Record<string, readonly number[]>> = {
  all: [0, 1, 2, 3, 4],
  q1: [0],
  q2: [1, 2],
  q3: [3],
  q4: [4]
};

const isExporting = ref(false);

function exportTripsToExcel(): void {
  // Only fiscal year 2026 has real trip-level records right now (the
  // other years in the select are placeholder scaling for the charts
  // only — see YEAR_SCALE above). Exporting a different year would mean
  // fabricating rows, so stop and tell the user instead.
  if (fiscalYear.value && fiscalYear.value !== REAL_DATA_YEAR) {
    Notify.create({
      type: "warning",
      message: `ยังไม่มีข้อมูลรายละเอียดการออกหน่วยสำหรับ${fiscalYearShortLabel.value}`,
      caption: `มีข้อมูลจริงเฉพาะปีงบประมาณ พ.ศ. ${Number(REAL_DATA_YEAR) + 543}`,
      position: "top"
    });
    return;
  }

  isExporting.value = true;
  try {
    const indexes =
      PERIOD_TO_TRIP_INDEXES[activePeriod.value] ?? PERIOD_TO_TRIP_INDEXES.all;
    // `TRIP_RECORDS[i]` is `TripRecord | undefined` to the type checker
    // since `i` is a runtime index, not a literal — even though every
    // index in PERIOD_TO_TRIP_INDEXES is known to be in range. The filter
    // both narrows the type and guards against that map ever drifting out
    // of sync with TRIP_RECORDS's length.
    const rows = indexes
      .map(i => TRIP_RECORDS[i])
      .filter((record): record is TripRecord => record !== undefined);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = TRIP_EXPORT_COL_WIDTHS.map(wch => ({ wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานการออกหน่วย");

    const yearLabel = fiscalYearShortLabel.value.replace(/\s|\./g, "");
    const periodLabel =
      periods.find(p => p.value === activePeriod.value)?.label ?? "ทั้งหมด";
    XLSX.writeFile(
      workbook,
      `รายงานการออกหน่วยตรวจสุขภาพ_${yearLabel}_${periodLabel}.xlsx`
    );
  } catch (error) {
    console.error("Failed to export trip report:", error);
    Notify.create({
      type: "negative",
      message: "ส่งออกไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    isExporting.value = false;
  }
}

/* =========================================================================
 * Formatting helpers
 * ========================================================================= */

function fmtBaht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString("en-US")}`;
}

function fmtNum(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

/* =========================================================================
 * Chart-geometry helpers (shared by the vertical and horizontal bar
 * charts so the axis-scaling and gridline math lives in one place)
 * ========================================================================= */

/** Rounds the axis ceiling up to the nearest `step`, with a sane floor
 *  so an all-zero dataset still renders a visible axis. */
function computeAxisMax(values: readonly number[], step: number): number {
  const highest = Math.max(...values, 1);
  return Math.ceil(highest / step) * step || step;
}

interface AxisTick {
  value: number;
  /** 0–1 position along the axis, independent of orientation. */
  ratio: number;
  label: string;
}

function buildAxisTicks(max: number, step: number): AxisTick[] {
  const ticks: AxisTick[] = [];
  for (let value = 0; value <= max; value += step) {
    ticks.push({
      value,
      ratio: value / max,
      label: value === 0 ? "0" : fmtNum(value)
    });
  }
  return ticks;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* ---------------- Trips for the selected period ---------------- */
const units = computed(() =>
  UNITS_BY_PERIOD[activePeriod.value].map(u => ({
    ...u,
    revenue: u.revenue * yearScale.value,
    cost: u.cost * yearScale.value
  }))
);

// True when there's at least one trip with non-zero revenue or cost for
// the selected period — drives the empty-state for the financial
// comparison bar chart.
const hasBarData = computed(() =>
  units.value.some(u => u.revenue > 0 || u.cost > 0)
);

/* =========================================================================
 * KPI cards (fully derived from activePeriod)
 * ========================================================================= */

interface Kpi {
  title: string;
  value: string;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  chip?: string;
  chipBg?: string;
  chipColor?: string;
  chipMuted?: string;
}

const kpis = computed<Kpi[]>(() => {
  const revenue = units.value.reduce((sum, u) => sum + u.revenue, 0);
  const cost = units.value.reduce((sum, u) => sum + u.cost, 0);
  const profit = revenue - cost;
  const margin = revenue ? (profit / revenue) * 100 : 0;

  const paidTotal = statusItems.value
    .filter(s => s.label === "ชำระเงินครบถ้วน")
    .reduce((sum, s) => sum + s.amount, 0);
  const fundPercent = revenue ? Math.round((paidTotal / revenue) * 100) : 0;

  const patients = Math.round(
    PATIENTS_BY_PERIOD[activePeriod.value] * yearScale.value
  );
  const planPercent = PLAN_PERCENT_BY_PERIOD[activePeriod.value];

  return [
    {
      title: "รายได้รวมที่คาดหวัง/ได้รับ",
      value: fmtBaht(revenue),
      sub: "รวมสิทธิ์ UC, SSS, CSMBS, LGO",
      icon: "paid",
      iconBg: "#fdf3dd",
      iconColor: "#c8940a"
    },
    {
      title: "ต้นทุนรวมการออกหน่วย",
      value: fmtBaht(cost),
      sub: "ค่ายา 39% • ค่าแรง 48%",
      icon: "trending_up",
      iconBg: "#e6f0fb",
      iconColor: COLORS.revenue
    },
    {
      title: "กำไรสุทธิ & PROFIT MARGIN",
      value: fmtBaht(profit),
      valueColor: COLORS.profit,
      sub: "ความคุ้มค่าของการจัดบริการสุขภาพเคลื่อนที่",
      icon: "percent",
      iconBg: "#e3f7ea",
      iconColor: COLORS.profit,
      chip: `${margin.toFixed(1)}% Margin`,
      chipBg: "#e3f7ea",
      chipColor: COLORS.profit
    },
    {
      title: "% ได้รับเงินเบิกจ่ายจากกองทุน",
      value: `${fundPercent}%`,
      sub: `ผู้รับบริการตรวจจริง ${fmtNum(patients)} คน (${planPercent}% ของแผน)`,
      icon: "schedule",
      iconBg: "#f1e9fb",
      iconColor: COLORS.purple,
      chipMuted: `(${fmtBaht(paidTotal)})`
    }
  ];
});

/* =========================================================================
 * Bar chart: financial comparison (revenue / cost / profit per trip)
 * ========================================================================= */

const BAR_CHART = {
  width: 680,
  height: 300,
  marginLeft: 52,
  marginRight: 16,
  marginTop: 16,
  marginBottom: 34,
  barWidth: 18,
  barGap: 5,
  axisStep: 20000
} as const;

const BAR_SERIES_LABELS = ["รายได้", "ต้นทุน", "กำไรสุทธิ"] as const;

const barPlotW = BAR_CHART.width - BAR_CHART.marginLeft - BAR_CHART.marginRight;
const barPlotH =
  BAR_CHART.height - BAR_CHART.marginTop - BAR_CHART.marginBottom;
const groupBarsW = BAR_CHART.barWidth * 3 + BAR_CHART.barGap * 2;

// Axis max adapts to whichever period is selected — a single trip or a
// two-trip quarter has a very different scale than the full-year total,
// so a fixed axis would make small periods look flat.
const yMax = computed(() =>
  computeAxisMax(
    units.value.flatMap(u => [u.revenue, u.cost]),
    BAR_CHART.axisStep
  )
);
const yStep = computed(() => yMax.value / 4);

const gridLines = computed(() =>
  buildAxisTicks(yMax.value, yStep.value).map(tick => ({
    value: tick.value,
    pos: BAR_CHART.marginTop + barPlotH - tick.ratio * barPlotH,
    label: tick.label
  }))
);

const bars = computed(() => {
  const groupW = barPlotW / units.value.length;
  const result: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    unitId: string;
    seriesLabel: string;
    rawValue: number;
  }[] = [];

  units.value.forEach((u, i) => {
    const groupX =
      BAR_CHART.marginLeft + i * groupW + (groupW - groupBarsW) / 2;
    const profit = u.revenue - u.cost;
    const series = [
      { value: u.revenue, color: COLORS.revenue, label: BAR_SERIES_LABELS[0] },
      { value: u.cost, color: COLORS.cost, label: BAR_SERIES_LABELS[1] },
      { value: profit, color: COLORS.profit, label: BAR_SERIES_LABELS[2] }
    ];
    series.forEach((s, si) => {
      const height = (s.value / yMax.value) * barPlotH;
      result.push({
        x: groupX + si * (BAR_CHART.barWidth + BAR_CHART.barGap),
        y: BAR_CHART.marginTop + barPlotH - height,
        width: BAR_CHART.barWidth,
        height,
        color: s.color,
        unitId: u.id,
        seriesLabel: s.label,
        rawValue: s.value
      });
    });
  });

  return result;
});

const unitLabels = computed(() => {
  const groupW = barPlotW / units.value.length;
  return units.value.map((u, i) => ({
    id: u.id,
    x: BAR_CHART.marginLeft + i * groupW + groupW / 2
  }));
});

const hoveredBarIndex = ref<number | null>(null);

function onBarHover(
  event: MouseEvent,
  bar: { unitId: string; seriesLabel: string; rawValue: number },
  idx: number
): void {
  hoveredBarIndex.value = idx;
  showTooltip(event, bar.unitId, [`${bar.seriesLabel}: ${fmtBaht(bar.rawValue)}`]);
}

function onBarLeave(): void {
  hoveredBarIndex.value = null;
  hideTooltip();
}

/* =========================================================================
 * Donut chart: cost breakdown
 * ========================================================================= */

const DONUT = {
  cx: 100,
  cy: 100,
  outerRadius: 88,
  innerRadius: 58
} as const;

function donutArcPath(startAngle: number, endAngle: number): string {
  const { cx, cy, outerRadius, innerRadius } = DONUT;

  // A slice that owns the full 360° collapses the normal path to zero
  // area, same issue as the status pie below — draw it as two half
  // annuli instead so SVG can actually render it.
  if (endAngle - startAngle >= 359.99) {
    const outerTop = polarToCartesian(cx, cy, outerRadius, 0);
    const outerBottom = polarToCartesian(cx, cy, outerRadius, 180);
    const innerBottom = polarToCartesian(cx, cy, innerRadius, 180);
    const innerTop = polarToCartesian(cx, cy, innerRadius, 0);
    return `M ${outerTop.x} ${outerTop.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${outerBottom.x} ${outerBottom.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${outerTop.x} ${outerTop.y}
      L ${innerTop.x} ${innerTop.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${innerBottom.x} ${innerBottom.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${innerTop.x} ${innerTop.y}
      Z`;
  }

  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${startOuter.x} ${startOuter.y}
    A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}
    L ${startInner.x} ${startInner.y}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}
    Z`;
}

const costBreakdown = computed(() =>
  COST_BREAKDOWN_BY_PERIOD[activePeriod.value].map(c => {
    const scaled = c.value * yearScale.value;
    return {
      ...c,
      value: scaled,
      amountLabel:
        scaled >= 1000
          ? `${(scaled / 1000).toFixed(1)}k`
          : String(Math.round(scaled))
    };
  })
);

// Guards the donut against an all-zero cost breakdown, which would
// otherwise divide-by-zero in donutSlices below (0/0 = NaN angles) and
// render broken/invisible paths instead of a clean empty state.
const hasDonutData = computed(() =>
  costBreakdown.value.some(c => c.value > 0)
);

const donutSlices = computed(() => {
  const items = costBreakdown.value;
  const total = items.reduce((sum, c) => sum + c.value, 0);
  if (!total) return [];
  let cursor = 0;

  return items.map(c => {
    const startAngle = (cursor / total) * 360;
    cursor += c.value;
    const endAngle = (cursor / total) * 360;
    const percent = total ? (c.value / total) * 100 : 0;

    return {
      ...c,
      path: donutArcPath(startAngle, endAngle),
      percent
    };
  });
});

const hoveredDonutLabel = ref<string | null>(null);

function onDonutHover(
  event: MouseEvent,
  slice: { label: string; amountLabel: string; percent: number }
): void {
  hoveredDonutLabel.value = slice.label;
  showTooltip(event, slice.label, [
    `฿${slice.amountLabel} (${slice.percent.toFixed(1)}%)`
  ]);
}

function onDonutLeave(): void {
  hoveredDonutLabel.value = null;
  hideTooltip();
}

/* =========================================================================
 * Pie chart: fund tracking status
 * ========================================================================= */

// Zero-count statuses are filtered out here (rather than in the API
// response) so the pie/footer only ever shows statuses that actually
// have trips in them for the selected period — same behavior the old
// mock map had implicitly by only listing non-empty statuses per period.
//
// `amount` is picked per-status via getStatusDisplayAmount rather than
// trusting the API's own displayAmount field (see that function's
// comment for the mapping). "ชำระเงินไม่ครบถ้วน" additionally carries
// overdueAmount so the UI can show both what's been received and what's
// still outstanding for that status.
const statusItems = computed<StatusItem[]>(() =>
  payStatusTotals.value
    .filter(s => s.totalCount > 0)
    .map(s => ({
      label: s.statusName,
      count: s.totalCount,
      amount: getStatusDisplayAmount(s),
      color: PAY_STATUS_COLOR[s.statusName] ?? COLORS.purple,
      ...(s.statusName === "ชำระเงินไม่ครบถ้วน"
        ? { overdueAmount: s.totalOverdueAmount }
        : {})
    }))
);

// Guards the status pie against an empty items list or an all-zero
// count, which would otherwise divide-by-zero in statusSlices below.
const hasStatusData = computed(() =>
  statusItems.value.length > 0 && statusItems.value.some(s => s.count > 0)
);

// Wide viewBox + moderate radius leaves enough horizontal room on both
// sides for the longest label ("ยังไม่ชำระเงิน: 2 รอบ") so it
// never runs off the SVG canvas.
const STATUS_PIE = {
  viewBoxW: 380,
  viewBoxH: 260,
  cx: 190,
  cy: 125,
  radius: 66
} as const;

// Splits a label at the opening parenthesis (if any) into two shorter
// lines, so each line is narrow enough to fit inside the canvas instead
// of overflowing past the edge. The current labels are short enough not
// to need this, but it's kept so a future longer label still wraps.
function splitLabel(label: string): string[] {
  const idx = label.indexOf("(");
  if (idx === -1) return [label];
  return [label.slice(0, idx).trim(), label.slice(idx).trim()];
}

const statusSlices = computed(() => {
  const { cx, cy, radius } = STATUS_PIE;
  const items = statusItems.value;
  const total = items.reduce((sum, s) => sum + s.count, 0);
  if (!total) return [];
  let cursor = 0;

  return items.map(s => {
    const startAngle = (cursor / total) * 360;
    cursor += s.count;
    const endAngle = (cursor / total) * 360;
    const midAngle = (startAngle + endAngle) / 2;

    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    // A slice that owns the full 360° (only one status this period) has
    // start === end, so the normal "move to center, line to start, arc
    // to end" path collapses to zero area and renders nothing. Draw it
    // as two half-circle arcs back to the same point instead, which SVG
    // can actually render as a full disc.
    const isFullCircle = Math.abs(endAngle - startAngle) >= 360;
    const path = isFullCircle
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
      : `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;

    const labelInner = polarToCartesian(cx, cy, radius + 6, midAngle);
    const labelOuter = polarToCartesian(cx, cy, radius + 26, midAngle);
    const isRight = Math.cos(((midAngle - 90) * Math.PI) / 180) >= 0;
    const labelTextX = labelOuter.x + (isRight ? 6 : -6);

    const lines = splitLabel(s.label);
    lines[lines.length - 1] = `${lines[lines.length - 1]}: ${s.count} รอบ`;

    return {
      ...s,
      path,
      labelLines: lines,
      labelLine: {
        x1: labelInner.x,
        y1: labelInner.y,
        x2: labelOuter.x,
        y2: labelOuter.y
      },
      labelPos: {
        x: labelTextX,
        y: labelOuter.y,
        anchor: isRight ? "start" : "end"
      }
    };
  });
});

const hoveredStatusLabel = ref<string | null>(null);

function onStatusHover(
  event: MouseEvent,
  slice: { label: string; count: number; amount: number; overdueAmount?: number }
): void {
  hoveredStatusLabel.value = slice.label;
  const lines = [`${slice.count} รอบ`, `฿${fmtNum(slice.amount)}`];
  if (slice.overdueAmount) {
    lines.push(`ค้างชำระ: ฿${fmtNum(slice.overdueAmount)}`);
  }
  showTooltip(event, slice.label, lines);
}

function onStatusLeave(): void {
  hoveredStatusLabel.value = null;
  hideTooltip();
}

/* =========================================================================
 * Horizontal bar chart: revenue mix
 * ========================================================================= */

const HBAR_CHART = {
  width: 460,
  height: 260,
  marginLeft: 168,
  marginRight: 20,
  marginTop: 10,
  marginBottom: 34,
  barThickness: 26,
  axisStep: 90
} as const;

const hbarPlotW =
  HBAR_CHART.width - HBAR_CHART.marginLeft - HBAR_CHART.marginRight;
const hbarPlotH =
  HBAR_CHART.height - HBAR_CHART.marginTop - HBAR_CHART.marginBottom;

// Axis max also adapts per period so a quarter's smaller totals still
// fill the chart width instead of rendering as tiny slivers.
const hbarMax = computed(() =>
  computeAxisMax(
    revenueMix.value.map(r => r.value),
    HBAR_CHART.axisStep
  )
);
const hbarStep = computed(() => hbarMax.value / 4);

const hbarGridLines = computed(() =>
  buildAxisTicks(hbarMax.value, hbarStep.value).map(tick => ({
    value: tick.value,
    pos: HBAR_CHART.marginLeft + tick.ratio * hbarPlotW,
    label: tick.label
  }))
);

// Minimum pixel width for a bar so a zero (or vanishingly small) value
// still renders as a visible stub instead of an invisible sliver.
const HBAR_MIN_WIDTH = 4;

const hbars = computed(() => {
  const items = revenueMix.value;
  const rowH = hbarPlotH / Math.max(items.length, 1);

  return items.map((r, i) => {
    const rowY = HBAR_CHART.marginTop + i * rowH;
    const barY = rowY + (rowH - HBAR_CHART.barThickness) / 2;
    const rawWidth = (r.value / hbarMax.value) * hbarPlotW;
    const width = Math.max(rawWidth, HBAR_MIN_WIDTH);
    return {
      label: r.label,
      value: r.value,
      color: r.color,
      y: barY,
      height: HBAR_CHART.barThickness,
      width,
      isEmpty: r.value <= 0
    };
  });
});

const hoveredHbarLabel = ref<string | null>(null);

function onHbarHover(
  event: MouseEvent,
  bar: { label: readonly string[]; value: number; isEmpty: boolean }
): void {
  const key = bar.label.join(" ");
  hoveredHbarLabel.value = key;
  showTooltip(
    event,
    key,
    [bar.value > 0 ? `฿${fmtNum(bar.value)}` : "ไม่มีข้อมูล"]
  );
}

function onHbarLeave(): void {
  hoveredHbarLabel.value = null;
  hideTooltip();
}
</script>

<style scoped>
.dash-page {
  background: #f5f7fa;
  padding: 20px 16px 40px;
  overflow-x: hidden;
}

.dash-container {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Toolbar ===== */
.toolbar-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.toolbar-left {
  min-width: 0;
}

.toolbar-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.toolbar-title {
  font-size: 1.02rem;
  font-weight: 700;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.fy-badge {
  background: #e6f0fb;
  color: #1e6fd9;
  font-weight: 600;
  font-size: 0.7rem;
  padding: 3px 10px;
}

.toolbar-sub {
  font-size: 0.78rem;
  color: #8a94a3;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.toolbar-right {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.year-select {
  flex: 1 1 150px;
  min-width: 100px;
}

.year-select :deep(.q-field__control) {
  min-height: 40px;
  border-radius: 8px;
}

.period-select {
  min-width: 140px;
  max-width: 100%;
}

.period-select :deep(.q-field__control) {
  min-height: 40px;
  border-radius: 8px;
}

.export-btn {
  border-radius: 8px;
  color: #4b5563;
  border-color: #dbe0e7;
  font-size: 0.72rem;
  font-weight: 500;
  min-height: 40px;
  padding: 0 16px;
  flex: 1 1 220px;
}

.export-btn :deep(.q-icon) {
  font-size: 15px;
}

/* ===== KPI cards ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.kpi-value {
  font-size: 1.55rem;
  font-weight: 800;
  color: #1a1f27;
  line-height: 1.1;
}

.kpi-chip {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 8px;
}

.kpi-chip-muted {
  font-size: 0.78rem;
  color: #8a94a3;
  font-weight: 500;
}

.kpi-sub {
  font-size: 0.74rem;
  color: #8a94a3;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

/* ===== Charts ===== */
.charts-grid {
  display: flex;
  flex-wrap: wrap;
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
  flex: 1.7 1 400px;
}

.donut-card,
.status-card {
  flex: 1 1 320px;
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
}

.chart-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1e6fd9;
  cursor: pointer;
  white-space: nowrap;
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

/* Horizontal-scroll wrapper keeps bar/label sizes legible on narrow
   screens instead of letting the viewBox compress everything. */
.bar-scroll,
.hbar-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bar-svg {
  display: block;
  width: 100%;
  min-width: 480px;
  height: auto;
  overflow: visible;
}

.bar-svg .grid line {
  stroke: #eef0f3;
  stroke-width: 1;
}

.bar-svg .grid text {
  fill: #9aa4b2;
  font-size: 10px;
}

.bar-svg .x-labels text {
  fill: #6b7280;
  font-size: 10px;
  font-weight: 600;
}

.chart-legend,
.donut-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
  font-size: 0.78rem;
  color: #4b5563;
}

.donut-legend {
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.donut-card,
.status-card {
  align-items: stretch;
}

.donut-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 18px;
}

.donut-svg {
  width: 176px;
  height: 176px;
  overflow: visible;
}

/* ===== Fund tracking pie chart ===== */
.status-pie-wrap {
  display: flex;
  justify-content: center;
  padding: 6px 0 8px;
}

.status-pie-svg {
  width: 100%;
  max-width: 380px;
  height: auto;
  /* SVG clips overflowing content to its own box by default (UA
     stylesheet sets overflow: hidden on the root <svg>). This override
     lets label text render even where it extends slightly past the
     nominal viewBox edge, so labels don't get cut off mid-word. */
  overflow: visible;
}

.status-pie-labels text {
  fill: #4b5563;
  font-size: 10.5px;
  font-weight: 600;
}

.status-pie-labels line {
  stroke: #c7ccd4;
  stroke-width: 1;
}

.status-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #eef0f3;
  font-size: 0.82rem;
  color: #4b5563;
}

.status-footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-footer-overdue {
  color: #8a94a3;
  font-size: 0.76rem;
}

/* ===== Revenue mix horizontal bar chart ===== */
.hbar-svg {
  display: block;
  width: 100%;
  min-width: 380px;
  height: auto;
  overflow: visible;
}

.hbar-grid line {
  stroke: #eef0f3;
  stroke-width: 1;
}

.hbar-grid text {
  fill: #9aa4b2;
  font-size: 10px;
}

.hbar-labels text {
  fill: #4b5563;
  font-size: 10.5px;
  font-weight: 600;
}

.hbar-loading,
.hbar-empty,
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  font-size: 0.82rem;
  color: #8a94a3;
}

/* ===== Interactivity: hover states + shared tooltip ===== */
.chart-rect,
.chart-path {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.chart-rect.is-dim,
.chart-path.is-dim {
  opacity: 0.35;
}

/* Zero-value stub bar: still visible as "a bar" but clearly muted so it
   reads as no-data rather than a real (tiny) value. */
.chart-rect.is-empty {
  opacity: 0.3;
}

.chart-rect.is-empty.is-dim {
  opacity: 0.15;
}

.legend-item-clickable,
.status-footer-item-clickable {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.legend-item-clickable.is-dim,
.status-footer-item-clickable.is-dim {
  opacity: 0.4;
}

.legend-item-clickable:hover,
.status-footer-item-clickable:hover {
  background: #f5f7fa;
}

.chart-tooltip {
  position: fixed;
  z-index: 9999;
  background: #1a1f27;
  color: #ffffff;
  font-size: 0.74rem;
  border-radius: 8px;
  padding: 8px 10px;
  pointer-events: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  max-width: 220px;
}

.chart-tooltip-title {
  font-weight: 700;
  margin-bottom: 3px;
}

.chart-tooltip-line {
  color: #d7dbe2;
  line-height: 1.4;
}

/* ===== Responsive ===== */
@media (max-width: 599px) {
  .dash-page {
    padding: 14px 10px 28px;
  }

  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .year-select,
  .period-select,
  .export-btn {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
  }

  .kpi-value {
    font-size: 1.35rem;
  }

  .chart-card {
    padding: 14px;
  }

  .donut-svg {
    width: 148px;
    height: 148px;
  }
}

@media (max-width: 360px) {
  .toolbar-title {
    font-size: 0.86rem;
  }
}
</style>