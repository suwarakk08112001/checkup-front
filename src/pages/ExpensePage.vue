<template>
  <q-page class="expense-page">
    <div class="expense-container">
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
          <div class="kpi-value" :style="{ color: k.valueColor }">
            {{ k.value }}
          </div>
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
          <div class="chart-subtitle">
            ยอดที่ได้รับแล้ว เทียบกับยอดค้างเบิกจ่าย
          </div>

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
            <q-icon
              name="warning_amber"
              size="18px"
              class="chart-header-icon"
            />
            <span>ยอดค้างชำระตามระยะเวลา</span>
          </div>
          <div class="chart-subtitle">
            จำนวนรอบและยอดเงินค้างจ่าย แยกตามความล่าช้า
          </div>

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

      <!-- ===== Overdue alert panels: 3-month warning + 6-month critical ===== -->
      <div class="alerts-grid">
        <div class="alert-card alert-card--warning">
          <div class="alert-header">
            <q-icon name="warning" size="18px" class="alert-header-icon" />
            <span class="alert-header-text">
              รายการเบิกจ่ายล่าช้าเกิน 3 เดือน (3 Months Overdue Warning)
            </span>
            <q-badge rounded class="alert-count alert-count--warning">
              {{ overdue3mList.length }} รายการ
            </q-badge>
          </div>

          <div v-if="overdue3mList.length" class="alert-list">
            <div
              v-for="c in overdue3mList"
              :key="c.id"
              class="alert-item alert-item--warning"
            >
              <div class="alert-item-main">
                <div class="alert-item-title">{{ c.title }}</div>
                <div class="alert-item-sub">
                  ส่งเคลมเมื่อ: {{ c.claimDate }} • ค้างชำระ:
                  {{ c.overdueDays }} วัน
                </div>
              </div>
              <div class="alert-item-side">
                <span class="alert-item-amount">{{
                  fmtBaht(c.claimAmount - c.receivedAmount)
                }}</span>
                <q-btn
                  dense
                  flat
                  no-caps
                  size="sm"
                  class="alert-item-action"
                  @click="saveClaimStatus(c)"
                >
                  บันทึกรับเงิน
                </q-btn>
              </div>
            </div>
          </div>
          <div v-else class="alert-empty">
            ไม่มีรายการเบิกจ่ายล่าช้าเกิน 3 เดือน
          </div>
        </div>

        <div class="alert-card alert-card--danger">
          <div class="alert-header">
            <q-icon name="warning" size="18px" class="alert-header-icon" />
            <span class="alert-header-text">
              รายการเบิกจ่ายล่าช้าเกิน 6 เดือน (6 Months Overdue Critical Alert)
            </span>
            <q-badge rounded class="alert-count alert-count--danger">
              {{ overdue6mList.length }} รายการ
            </q-badge>
          </div>

          <div v-if="overdue6mList.length" class="alert-list">
            <div
              v-for="c in overdue6mList"
              :key="c.id"
              class="alert-item alert-item--danger"
            >
              <div class="alert-item-main">
                <div class="alert-item-title">{{ c.title }}</div>
                <div class="alert-item-sub">
                  ส่งเคลมเมื่อ: {{ c.claimDate }} • ค้างชำระ:
                  {{ c.overdueDays }} วัน
                </div>
              </div>
              <div class="alert-item-side">
                <span class="alert-item-amount">{{
                  fmtBaht(c.claimAmount - c.receivedAmount)
                }}</span>
                <q-btn
                  dense
                  flat
                  no-caps
                  size="sm"
                  class="alert-item-action"
                  @click="saveClaimStatus(c)"
                >
                  บันทึกรับเงิน
                </q-btn>
              </div>
            </div>
          </div>
          <div v-else class="alert-empty">
            ไม่มีรายการเบิกจ่ายวิกฤตเกิน 6 เดือน
          </div>
        </div>
      </div>

      <!-- ===== Claims table ===== -->
      <div class="table-card">
        <div class="chart-header-row">
          <div class="chart-header">
            <q-icon name="fact_check" size="18px" class="chart-header-icon" />
            <span
              >ตารางติดตามสถานะการรับเงินและส่งเคลมเบิกจ่ายทุกรอบการออกหน่วย</span
            >
          </div>
          <div class="table-header-actions">
            <span class="table-count">{{ pagination.rowsNumber }} รายการ</span>
            <q-btn
              unelevated
              no-caps
              dense
              icon="add"
              label="เพิ่มตารางติดตาม"
              class="add-claim-btn"
              @click="openAddDialog"
            />
          </div>
        </div>

        <!-- Dedicated filter fields: งานออกหน่วย / สถานที่ / วันที่ออกหน่วย /
             สถานะเบิกจ่าย each filter independently (AND'd together, plus
             the รหัส quick-search box in the table's own toolbar below). -->
        <div class="filter-row">
          <div class="filter-field">
            <label class="status-label">งานออกหน่วย</label>
            <q-input
              v-model="titleQuery"
              dense
              outlined
              debounce="400"
              placeholder="ค้นหางานออกหน่วย"
              class="status-input"
            />
          </div>
          <div class="filter-field">
            <label class="status-label">สถานที่</label>
            <q-input
              v-model="orgQuery"
              dense
              outlined
              debounce="400"
              placeholder="ค้นหาสถานที่"
              class="status-input"
            />
          </div>
          <div class="filter-field">
            <label class="status-label">วันที่ออกหน่วย</label>
            <q-input
              v-model="deployDateQuery"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>
          <div class="filter-field">
            <label class="status-label">สถานะเบิกจ่าย</label>
            <q-select
              v-model="statusFilter"
              :options="statusFilterOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              dense
              outlined
              class="status-input"
            />
          </div>
        </div>

        <!-- No forced horizontal scroll: the table fits the card width and
               columns shrink/wrap as needed. Only mobile switches to
               Quasar's stacked "grid" row mode, where scrolling doesn't
               apply anyway. -->
        <div class="table-scroll">
          <q-table
            flat
            ref="tableRef"
            :rows="displayedClaims"
            :columns="tableColumns"
            row-key="id"
            v-model:pagination="pagination"
            :loading="tableLoading || isLoadingClaims"
            binary-state-sort
            @request="onTableRequest"
            :grid="isMobile"
            class="claims-table"
          >
            <!-- ลำดับ: running row number, independent of any column data. -->
            <template #body-cell-index="props">
              <q-td :props="props">
                <span class="row-index">{{ props.rowIndex + 1 }}</span>
              </q-td>
            </template>

            <!-- รหัส: human-readable claim code, styled to match the earlier
                 combined cell. -->
            <template #body-cell-code="props">
              <q-td :props="props">
                <span class="cell-code">{{ props.row.code }}</span>
              </q-td>
            </template>

            <!-- งานออกหน่วย: full deployment title. -->
            <template #body-cell-title="props">
              <q-td :props="props">
                <span class="cell-title">{{ props.row.title }}</span>
              </q-td>
            </template>

            <!-- สถานที่: target organization / location. -->
            <template #body-cell-orgName="props">
              <q-td :props="props">
                <span class="cell-org">{{ props.row.orgName }}</span>
              </q-td>
            </template>

            <!-- วันที่ส่งตั้งเบิก: rounds not yet submitted show an em dash. -->
            <template #body-cell-claimDate="props">
              <q-td :props="props">
                <span v-if="props.row.submitted">{{
                  props.row.claimDate
                }}</span>
                <span v-else class="overdue-none">-</span>
              </q-td>
            </template>

            <template #body-cell-claimAmount="props">
              <q-td :props="props">
                <span class="amount-claimed">{{
                  fmtBaht(props.row.claimAmount)
                }}</span>
              </q-td>
            </template>

            <template #body-cell-receivedAmount="props">
              <q-td :props="props">
                <span class="amount-received">{{
                  fmtBaht(props.row.receivedAmount)
                }}</span>
              </q-td>
            </template>

            <template #body-cell-pendingAmount="props">
              <q-td :props="props">
                <span class="amount-pending">
                  {{
                    fmtBaht(props.row.claimAmount - props.row.receivedAmount)
                  }}
                </span>
              </q-td>
            </template>

            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  rounded
                  class="status-badge"
                  :style="{
                    background: statusMeta(props.row.status).bg,
                    color: statusMeta(props.row.status).color
                  }"
                >
                  {{ props.row.status }}
                </q-badge>
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props">
                <div class="row-actions">
                  <q-btn
                    dense
                    flat
                    no-caps
                    size="sm"
                    icon="edit"
                    class="row-action-btn row-action-btn--edit"
                    @click="saveClaimStatus(props.row)"
                  />
                  <q-btn
                    dense
                    flat
                    no-caps
                    size="sm"
                    icon="delete"
                    class="row-action-btn row-action-btn--delete"
                    @click="askDeleteClaim(props.row)"
                  />
                </div>
              </q-td>
            </template>

            <!-- Mobile (grid) mode ignores body-cell-<name> slots and falls
                 back to plain field values, which is why the status badge
                 and the "บันทึกสถานะ" button (whose field has no real data
                 behind it) were rendering as plain/blank text with no
                 clickable action. The #item slot takes full control of the
                 card instead, so every field renders the same way it does
                 in the desktop table. -->
            <template #item="props">
              <div class="mobile-card">
                <div class="mobile-row">
                  <span class="mobile-label">ลำดับ</span>
                  <span class="row-index">{{ props.rowIndex + 1 }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">รหัส</span>
                  <span class="cell-code">{{ props.row.code }}</span>
                </div>
                <div class="mobile-row mobile-row--stack">
                  <span class="mobile-label">งานออกหน่วย</span>
                  <span class="cell-title">{{ props.row.title }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">สถานที่</span>
                  <span class="cell-org">{{ props.row.orgName }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">วันที่ออกหน่วย</span>
                  <span>{{ props.row.deployDate }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">วันที่ส่งตั้งเบิก</span>
                  <span v-if="props.row.submitted">{{
                    props.row.claimDate
                  }}</span>
                  <span v-else class="overdue-none">-</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ยอดเงินตั้งเบิก</span>
                  <span class="amount-claimed">{{
                    fmtBaht(props.row.claimAmount)
                  }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ได้รับเงินแล้ว</span>
                  <span class="amount-received">{{
                    fmtBaht(props.row.receivedAmount)
                  }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ยอดค้างชำระ</span>
                  <span class="amount-pending">
                    {{
                      fmtBaht(props.row.claimAmount - props.row.receivedAmount)
                    }}
                  </span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">สถานะเบิกจ่าย</span>
                  <q-badge
                    rounded
                    class="status-badge"
                    :style="{
                      background: statusMeta(props.row.status).bg,
                      color: statusMeta(props.row.status).color
                    }"
                  >
                    {{ props.row.status }}
                  </q-badge>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">การจัดการ</span>
                  <div class="row-actions">
                    <q-btn
                      dense
                      flat
                      no-caps
                      size="sm"
                      icon="edit"
                      label="แก้ไข"
                      class="row-action-btn row-action-btn--edit"
                      @click="saveClaimStatus(props.row)"
                    />
                    <q-btn
                      dense
                      flat
                      no-caps
                      size="sm"
                      icon="delete"
                      label="ลบ"
                      class="row-action-btn row-action-btn--delete"
                      @click="askDeleteClaim(props.row)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- ===== บันทึกสถานะ dialog: claim/received payment editor ===== -->
    <q-dialog v-model="statusDialog.show" persistent>
      <q-card class="status-dialog">
        <q-btn
          flat
          dense
          round
          icon="close"
          class="status-dialog-close"
          @click="closeStatusDialog"
        />

        <q-card-section class="status-dialog-header">
          บันทึกการเบิกจ่ายและการรับเงินโอน ({{ statusDialog.id }})
        </q-card-section>

        <q-card-section class="status-dialog-body">
          <div class="status-field">
            <label class="status-label"
              >วันที่ส่งเรื่องเบิกจ่าย (Claim Date)</label
            >
            <q-input
              v-model="statusDialog.claimDate"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >จำนวนเงินที่ส่งเคลมตั้งเบิก (บาท)</label
            >
            <q-input
              v-model.number="statusDialog.claimAmount"
              type="number"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">จำนวนเงินที่ได้รับจริงแล้ว (บาท)</label>
            <q-input
              v-model.number="statusDialog.receivedAmount"
              type="number"
              dense
              outlined
              class="status-input status-input--received"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >วันที่ได้รับเงินโอนเข้าบัญชีโรงพยาบาล</label
            >
            <q-input
              v-model="statusDialog.receivedDate"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">สถานะเบิกจ่าย</label>
            <!-- Options now come from GET /status/all (see fetchStatus()).
                 option-value points at `name` because statusDialog.status
                 is typed as ClaimStatus (the display string), matching what
                 the rest of the component (statusMeta, PATCH payload) uses. -->
            <q-select
              v-model="statusDialog.status"
              :options="statusSelectOptions"
              option-label="name"
              option-value="name"
              emit-value
              map-options
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >บันทึกเพิ่มเติม / สาเหตุความล่าช้า</label
            >
            <q-input
              v-model="statusDialog.note"
              type="textarea"
              rows="5"
              autogrow
              dense
              outlined
              class="status-input status-input--note"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="status-dialog-actions">
          <q-btn
            flat
            no-caps
            label="ยกเลิก"
            class="status-btn status-btn--cancel"
            @click="closeStatusDialog"
          />
          <q-btn
            unelevated
            no-caps
            label="บันทึกข้อมูล"
            class="status-btn status-btn--save"
            :loading="savingRowId === statusDialog.id"
            @click="submitStatusDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== เพิ่มตารางติดตาม dialog: create a brand-new claim record ===== -->
    <q-dialog v-model="addDialog.show" persistent>
      <q-card class="status-dialog">
        <q-btn
          flat
          dense
          round
          icon="close"
          class="status-dialog-close"
          @click="closeAddDialog"
        />

        <q-card-section class="status-dialog-header">
          เพิ่มรายการติดตามการเบิกจ่ายใหม่
        </q-card-section>

        <q-card-section class="status-dialog-body">
          <div class="status-field">
            <label class="status-label">งานออกหน่วย</label>
            <q-input
              v-model="addDialog.title"
              dense
              outlined
              placeholder="เช่น ออกหน่วยตรวจสุขภาพประจำปี..."
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">สถานที่ / หน่วยงานเป้าหมาย</label>
            <q-input
              v-model="addDialog.orgName"
              dense
              outlined
              placeholder="เช่น โรงเรียน... / อบต. ..."
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">สิทธิ์การรักษา</label>
            <!-- Options come from GET /benefit/all (see fetchBenefit()).
                 addDialog.benefitId holds the numeric benefit id (not the
                 display name) — option-value points at `id`, emit-value +
                 map-options so the model holds that id directly, which is
                 what submitAddDialog() sends to the backend as
                 `benefitid`. -->
            <q-select
              v-model="addDialog.benefitId"
              :options="benefitSelectOptions"
              option-label="name"
              option-value="id"
              emit-value
              map-options
              dense
              outlined
              placeholder="เช่น UC (สปสช.) / ประกันสังคม"
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">วันที่ออกหน่วย</label>
            <q-input
              v-model="addDialog.deployDate"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >วันที่ส่งเรื่องเบิกจ่าย (Claim Date)</label
            >
            <q-input
              v-model="addDialog.claimDate"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >จำนวนเงินที่ส่งเคลมตั้งเบิก (บาท)</label
            >
            <q-input
              v-model.number="addDialog.claimAmount"
              type="number"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">จำนวนเงินที่ได้รับจริงแล้ว (บาท)</label>
            <q-input
              v-model.number="addDialog.receivedAmount"
              type="number"
              dense
              outlined
              class="status-input status-input--received"
            />
          </div>

          <div class="status-field">
            <label class="status-label"
              >วันที่ได้รับเงินโอนเข้าบัญชีโรงพยาบาล</label
            >
            <q-input
              v-model="addDialog.receivedDate"
              type="date"
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">สถานะเบิกจ่าย</label>
            <q-select
              v-model="addDialog.status"
              :options="statusSelectOptions"
              option-label="name"
              option-value="name"
              emit-value
              map-options
              dense
              outlined
              class="status-input"
            />
          </div>

          <div class="status-field">
            <label class="status-label">บันทึกเพิ่มเติม</label>
            <q-input
              v-model="addDialog.note"
              type="textarea"
              rows="4"
              autogrow
              dense
              outlined
              class="status-input status-input--note"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="status-dialog-actions">
          <q-btn
            flat
            no-caps
            label="ยกเลิก"
            class="status-btn status-btn--cancel"
            @click="closeAddDialog"
          />
          <q-btn
            unelevated
            no-caps
            label="เพิ่มรายการ"
            class="status-btn status-btn--save"
            :loading="isAddingClaim"
            @click="submitAddDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== ลบรายการ confirmation dialog ===== -->
    <q-dialog v-model="deleteDialog.show" persistent>
      <q-card class="delete-dialog">
        <q-card-section class="delete-dialog-header">
          <q-icon
            name="delete_forever"
            size="22px"
            class="delete-dialog-icon"
          />
          ยืนยันการลบข้อมูล
        </q-card-section>
        <q-card-section class="delete-dialog-body">
          ต้องการลบรายการ <strong>{{ deleteDialog.id }}</strong> ({{
            deleteDialog.orgName
          }}) ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
        </q-card-section>
        <q-card-actions align="right" class="status-dialog-actions">
          <q-btn
            flat
            no-caps
            label="ยกเลิก"
            class="status-btn status-btn--cancel"
            @click="cancelDeleteClaim"
          />
          <q-btn
            unelevated
            no-caps
            label="ลบรายการ"
            class="status-btn status-btn--delete"
            :loading="deletingRowId === deleteDialog.id"
            @click="confirmDeleteClaim"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  onUnmounted,
  useTemplateRef
} from "vue";
import { Notify } from "quasar";
import * as XLSX from "xlsx";
import { api } from "@/boot/axios";

const COLORS = {
  revenue: "#1e6fd9",
  profit: "#17a865",
  warning: "#f5a524",
  danger: "#e5484d"
} as const;

const MOBILE_BREAKPOINT = 599;
const viewportWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : 1280
);

function handleResize(): void {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener("resize", handleResize));
onUnmounted(() => window.removeEventListener("resize", handleResize));

const isMobile = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT);

interface Option {
  value: string;
  label: string;
}

const fiscalYears: readonly Option[] = [
  { value: "2024", label: "พ.ศ. 2567" },
  { value: "2025", label: "พ.ศ. 2568" },
  { value: "2026", label: "พ.ศ. 2569" }
];
const fiscalYear = ref<string>("2026");

const statusFilter = ref<string>("all");

type ClaimStatus =
  | "รับเงินครบถ้วน"
  | "รอเบิกจ่ายปกติ"
  | "ล่าช้า >3 เดือน"
  | "ล่าช้า >6 เดือน";

// FIX: единая (camelCase) конвенция именования полей на всём фронтенде.
// The record's unique key is `id` (matches the "รหัส" / round-id column and
// every `.id` reference used across the table, dialogs, and row actions
// below). All fields below use camelCase consistently so they match what
// the <template> block above actually reads (props.row.orgName,
// props.row.claimAmount, props.row.submitted, etc.) — the previous version
// declared these in lowercase (claimamount, receiveamount, deploydate...)
// which silently rendered as `undefined` everywhere in the UI.
interface ClaimRecord {
  id: number;
  code: string;
  title: string;
  orgName: string;
  fundSource: string;
  deployDate: string;
  claimDate: string;
  claimAmount: number;
  receivedAmount: number;
  overdueAmount: number;
  receivedDate: string;
  status: ClaimStatus;
  submitted: boolean;
  overdueDays: number;
  note: string;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Maps one row coming back from GET /expenses into a ClaimRecord. Written
// defensively since the exact API response shape isn't pinned down here —
// adjust the `raw.xxx` keys to match your backend's actual field names.
// NOTE: `raw.status` is optional-chained throughout (it previously crashed
// with "Cannot read properties of undefined" whenever a row came back
// without a populated status relation).
function mapApiRecordToClaim(raw: Record<string, any>): ClaimRecord {
  const claimDate = formatDate(raw.claimdate);
  const submitted = Boolean(claimDate);

  const receivedAmount = Number(raw.receiveamount ?? 0);
  const claimAmount = Number(raw.claimamount ?? 0);

  let overdueDays = 0;
  if (submitted && receivedAmount < claimAmount && raw.claimdate) {
    // ใช้ raw.claimdate (ISO ต้นฉบับ) ในการคำนวณ ไม่ใช่ค่าที่ format แล้ว
    const diffMs = Date.now() - new Date(raw.claimdate).getTime();
    overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const statusName = (raw.status?.name ?? "รอเบิกจ่ายปกติ") as ClaimStatus;
  const overdueAmount = Number(
    raw.overdueamount ?? Math.max(0, claimAmount - receivedAmount)
  );

  return {
    id: Number(raw.id),
    code: raw.code ?? "",
    title: raw.title ?? "",
    orgName: raw.orgname ?? "",
    fundSource: raw.fundsource ?? "",
    deployDate: formatDate(raw.deploydate),
    claimDate,
    claimAmount,
    receivedAmount,
    overdueAmount,
    receivedDate: formatDate(raw.receivedate),
    status: statusName,
    submitted,
    overdueDays,
    note: raw.note ?? ""
  };
}

// Single source of truth for the claims currently loaded from the API.
const CLAIM_RECORDS = ref<ClaimRecord[]>([]);
const isLoadingClaims = ref(false);

const search = ref("");
const titleQuery = ref("");
const orgQuery = ref("");
const deployDateQuery = ref("");

// Fetches claims for the selected fiscal year + filters from the API and
// replaces CLAIM_RECORDS with the result. Sorting/paging over that data
// still happens client-side in onTableRequest below.
async function fetchExpense(): Promise<void> {
  isLoadingClaims.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      title: titleQuery.value.trim() || undefined,
      orgname: orgQuery.value.trim() || undefined,
      deploydate: deployDateQuery.value.trim() || undefined,
      statusId: statusId.value ?? undefined,
    };

    // DEBUG: confirm what's actually being sent, and what comes back, so
    // we can tell whether the backend is filtering on these params at all
    // (or using different param names). Remove once /expenses filtering
    // is confirmed working.
    console.log("[fetchExpense] request params:", params);

    const response = await api.get("/expenses", { params });

    console.log("[fetchExpense] raw response.data:", response.data);

    // FIX: fully-optional chain — `expenses` may itself be missing, not
    // just `expenses.data`. The old `response.data?.expenses.data` threw
    // whenever `expenses` was undefined.
    const rows: unknown[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.expenses?.data ?? []);

    console.log("[fetchExpense] rows extracted (count):", rows.length, rows);

    CLAIM_RECORDS.value = rows.map(row =>
      mapApiRecordToClaim(row as Record<string, any>)
    );
  } catch (error) {
    console.error("Failed to fetch expense claims:", error);
    CLAIM_RECORDS.value = [];
    Notify.create({
      type: "negative",
      message: "โหลดข้อมูลการเบิกจ่ายจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    isLoadingClaims.value = false;
    pagination.value.page = 1;
    tableRef.value?.requestServerInteraction();
  }
}

interface StatusOption {
  id: number;
  name: ClaimStatus;
}

// Status list loaded from GET /status/all, used to populate the
// "สถานะเบิกจ่าย" dropdowns in both the "บันทึกสถานะ" and "เพิ่มตารางติดตาม"
// dialogs. Kept separate from CLAIM_RECORDS — this endpoint returns status
// definitions, not claim rows, so it must not be run through
// mapApiRecordToClaim() (that was the bug: the previous version tried to
// map status rows as if they were claims, and also referenced an
// undeclared `rows` variable, which threw a ReferenceError on every call).
const statusOptions = ref<StatusOption[]>([]);

async function fetchStatus(): Promise<void> {
  try {
    const response = await api.get("/status/all");

    // Same defensive shape-handling as fetchExpense(): accept a bare
    // array, or `{ data: [...] }`, or `{ status: { data: [...] } }`.
    const rows: unknown[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.status?.data ?? []);

    statusOptions.value = rows.map((row: any) => ({
      id: Number(row.id),
      name: (row.name ?? row.status ?? row.label ?? "") as ClaimStatus
    }));
  } catch (error) {
    console.error("Failed to fetch status list:", error);
    Notify.create({
      type: "negative",
      message: "โหลดรายการสถานะเบิกจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  }
}

// What the dropdowns actually render: live data from the API when
// available, falling back to the static STATUS_OPTIONS list (defined
// further below) while /status/all is loading or if it fails — so the
// selects are never left empty.
const statusSelectOptions = computed<StatusOption[]>(() =>
  statusOptions.value.length
    ? statusOptions.value
    : STATUS_OPTIONS.map((name, i) => ({ id: i, name }))
);

// Options for the "สถานะเบิกจ่าย" filter dropdown in the table's filter row.
// Built from the same live statusSelectOptions used by the two dialogs,
// with an extra "ทุกสถานะ" (all) option prepended. The filter value is the
// status name itself (or "all"), so filteredClaims below can compare
// directly against c.status with no separate lookup map.
const statusFilterOptions = computed<Option[]>(() => [
  { value: "all", label: "ทุกสถานะ" },
  ...statusSelectOptions.value.map(s => ({ value: s.name, label: s.name }))
]);

// FIX: this is the piece that was missing. `statusFilter` holds the
// *status name* ("all" or a ClaimStatus string) because that's what the
// filter <q-select> and the client-side filteredClaims comparison need.
// But fetchExpense() sends a `statusId` query param to the backend, and no
// such variable existed anywhere in the file — every call to fetchExpense()
// was throwing "ReferenceError: statusId is not defined" before it could
// even reach the API.
//
// This computed bridges the two: it looks up the numeric id that matches
// the selected status name against the *real* list loaded from
// GET /status/all (statusOptions, not the STATUS_OPTIONS fallback — using
// the fallback's fake index-based ids here could send the wrong id to the
// backend and silently filter the wrong rows). Returns undefined when
// "all" is selected, or while /status/all hasn't loaded yet / failed.
const statusId = computed<number | undefined>(() => {
  if (statusFilter.value === "all") return undefined;
  return statusOptions.value.find(s => s.name === statusFilter.value)?.id;
});

interface BenefitOption {
  id: number;
  name: string;
}

// Static fallback list, used only until GET /benefit/all resolves (or if
// it fails) — mirrors the field names returned by the API
// (benefitname), see fetchBenefit() below.
const BENEFIT_OPTIONS: readonly string[] = [
  "ข้าราชการ",
  "อปท.",
  "ประกันสังคม",
  "ชำระเงินเอง"
];

// Benefit/coverage-type list loaded from GET /benefit/all, used to
// populate the "สิทธิ์การรักษา" dropdown in the "เพิ่มตารางติดตาม" dialog.
// Response rows use `benefitname` (not `name`), unlike /status/all.
const benefitOptions = ref<BenefitOption[]>([]);

async function fetchBenefit(): Promise<void> {
  try {
    const response = await api.get("/benefit/all");

    // Same defensive shape-handling as fetchExpense()/fetchStatus(): accept
    // a bare array, or `{ data: [...] }`, or `{ benefit: { data: [...] } }`.
    const rows: unknown[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.benefit?.data ?? []);

    benefitOptions.value = rows.map((row: any) => ({
      id: Number(row.id),
      name: (row.benefitname ?? row.name ?? "") as string
    }));
  } catch (error) {
    console.error("Failed to fetch benefit list:", error);
    Notify.create({
      type: "negative",
      message: "โหลดรายการสิทธิ์การรักษาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  }
}

// What the "สิทธิ์การรักษา" dropdown actually renders: live data from the
// API when available, falling back to BENEFIT_OPTIONS while /benefit/all
// is loading or if it fails — so the select is never left empty.
const benefitSelectOptions = computed<BenefitOption[]>(() =>
  benefitOptions.value.length
    ? benefitOptions.value
    : BENEFIT_OPTIONS.map((name, i) => ({ id: i, name }))
);

const periodClaims = computed<ClaimRecord[]>(() => CLAIM_RECORDS.value);

// Client-side date input (YYYY-MM-DD) -> the DD/MM/YYYY format used by
// formatDate()/deployDate, so it can be compared directly.
function toDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

// Filters periodClaims by status + the three filter-row fields
// (งานออกหน่วย / สถานที่ / วันที่ออกหน่วย). titleQuery/orgQuery/deployDateQuery
// and statusFilter (via statusId) are also sent to the API as params in
// fetchExpense() — this client-side pass is a backstop so the table
// narrows correctly even if the backend ignores those params or uses
// different param names, instead of silently showing every row regardless
// of what's typed/selected in the filters.
const filteredClaims = computed<ClaimRecord[]>(() => {
  const wanted = statusFilter.value;
  const titleQ = titleQuery.value.trim().toLowerCase();
  const orgQ = orgQuery.value.trim().toLowerCase();
  const deployQ = deployDateQuery.value.trim();
  const deployDisplay = deployQ ? toDisplayDate(deployQ) : "";

  return periodClaims.value.filter(c => {
    if (wanted !== "all" && c.status !== wanted) return false;
    if (titleQ && !c.title.toLowerCase().includes(titleQ)) return false;
    if (orgQ && !c.orgName.toLowerCase().includes(orgQ)) return false;
    if (deployDisplay && c.deployDate !== deployDisplay) return false;
    return true;
  });
});

// c.id is a number, so it needs String() before .toLowerCase().
const searchedClaims = computed<ClaimRecord[]>(() => {
  const q = search.value.trim().toLowerCase();
  return filteredClaims.value.filter(c => {
    if (!q) return true;
    return (
      String(c.id).toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.orgName.toLowerCase().includes(q)
    );
  });
});

function isOverdue(row: ClaimRecord): boolean {
  return row.status === "ล่าช้า >3 เดือน" || row.status === "ล่าช้า >6 เดือน";
}

const overdueCount = computed(
  () => CLAIM_RECORDS.value.filter(isOverdue).length
);

const tableRef = useTemplateRef<{ requestServerInteraction: () => void }>(
  "tableRef"
);
const tableLoading = ref(false);
const displayedClaims = ref<ClaimRecord[]>([]);
const pagination = ref({
  sortBy: null as string | null,
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

function getSortValue(row: ClaimRecord, sortBy: string): string | number {
  switch (sortBy) {
    case "claimAmount":
      return row.claimAmount;
    case "receivedAmount":
      return row.receivedAmount;
    case "pendingAmount":
      return row.overdueAmount;
    case "deployDate":
      return row.deployDate;
    case "claimDate":
      return row.claimDate;
    case "status":
      return row.status;
    case "code":
      return row.code;
    case "title":
      return row.title;
    case "orgName":
      return row.orgName;
    default:
      return "";
  }
}

function onTableRequest(props: {
  pagination: {
    page: number;
    rowsPerPage: number;
    sortBy: string | null;
    descending: boolean;
  };
}): void {
  const { page, rowsPerPage, sortBy, descending } = props.pagination;

  tableLoading.value = true;

  setTimeout(() => {
    let data = [...searchedClaims.value];

    if (sortBy) {
      data.sort((a, b) => {
        const va = getSortValue(a, sortBy);
        const vb = getSortValue(b, sortBy);
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "th");
        return descending ? -cmp : cmp;
      });
    }

    pagination.value.rowsNumber = data.length;

    const fetchCount = rowsPerPage === 0 ? data.length : rowsPerPage;
    const startRow = (page - 1) * fetchCount;
    displayedClaims.value = data.slice(startRow, startRow + fetchCount);

    pagination.value.page = page;
    pagination.value.rowsPerPage = rowsPerPage;
    pagination.value.sortBy = sortBy;
    pagination.value.descending = descending;

    tableLoading.value = false;
  }, 200);
}

// Local (client-side) refinements — id/title/org quick search + status
// filter — just re-slice/re-sort what's already loaded, no need to hit the
// API again.
watch([searchedClaims], () => {
  pagination.value.page = 1;
  tableRef.value?.requestServerInteraction();
});

// These filters are sent to the API (see fetchExpense), so changing them
// triggers a real refetch. titleQuery/orgQuery/deployDateQuery already
// carry Quasar's own debounce (300–400ms) via the input's `debounce` prop,
// so the values here only change after the user pauses typing.
//
// FIX: statusFilter is now included too — it drives the `statusId` param
// sent to fetchExpense(), so changing the "สถานะเบิกจ่าย" dropdown needs to
// trigger a real refetch just like the other filters, not just a
// client-side re-slice.
watch([fiscalYear, titleQuery, orgQuery, deployDateQuery, statusFilter], () => {
  fetchExpense();
});

onMounted(() => {
  fetchExpense();
  fetchStatus();
  fetchBenefit();
});

function fmtBaht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString("en-US")}`;
}

const totalClaimed = computed(() =>
  periodClaims.value
    .filter(c => c.submitted)
    .reduce((sum, c) => sum + c.claimAmount, 0)
);

const totalReceived = computed(() =>
  periodClaims.value.reduce((sum, c) => sum + c.receivedAmount, 0)
);

const totalPending = computed(() =>
  periodClaims.value.reduce(
    (sum, c) => sum + (c.claimAmount - c.receivedAmount),
    0
  )
);

const receivedPercent = computed(() =>
  totalClaimed.value
    ? Math.round((totalReceived.value / totalClaimed.value) * 100)
    : 0
);

const overdue3mCount = computed(
  () => periodClaims.value.filter(c => c.status === "ล่าช้า >3 เดือน").length
);
const overdue6mCount = computed(
  () => periodClaims.value.filter(c => c.status === "ล่าช้า >6 เดือน").length
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

interface Bucket {
  label: string;
  color: string;
  amount: number;
  count: number;
  percent: number;
}

const BUCKET_ORDER: readonly ClaimStatus[] = [
  "รับเงินครบถ้วน",
  "รอเบิกจ่ายปกติ",
  "ล่าช้า >3 เดือน",
  "ล่าช้า >6 เดือน"
];

const BUCKET_COLOR: Readonly<Record<ClaimStatus, string>> = {
  รับเงินครบถ้วน: COLORS.profit,
  รอเบิกจ่ายปกติ: COLORS.revenue,
  "ล่าช้า >3 เดือน": COLORS.warning,
  "ล่าช้า >6 เดือน": COLORS.danger
};

const overdueBuckets = computed<Bucket[]>(() => {
  const totals = new Map<ClaimStatus, { amount: number; count: number }>();

  periodClaims.value.forEach(c => {
    const pendingAmount = c.claimAmount - c.receivedAmount;
    const bucketAmount =
      c.status === "รับเงินครบถ้วน" ? c.receivedAmount : pendingAmount;
    const existing = totals.get(c.status) ?? { amount: 0, count: 0 };
    totals.set(c.status, {
      amount: existing.amount + bucketAmount,
      count: existing.count + 1
    });
  });

  const maxAmount = Math.max(...Array.from(totals.values(), t => t.amount), 1);

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

const overdue3mList = computed<ClaimRecord[]>(() =>
  periodClaims.value.filter(c => c.status === "ล่าช้า >3 เดือน")
);

const overdue6mList = computed<ClaimRecord[]>(() =>
  periodClaims.value.filter(c => c.status === "ล่าช้า >6 เดือน")
);

const STATUS_BADGE_COLOR: Readonly<
  Record<ClaimStatus, { bg: string; color: string }>
> = {
  รับเงินครบถ้วน: { bg: "#e3f7ea", color: COLORS.profit },
  "ล่าช้า >6 เดือน": { bg: "#fce8e8", color: COLORS.danger },
  "ล่าช้า >3 เดือน": { bg: "#fdf3dd", color: COLORS.warning },
  รอเบิกจ่ายปกติ: { bg: "#e6f0fb", color: COLORS.revenue }
};

function statusMeta(status: ClaimStatus): { bg: string; color: string } {
  return STATUS_BADGE_COLOR[status];
}

// FIX: "รหัส" column now points at `code` (the human-readable claim code
// returned by the API) instead of the internal `id`. Amount columns' field
// functions read the camelCase properties that actually exist on
// ClaimRecord, and the pending-amount column is named "pendingAmount" so
// it matches the `#body-cell-pendingAmount` slot already defined in the
// template.
const tableColumns = [
  {
    name: "index",
    label: "ลำดับ",
    field: () => "",
    align: "center" as const,
    style: "width: 3%",
    headerStyle: "width: 3%"
  },
  {
    name: "code",
    label: "รหัส",
    field: "code",
    align: "left" as const,
    style: "width: 7%",
    headerStyle: "width: 7%",
    sortable: true
  },
  {
    name: "title",
    label: "งานออกหน่วย",
    field: "title",
    align: "left" as const,
    style: "width: 19%",
    headerStyle: "width: 19%",
    sortable: true
  },
  {
    name: "orgName",
    label: "สถานที่",
    field: "orgName",
    align: "left" as const,
    style: "width: 13%",
    headerStyle: "width: 13%",
    sortable: true
  },
  {
    name: "deployDate",
    label: "วันที่ออกหน่วย",
    field: "deployDate",
    align: "left" as const,
    style: "width: 8%",
    headerStyle: "width: 8%",
    sortable: true
  },
  {
    name: "claimDate",
    label: "วันที่ส่งตั้งเบิก",
    field: "claimDate",
    align: "left" as const,
    style: "width: 8%",
    headerStyle: "width: 8%",
    sortable: true
  },
  {
    name: "claimAmount",
    label: "ยอดเงินตั้งเบิก",
    field: (row: ClaimRecord) => fmtBaht(row.claimAmount),
    align: "right" as const,
    style: "width: 9%",
    headerStyle: "width: 9%",
    sortable: true
  },
  {
    name: "receivedAmount",
    label: "ได้รับเงินแล้ว",
    field: (row: ClaimRecord) => fmtBaht(row.receivedAmount),
    align: "right" as const,
    style: "width: 9%",
    headerStyle: "width: 9%",
    sortable: true
  },
  {
    name: "pendingAmount",
    label: "ยอดค้างชำระ",
    field: (row: ClaimRecord) => fmtBaht(row.overdueAmount),
    align: "right" as const,
    style: "width: 9%",
    headerStyle: "width: 9%",
    sortable: true
  },
  {
    name: "status",
    label: "สถานะเบิกจ่าย",
    field: "status",
    align: "center" as const,
    style: "width: 8%",
    headerStyle: "width: 8%",
    sortable: true
  },
  {
    name: "actions",
    label: "การจัดการ",
    field: "actions",
    align: "center" as const,
    style: "width: 7%",
    headerStyle: "width: 7%"
  }
];

// id is a string here (matches ClaimRecord.id via String(row.id)),
// consistently, in both saveClaimStatus() and askDeleteClaim() below.
const savingRowId = ref<string | null>(null);

interface StatusDialogState {
  show: boolean;
  id: string;
  title: string;
  orgName: string;
  deployDate: string;
  claimDate: string;
  claimAmount: number;
  receivedAmount: number;
  receivedDate: string;
  status: ClaimStatus;
  note: string;
}

// Static fallback list, used only until GET /status/all resolves (or if it
// fails) — see statusSelectOptions above.
const STATUS_OPTIONS: readonly ClaimStatus[] = [
  "รอเบิกจ่ายปกติ",
  "รับเงินครบถ้วน",
  "ล่าช้า >3 เดือน",
  "ล่าช้า >6 เดือน"
];

const statusDialog = reactive<StatusDialogState>({
  show: false,
  id: "",
  title: "",
  orgName: "",
  deployDate: "",
  claimDate: "",
  claimAmount: 0,
  receivedAmount: 0,
  receivedDate: "",
  status: "รอเบิกจ่ายปกติ",
  note: ""
});

function saveClaimStatus(row: ClaimRecord): void {
  statusDialog.id = String(row.id);
  statusDialog.title = row.title;
  statusDialog.orgName = row.orgName;
  statusDialog.deployDate = row.deployDate;
  statusDialog.claimDate = row.claimDate;
  statusDialog.claimAmount = row.claimAmount;
  statusDialog.receivedAmount = row.receivedAmount;
  statusDialog.receivedDate = row.receivedDate;
  statusDialog.status = row.status;
  statusDialog.note = row.note;
  statusDialog.show = true;
}

function closeStatusDialog(): void {
  statusDialog.show = false;
}

async function submitStatusDialog(): Promise<void> {
  savingRowId.value = statusDialog.id;
  try {
    // Persist to the backend. Payload keys are lowercase to match what
    // mapApiRecordToClaim() reads back (raw.orgname, raw.deploydate,
    // raw.claimamount, raw.receiveamount, raw.receivedate — note NOT
    // "receivedamount"/"receiveddate", which were the previous typos).
    await api.patch(`/expenses/${statusDialog.id}`, {
      title: statusDialog.title,
      orgname: statusDialog.orgName,
      deploydate: statusDialog.deployDate,
      claimdate: statusDialog.claimDate,
      claimamount: statusDialog.claimAmount,
      receiveamount: statusDialog.receivedAmount,
      receivedate: statusDialog.receivedDate,
      status: statusDialog.status,
      note: statusDialog.note
    });

    statusDialog.show = false;
    Notify.create({
      type: "positive",
      message: `บันทึกสถานะรอบ ${statusDialog.id} (${statusDialog.orgName}) สำเร็จ`,
      position: "top"
    });

    await fetchExpense();
  } catch (error) {
    console.error("Failed to save claim status:", error);
    Notify.create({
      type: "negative",
      message: "บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    savingRowId.value = null;
  }
}

const isAddingClaim = ref(false);

interface AddDialogState {
  show: boolean;
  title: string;
  orgName: string;
  benefitId: number | null;
  deployDate: string;
  claimDate: string;
  claimAmount: number;
  receivedAmount: number;
  receivedDate: string;
  status: ClaimStatus;
  note: string;
}

const addDialog = reactive<AddDialogState>({
  show: false,
  title: "",
  orgName: "",
  benefitId: null,
  deployDate: "",
  claimDate: "",
  claimAmount: 0,
  receivedAmount: 0,
  receivedDate: "",
  status: "รอเบิกจ่ายปกติ",
  note: ""
});

function openAddDialog(): void {
  addDialog.title = "";
  addDialog.orgName = "";
  addDialog.benefitId = null;
  addDialog.deployDate = "";
  addDialog.claimDate = "";
  addDialog.claimAmount = 0;
  addDialog.receivedAmount = 0;
  addDialog.receivedDate = "";
  addDialog.status = "รอเบิกจ่ายปกติ";
  addDialog.note = "";
  addDialog.show = true;
}

function closeAddDialog(): void {
  addDialog.show = false;
}

async function submitAddDialog(): Promise<void> {
  if (!addDialog.title.trim() || !addDialog.orgName.trim()) {
    Notify.create({
      type: "warning",
      message: "กรุณากรอกชื่องานออกหน่วยและสถานที่ให้ครบถ้วนก่อนบันทึก",
      position: "top"
    });
    return;
  }

  isAddingClaim.value = true;
  try {
    // Same lowercase payload-key fix as submitStatusDialog() above.
    // benefitid is the numeric id selected from the "สิทธิ์การรักษา"
    // dropdown (see benefitSelectOptions / addDialog.benefitId above), not
    // the display name.
    await api.post("/expenses", {
      title: addDialog.title,
      orgname: addDialog.orgName,
      benefitId: addDialog.benefitId,
      deploydate: addDialog.deployDate,
      claimdate: addDialog.claimDate,
      claimamount: addDialog.claimAmount,
      receiveamount: addDialog.receivedAmount,
      receivedate: addDialog.receivedDate,
      status: addDialog.status,
     
    });

    addDialog.show = false;
    Notify.create({
      type: "positive",
      message: `เพิ่มรายการ (${addDialog.orgName}) สำเร็จ`,
      position: "top"
    });

    await fetchExpense();
  } catch (error) {
    console.error("Failed to add claim:", error);
    Notify.create({
      type: "negative",
      message: "เพิ่มรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    isAddingClaim.value = false;
  }
}

interface DeleteDialogState {
  show: boolean;
  id: string;
  orgName: string;
}

const deleteDialog = reactive<DeleteDialogState>({
  show: false,
  id: "",
  orgName: ""
});

const deletingRowId = ref<string | null>(null);

function askDeleteClaim(row: ClaimRecord): void {
  deleteDialog.id = String(row.id);
  deleteDialog.orgName = row.orgName;
  deleteDialog.show = true;
}

function cancelDeleteClaim(): void {
  deleteDialog.show = false;
}

async function confirmDeleteClaim(): Promise<void> {
  const targetId = deleteDialog.id;
  const targetOrg = deleteDialog.orgName;

  deletingRowId.value = targetId;
  try {
    await api.delete(`/expenses/${targetId}`);

    deleteDialog.show = false;
    Notify.create({
      type: "positive",
      message: `ลบรายการ ${targetId} (${targetOrg}) สำเร็จ`,
      position: "top"
    });

    await fetchExpense();
  } catch (error) {
    console.error("Failed to delete claim:", error);
    Notify.create({
      type: "negative",
      message: "ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    deletingRowId.value = null;
  }
}

const isSendingAlert = ref(false);

async function sendLineAlert(): Promise<void> {
  isSendingAlert.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    Notify.create({
      type: "positive",
      message: `ส่งแจ้งเตือนสรุปยอดค้างชำระ ${overdueCount.value} รอบ ไปยังกลุ่มงานเทคนิคการแพทย์สำเร็จ`,
      position: "top"
    });
  } catch (error) {
    console.error("Failed to send LINE alert:", error);
    Notify.create({
      type: "negative",
      message: "ส่งแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      position: "top"
    });
  } finally {
    isSendingAlert.value = false;
  }
}

const isExporting = ref(false);

interface ClaimExportRow {
  รหัสรอบ: number;
  งานออกหน่วย: string;
  หน่วยงานเป้าหมาย: string;
  กองทุน: string;
  วันที่ออกหน่วย: string;
  วันส่งตั้งเบิก: string;
  "ยอดเงินตั้งเบิก (บาท)": number;
  "ได้รับเงินแล้ว (บาท)": number;
  "ยอดค้างชำระ (บาท)": number;
  จำนวนวันค้างชำระ: number;
  สถานะเบิกจ่าย: string;
}

const CLAIM_EXPORT_COL_WIDTHS: readonly number[] = [
  14, 40, 32, 18, 14, 14, 18, 18, 18, 16, 18
];

function exportClaimsToExcel(): void {
  if (!searchedClaims.value.length) {
    Notify.create({
      type: "warning",
      message: "ไม่มีข้อมูลการเบิกจ่ายสำหรับส่งออกในเงื่อนไขนี้",
      position: "top"
    });
    return;
  }

  isExporting.value = true;
  try {
    const rows: ClaimExportRow[] = searchedClaims.value.map(c => ({
      รหัสรอบ: c.id,
      งานออกหน่วย: c.title,
      หน่วยงานเป้าหมาย: c.orgName,
      กองทุน: c.fundSource,
      วันที่ออกหน่วย: c.deployDate,
      วันส่งตั้งเบิก: c.submitted ? c.claimDate : "-",
      "ยอดเงินตั้งเบิก (บาท)": c.claimAmount,
      "ได้รับเงินแล้ว (บาท)": c.receivedAmount,
      "ยอดค้างชำระ (บาท)": c.claimAmount - c.receivedAmount,
      จำนวนวันค้างชำระ: c.overdueDays,
      สถานะเบิกจ่าย: c.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = CLAIM_EXPORT_COL_WIDTHS.map(wch => ({ wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ติดตามการเบิกจ่าย");

    const yearLabel =
      fiscalYears.find(y => y.value === fiscalYear.value)?.label ??
      fiscalYear.value;
    XLSX.writeFile(
      workbook,
      `รายงานการเบิกจ่าย_${yearLabel.replace(/\s|\./g, "")}.xlsx`
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

.alerts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}

.alert-card {
  border-radius: 12px;
  border: 1px solid;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.alert-card--warning {
  background: #fffdf5;
  border-color: #f6e2a8;
}

.alert-card--danger {
  background: #fff8f8;
  border-color: #f5c6c6;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-card--warning .alert-header-icon {
  color: #f5a524;
}

.alert-card--danger .alert-header-icon {
  color: #e5484d;
}

.alert-header-text {
  flex: 1;
  min-width: 0;
  font-size: 0.86rem;
  font-weight: 700;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.alert-count {
  flex: none;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
}

.alert-count--warning {
  background: #fdf3dd;
  color: #b8790f;
}

.alert-count--danger {
  background: #fce8e8;
  color: #c23a3e;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  background: #ffffff;
  border: 1px solid #eef0f3;
  border-left: 3px solid;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.alert-item--warning {
  border-left-color: #f5a524;
}

.alert-item--danger {
  border-left-color: #e5484d;
}

.alert-item-main {
  min-width: 0;
  flex: 1;
}

.alert-item-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a1f27;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.alert-item-sub {
  font-size: 0.72rem;
  color: #8a94a3;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.alert-item-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.alert-item-amount {
  font-size: 0.86rem;
  font-weight: 700;
  color: #1e6fd9;
  white-space: nowrap;
}

.alert-item-action {
  color: #17a865;
  font-size: 0.72rem;
  font-weight: 700;
  min-height: 0;
  padding: 0;
}

.alert-empty {
  font-size: 0.8rem;
  color: #8a94a3;
  text-align: center;
  padding: 18px 8px;
}

.table-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 18px;
}

.table-header-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-count {
  font-size: 0.78rem;
  color: #8a94a3;
}

.add-claim-btn {
  background: #1e6fd9;
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 6px 14px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.table-scroll {
  margin-top: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.claims-table {
  width: 100%;
  min-width: 1000px;
}

.claims-table.q-table--grid {
  min-width: 0;
}

.claims-table :deep(table) {
  table-layout: fixed;
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
  white-space: normal;
  vertical-align: top;
  padding-top: 12px;
  padding-bottom: 12px;
}

.row-index {
  color: #8a94a3;
  font-weight: 600;
}

.cell-code {
  color: #1a1f27;
  font-weight: 700;
}

.cell-title {
  font-weight: 700;
  color: #1a1f27;
  line-height: 1.3;
}

.cell-org {
  color: #4b5563;
}

.amount-claimed {
  color: #1e6fd9;
  font-weight: 700;
}

.amount-received {
  color: #17a865;
  font-weight: 700;
}

.amount-pending {
  color: #f5a524;
  font-weight: 700;
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

.row-status-btn {
  color: #1e6fd9;
  font-size: 0.72rem;
  font-weight: 600;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.row-action-btn {
  font-size: 0.72rem;
  font-weight: 600;
}

.row-action-btn--edit {
  color: #1e6fd9;
}

.row-action-btn--delete {
  color: #e5484d;
}

.mobile-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.82rem;
  color: #1a1f27;
}

.mobile-row--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.mobile-label {
  flex: none;
  font-size: 0.72rem;
  font-weight: 600;
  color: #8a94a3;
}

.status-dialog {
  width: 440px;
  max-width: 92vw;
  border-radius: 16px !important;
  position: relative;
  padding: 4px 4px 8px;
}

.status-dialog-close {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #8a94a3;
  z-index: 1;
}

.status-dialog-header {
  font-size: 1.02rem;
  font-weight: 700;
  color: #1a1f27;
  padding: 22px 44px 4px 22px;
}

.status-dialog-body {
  padding: 6px 22px 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 70vh;
  overflow-y: auto;
}

.status-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #4b5563;
}

.status-input :deep(.q-field__control) {
  background: #f5f7fa;
  border-radius: 8px;
}

.status-input.status-input--received :deep(input) {
  color: #17a865;
  font-weight: 700;
}

.status-input.status-input--note :deep(textarea) {
  min-height: 120px;
}

.status-dialog-actions {
  padding: 14px 22px 18px;
  gap: 8px;
  flex-wrap: wrap;
}

.status-btn {
  border-radius: 8px;
  font-weight: 600;
  padding: 8px 20px;
}

.status-btn--cancel {
  color: #6b7280;
  background: #f1f3f6;
}

.status-btn--save {
  background: #17a865;
  color: #ffffff;
}

.status-btn--delete {
  background: #e5484d;
  color: #ffffff;
}

.delete-dialog {
  width: 380px;
  max-width: 92vw;
  border-radius: 16px !important;
  padding: 4px 4px 8px;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: #1a1f27;
  padding: 22px 22px 4px;
}

.delete-dialog-icon {
  color: #e5484d;
}

.delete-dialog-body {
  padding: 6px 22px 4px;
  font-size: 0.88rem;
  color: #4b5563;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .alerts-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    grid-template-columns: 1fr 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .chart-header-row {
    align-items: flex-start;
  }

  .table-header-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 599px) {
  .expense-page {
    padding: 14px 10px 28px;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .add-claim-btn {
    flex: 1;
    justify-content: center;
  }

  .table-search {
    min-width: 0;
    width: 100%;
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

  .alert-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-item-side {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .status-dialog,
  .delete-dialog {
    max-height: 88vh;
  }

  .status-dialog-header {
    padding: 20px 40px 4px 16px;
    font-size: 0.96rem;
  }

  .status-dialog-body {
    padding: 6px 16px 4px;
    max-height: 62vh;
  }

  .status-dialog-actions,
  .delete-dialog-header,
  .delete-dialog-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .status-btn {
    flex: 1;
    min-width: 0;
    justify-content: center;
  }

  .row-action-btn {
    min-height: 36px;
    min-width: 36px;
  }

  .alert-item-action {
    min-height: 32px;
    padding: 0 4px;
  }
}
</style>