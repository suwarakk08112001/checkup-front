<template>
  <q-page class="expense-page">
    <div class="expense-container">
      <!-- ===== KPI CARDS ===== -->
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

      <!-- ===== CHARTS: FUND STATUS DONUT + OVERDUE BUCKETS ===== -->
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
                <div class="bucket-bar-fill" :style="{ width: `${b.percent}%`, background: b.color }" />
              </div>
              <div class="bucket-value">
                {{ fmtBaht(b.amount) }}
                <span class="bucket-count">({{ b.count }} รอบ)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== OVERDUE ALERT PANELS: LATE + UNPAID ===== -->
      <div class="alerts-grid">
        <div class="alert-card alert-card--warning">
          <div class="alert-header">
            <q-icon name="warning" size="18px" class="alert-header-icon" />
            <span class="alert-header-text">รายการเบิกจ่ายล่าช้าไม่เกิน 3 เดือน (Late Claims)</span>
            <q-badge rounded class="alert-count alert-count--warning">{{ lateList.length }} รายการ</q-badge>
          </div>

          <div v-if="lateList.length" class="alert-list">
            <div v-for="c in lateList" :key="c.id" class="alert-item alert-item--warning">
              <div class="alert-item-main">
                <div class="alert-item-title">{{ c.title }}</div>
                <div class="alert-item-sub">ส่งเคลมเมื่อ: {{ c.claimDate }} • ค้างชำระ: {{ c.overdueDays }} วัน</div>
              </div>
              <div class="alert-item-side">
                <span class="alert-item-amount">{{ fmtBaht(c.claimAmount - c.receivedAmount) }}</span>
                <q-btn dense flat no-caps size="sm" class="alert-item-action" @click="saveClaimStatus(c)">
                  บันทึกรับเงิน
                </q-btn>
              </div>
            </div>
          </div>
          <div v-else class="alert-empty">ไม่มีรายการเบิกจ่ายล่าช้า</div>
        </div>

        <div class="alert-card alert-card--danger">
          <div class="alert-header">
            <q-icon name="warning" size="18px" class="alert-header-icon" />
            <span class="alert-header-text">รายการที่ยังไม่ชำระเงิน (Unpaid Claims)</span>
            <q-badge rounded class="alert-count alert-count--danger">{{ unpaidList.length }} รายการ</q-badge>
          </div>

          <div v-if="unpaidList.length" class="alert-list">
            <div v-for="c in unpaidList" :key="c.id" class="alert-item alert-item--danger">
              <div class="alert-item-main">
                <div class="alert-item-title">{{ c.title }}</div>
                <div class="alert-item-sub">ส่งเคลมเมื่อ: {{ c.claimDate }} • ค้างชำระ: {{ c.overdueDays }} วัน</div>
              </div>
              <div class="alert-item-side">
                <span class="alert-item-amount">{{ fmtBaht(c.claimAmount - c.receivedAmount) }}</span>
                <q-btn dense flat no-caps size="sm" class="alert-item-action" @click="saveClaimStatus(c)">
                  บันทึกรับเงิน
                </q-btn>
              </div>
            </div>
          </div>
          <div v-else class="alert-empty">ไม่มีรายการที่ยังไม่ชำระเงิน</div>
        </div>
      </div>

      <!-- ===== CLAIMS TABLE ===== -->
      <div class="table-card">
        <div class="chart-header-row">
          <div class="chart-header">
            <q-icon name="fact_check" size="18px" class="chart-header-icon" />
            <span>ตารางติดตามสถานะการรับเงินและส่งเคลมเบิกจ่ายทุกรอบการออกหน่วย</span>
          </div>
          <div class="table-header-actions">
            <span class="table-count">{{ periodClaims.length }} รายการ</span>
            <q-btn
              unelevated
              no-caps
              dense
              icon="download"
              label="ส่งออก Excel"
              class="export-claim-btn"
              :loading="isExporting"
              @click="exportClaimsToExcel"
            />
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

        <!-- Each field filters independently (AND'd together) and is sent
             to the API so the server does the actual filtering; the table
             below simply renders whatever comes back. -->
        <div class="filter-row">
          <div class="filter-field">
            <label class="status-label">งานออกหน่วย</label>
            <q-input v-model="titleQuery" dense outlined debounce="400" placeholder="ค้นหางานออกหน่วย" class="status-input" />
          </div>
          <div class="filter-field">
            <label class="status-label">สถานที่</label>
            <q-input v-model="orgQuery" dense outlined debounce="400" placeholder="ค้นหาสถานที่" class="status-input" />
          </div>
          <div class="filter-field">
            <label class="status-label">วันที่ออกหน่วย</label>
            <q-input v-model="deployDateQuery" type="date" dense outlined class="status-input" />
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

        <div class="table-scroll">
          <q-table
            flat
            :rows="periodClaims"
            :columns="tableColumns"
            row-key="id"
            v-model:pagination="pagination"
            :loading="isLoadingClaims"
            :rows-per-page-options="[10, 20, 50]"
            binary-state-sort
            :grid="isMobile"
            class="claims-table"
          >
            <template v-slot:loading>
              <q-inner-loading showing color="primary" />
            </template>

            <template #body-cell-index="props">
              <q-td :props="props">
                <span class="row-index">{{ rowNumber(props.rowIndex) }}</span>
              </q-td>
            </template>

            <template #body-cell-code="props">
              <q-td :props="props"><span class="cell-code">{{ props.row.code }}</span></q-td>
            </template>

            <template #body-cell-title="props">
              <q-td :props="props"><span class="cell-title">{{ props.row.title }}</span></q-td>
            </template>

            <template #body-cell-orgName="props">
              <q-td :props="props"><span class="cell-org">{{ props.row.orgName }}</span></q-td>
            </template>

            <template #body-cell-claimDate="props">
              <q-td :props="props">
                <span v-if="props.row.submitted">{{ props.row.claimDate }}</span>
                <span v-else class="overdue-none">-</span>
              </q-td>
            </template>

            <template #body-cell-claimAmount="props">
              <q-td :props="props"><span class="amount-claimed">{{ fmtBaht(props.row.claimAmount) }}</span></q-td>
            </template>

            <template #body-cell-receivedAmount="props">
              <q-td :props="props"><span class="amount-received">{{ fmtBaht(props.row.receivedAmount) }}</span></q-td>
            </template>

            <template #body-cell-pendingAmount="props">
              <q-td :props="props">
                <span class="amount-pending">{{ fmtBaht(props.row.claimAmount - props.row.receivedAmount) }}</span>
              </q-td>
            </template>

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

            <template #body-cell-actions="props">
              <q-td :props="props">
                <div class="row-actions">
                  <q-btn dense flat no-caps size="sm" icon="edit" class="row-action-btn row-action-btn--edit" @click="saveClaimStatus(props.row)">
                    <q-tooltip>บันทึกสถานะ</q-tooltip>
                  </q-btn>
                  <q-btn dense flat no-caps size="sm" icon="delete" class="row-action-btn row-action-btn--delete" @click="askDeleteClaim(props.row)">
                    <q-tooltip>ลบรายการ</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>

            <!-- Mobile (grid) mode ignores body-cell-<name> slots, so the
                 #item slot takes full control of the card to render every
                 field the same way the desktop table does. -->
            <template #item="props">
              <div class="mobile-card">
                <div class="mobile-row">
                  <span class="mobile-label">ลำดับ</span>
                  <span class="row-index">{{ rowNumber(props.rowIndex) }}</span>
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
                  <span v-if="props.row.submitted">{{ props.row.claimDate }}</span>
                  <span v-else class="overdue-none">-</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ยอดเงินตั้งเบิก</span>
                  <span class="amount-claimed">{{ fmtBaht(props.row.claimAmount) }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ได้รับเงินแล้ว</span>
                  <span class="amount-received">{{ fmtBaht(props.row.receivedAmount) }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">ยอดค้างชำระ</span>
                  <span class="amount-pending">{{ fmtBaht(props.row.claimAmount - props.row.receivedAmount) }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">สถานะเบิกจ่าย</span>
                  <q-badge
                    rounded
                    class="status-badge"
                    :style="{ background: statusMeta(props.row.status).bg, color: statusMeta(props.row.status).color }"
                  >
                    {{ props.row.status }}
                  </q-badge>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">การจัดการ</span>
                  <div class="row-actions">
                    <q-btn dense flat no-caps size="sm" icon="edit" label="แก้ไข" class="row-action-btn row-action-btn--edit" @click="saveClaimStatus(props.row)" />
                    <q-btn dense flat no-caps size="sm" icon="delete" label="ลบ" class="row-action-btn row-action-btn--delete" @click="askDeleteClaim(props.row)" />
                  </div>
                </div>
              </div>
            </template>

            <template v-slot:no-data>
              <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">ไม่พบข้อมูล</div>
                <div class="empty-sub">ลองปรับตัวกรอง หรือเพิ่มรายการใหม่</div>
              </div>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- ===== STATUS DIALOG: RECORD CLAIM / RECEIVED PAYMENT ===== -->
    <q-dialog v-model="statusDialog.show" persistent :maximized="$q.screen.xs">
      <div class="custom-dialog" :class="{ 'custom-dialog--mobile': $q.screen.xs }">
        <div v-if="$q.screen.xs" class="dialog-drag-handle" />
        <div class="dialog-header dialog-header--primary">
          <div class="dialog-header-icon dialog-header-icon--primary">
            <q-icon name="edit" color="white" size="18px" />
          </div>
          <span>บันทึกการเบิกจ่ายและการรับเงินโอน ({{ statusDialog.id }})</span>
          <q-space />
          <button class="dialog-close-btn" type="button" @click="closeStatusDialog">
            <q-icon name="close" size="18px" />
          </button>
        </div>

        <q-form @submit="submitStatusDialog">
          <div class="dialog-body">
            <div class="status-field">
              <label class="status-label">งานออกหน่วย</label>
              <q-input
                v-model="statusDialog.title"
                dense
                outlined
                class="status-input"
                :rules="[(val) => !!val?.trim() || 'กรุณากรอกข้อมูล']"
              />
            </div>
            <div class="status-field">
              <label class="status-label">สถานที่ / หน่วยงานเป้าหมาย</label>
              <q-input
                v-model="statusDialog.orgName"
                dense
                outlined
                class="status-input"
                :rules="[(val) => !!val?.trim() || 'กรุณากรอกข้อมูล']"
              />
            </div>
            <div class="status-field">
              <label class="status-label">สิทธิ์การรักษา</label>
              <q-select
                v-model="statusDialog.benefitId"
                :options="benefitSelectOptions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                dense
                outlined
                placeholder="เช่น UC (สปสช.) / ประกันสังคม"
                class="status-input"
                :rules="[(val) => val !== null || 'กรุณาเลือกสิทธิ์การรักษา']"
              />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ออกหน่วย</label>
              <q-input v-model="statusDialog.deployDate" type="date" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ส่งเรื่องเบิกจ่าย (Claim Date)</label>
              <q-input v-model="statusDialog.claimDate" type="date" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">จำนวนเงินที่ส่งเคลมตั้งเบิก (บาท)</label>
              <q-input v-model.number="statusDialog.claimAmount" type="number" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">จำนวนเงินที่ได้รับจริงแล้ว (บาท)</label>
              <q-input v-model.number="statusDialog.receivedAmount" type="number" dense outlined class="status-input status-input--received" />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ได้รับเงินโอนเข้าบัญชีโรงพยาบาล</label>
              <q-input v-model="statusDialog.receivedDate" type="date" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">สถานะเบิกจ่าย</label>
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
              <label class="status-label">บันทึกเพิ่มเติม / สาเหตุความล่าช้า</label>
              <q-input v-model="statusDialog.note" type="textarea" rows="5" autogrow dense outlined class="status-input status-input--note" />
            </div>
          </div>

          <div class="dialog-footer" :class="{ 'dialog-footer--mobile': $q.screen.xs }">
            <button type="button" class="dlg-btn dlg-btn--cancel" @click="closeStatusDialog">ยกเลิก</button>
            <button type="submit" class="dlg-btn dlg-btn--confirm" :disabled="savingRowId === statusDialog.id">
              <q-circular-progress v-if="savingRowId === statusDialog.id" indeterminate size="16px" color="white" class="q-mr-xs" />
              บันทึกข้อมูล
            </button>
          </div>
        </q-form>
      </div>
    </q-dialog>

    <!-- ===== ADD DIALOG: NEW CLAIM RECORD ===== -->
    <q-dialog v-model="addDialog.show" persistent :maximized="$q.screen.xs">
      <div class="custom-dialog" :class="{ 'custom-dialog--mobile': $q.screen.xs }">
        <div v-if="$q.screen.xs" class="dialog-drag-handle" />
        <div class="dialog-header dialog-header--primary">
          <div class="dialog-header-icon dialog-header-icon--primary">
            <q-icon name="add_circle" color="white" size="18px" />
          </div>
          <span>เพิ่มรายการติดตามการเบิกจ่ายใหม่</span>
          <q-space />
          <button class="dialog-close-btn" type="button" @click="closeAddDialog">
            <q-icon name="close" size="18px" />
          </button>
        </div>

        <q-form @submit="submitAddDialog">
          <div class="dialog-body">
            <div class="status-field">
              <label class="status-label">งานออกหน่วย</label>
              <q-input
                v-model="addDialog.title"
                dense
                outlined
                autofocus
                placeholder="เช่น ออกหน่วยตรวจสุขภาพประจำปี..."
                class="status-input"
                :rules="[(val) => !!val?.trim() || 'กรุณากรอกข้อมูล']"
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
                :rules="[(val) => !!val?.trim() || 'กรุณากรอกข้อมูล']"
              />
            </div>
            <div class="status-field">
              <label class="status-label">สิทธิ์การรักษา</label>
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
                :rules="[(val) => val !== null || 'กรุณาเลือกสิทธิ์การรักษา']"
              />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ออกหน่วย</label>
              <q-input v-model="addDialog.deployDate" type="date" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ส่งเรื่องเบิกจ่าย (Claim Date)</label>
              <q-input v-model="addDialog.claimDate" type="date" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">จำนวนเงินที่ส่งเคลมตั้งเบิก (บาท)</label>
              <q-input v-model.number="addDialog.claimAmount" type="number" dense outlined class="status-input" />
            </div>
            <div class="status-field">
              <label class="status-label">จำนวนเงินที่ได้รับจริงแล้ว (บาท)</label>
              <q-input v-model.number="addDialog.receivedAmount" type="number" dense outlined class="status-input status-input--received" />
            </div>
            <div class="status-field">
              <label class="status-label">วันที่ได้รับเงินโอนเข้าบัญชีโรงพยาบาล</label>
              <q-input v-model="addDialog.receivedDate" type="date" dense outlined class="status-input" />
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
              <q-input v-model="addDialog.note" type="textarea" rows="4" autogrow dense outlined class="status-input status-input--note" />
            </div>
          </div>

          <div class="dialog-footer" :class="{ 'dialog-footer--mobile': $q.screen.xs }">
            <button type="button" class="dlg-btn dlg-btn--cancel" @click="closeAddDialog">ยกเลิก</button>
            <button type="submit" class="dlg-btn dlg-btn--confirm" :disabled="isAddingClaim">
              <q-circular-progress v-if="isAddingClaim" indeterminate size="16px" color="white" class="q-mr-xs" />
              เพิ่มรายการ
            </button>
          </div>
        </q-form>
      </div>
    </q-dialog>

    <!-- ===== DELETE DIALOG ===== -->
    <q-dialog v-model="deleteDialog.show" persistent>
      <div class="custom-dialog delete-dialog">
        <div class="dialog-header dialog-header--danger">
          <div class="dialog-header-icon dialog-header-icon--danger">
            <q-icon name="warning_amber" color="white" size="18px" />
          </div>
          <span>ยืนยันการลบข้อมูล</span>
          <q-space />
          <button class="dialog-close-btn" type="button" @click="cancelDeleteClaim">
            <q-icon name="close" size="18px" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="delete-confirm-body">
            <p class="delete-text">
              ต้องการลบรายการ <strong>{{ deleteDialog.id }}</strong> ({{ deleteDialog.orgName }}) ใช่หรือไม่?
            </p>
            <p class="delete-warn">
              <q-icon name="info_outline" size="14px" class="q-mr-xs" />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="dlg-btn dlg-btn--cancel" @click="cancelDeleteClaim">ยกเลิก</button>
          <button type="button" class="dlg-btn dlg-btn--danger" :disabled="deletingRowId === deleteDialog.id" @click="confirmDeleteClaim">
            <q-circular-progress v-if="deletingRowId === deleteDialog.id" indeterminate size="16px" color="white" class="q-mr-xs" />
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </q-dialog>

    <!-- ===== NOTIFY DIALOG ===== -->
    <q-dialog v-model="showNotifyDialog">
      <div class="notify-dialog">
        <div class="notify-header" :class="notifySuccess ? 'notify-header--success' : 'notify-header--error'">
          <div class="notify-header-icon">
            <q-icon :name="notifySuccess ? 'check_circle' : 'error_outline'" size="1.5rem" color="white" />
          </div>
          <div>
            <div class="notify-title">{{ notifySuccess ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด' }}</div>
            <div class="notify-sub">{{ notifySuccess ? 'ดำเนินการเรียบร้อยแล้ว' : 'กรุณาลองใหม่อีกครั้ง' }}</div>
          </div>
        </div>
        <div class="notify-body">
          <p class="notify-msg" :class="notifySuccess ? 'notify-msg--success' : 'notify-msg--error'">
            {{ notifyMessage }}
          </p>
        </div>
        <div
          :key="notifyKey"
          class="notify-progress"
          :class="notifySuccess ? 'notify-progress--success' : 'notify-progress--error'"
          :style="{ animationDuration: `${NOTIFY_DURATION}ms` }"
        />
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import * as XLSX from 'xlsx';
import { api } from '@/boot/axios';
import type { AxiosError } from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const NOTIFY_DURATION = 2000;

const COLORS = {
  revenue: '#1e6fd9',
  profit: '#17a865',
  warning: '#f5a524',
  danger: '#e5484d',
  partial: '#8b5cf6',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type ClaimStatus =
  | 'รอเบิกจ่ายปกติ'
  | 'ชำระเงินครบถ้วน'
  | 'ชำระเงินไม่ครบถ้วน'
  | 'ยังไม่ชำระเงิน'
  | 'ล่าช้า <3 เดือน';

interface ClaimRecord {
  id: number;
  code: string;
  title: string;
  orgName: string;
  fundSource: string;
  benefitId: number | null;
  deployDate: string;
  deployDateIso: string;
  claimDate: string;
  claimDateIso: string;
  claimAmount: number;
  receivedAmount: number;
  overdueAmount: number;
  receivedDate: string;
  receivedDateIso: string;
  status: ClaimStatus;
  submitted: boolean;
  overdueDays: number;
  note: string;
}

interface StatusOption {
  id: number;
  name: ClaimStatus;
}

interface BenefitOption {
  id: number;
  name: string;
}

interface Kpi {
  title: string;
  value: string;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

interface Bucket {
  label: string;
  color: string;
  amount: number;
  count: number;
  percent: number;
}

interface FilterOption {
  value: string;
  label: string;
}

// ─── Quasar & Responsive ────────────────────────────────────────────────────
const $q = useQuasar();
const isMobile = computed(() => $q.screen.lt.sm);

// ─── Static Fallback Lists (used until the live options load) ──────────────
const STATUS_OPTIONS: readonly ClaimStatus[] = [
  'รอเบิกจ่ายปกติ',
  'ชำระเงินครบถ้วน',
  'ชำระเงินไม่ครบถ้วน',
  'ยังไม่ชำระเงิน',
  'ล่าช้า <3 เดือน',
];

const BENEFIT_OPTIONS: readonly string[] = ['ข้าราชการ', 'อปท.', 'ประกันสังคม', 'ชำระเงินเอง'];

const BUCKET_ORDER: readonly ClaimStatus[] = STATUS_OPTIONS;

const BUCKET_COLOR: Readonly<Record<ClaimStatus, string>> = {
  รอเบิกจ่ายปกติ: COLORS.revenue,
  ชำระเงินครบถ้วน: COLORS.profit,
  ชำระเงินไม่ครบถ้วน: COLORS.partial,
  ยังไม่ชำระเงิน: COLORS.danger,
  'ล่าช้า <3 เดือน': COLORS.warning,
};

const STATUS_BADGE_COLOR: Readonly<Record<ClaimStatus, { bg: string; color: string }>> = {
  รอเบิกจ่ายปกติ: { bg: '#e6f0fb', color: COLORS.revenue },
  ชำระเงินครบถ้วน: { bg: '#e3f7ea', color: COLORS.profit },
  ชำระเงินไม่ครบถ้วน: { bg: '#f1eafe', color: COLORS.partial },
  ยังไม่ชำระเงิน: { bg: '#fce8e8', color: COLORS.danger },
  'ล่าช้า <3 เดือน': { bg: '#fdf3dd', color: COLORS.warning },
};
const STATUS_BADGE_FALLBACK = { bg: '#eef0f3', color: '#6b7280' };

const FISCAL_YEARS: readonly FilterOption[] = [
  { value: '2024', label: 'พ.ศ. 2567' },
  { value: '2025', label: 'พ.ศ. 2568' },
  { value: '2026', label: 'พ.ศ. 2569' },
];
const fiscalYear = ref('2026');

// ─── Filters ──────────────────────────────────────────────────────────────────
const titleQuery = ref('');
const orgQuery = ref('');
const deployDateQuery = ref('');
const statusFilter = ref('all');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBaht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString('en-US')}`;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

// <input type="date"> only accepts/displays a value in YYYY-MM-DD. The API
// returns full ISO timestamps (or already-plain dates), so this normalizes
// either into the exact format the native date picker needs — separate
// from formatDate() above, which produces the DD/MM/YYYY shown in the
// table and export.
function toIsoDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

function toDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function statusMeta(status: string): { bg: string; color: string } {
  return STATUS_BADGE_COLOR[status as ClaimStatus] ?? STATUS_BADGE_FALLBACK;
}

function rowNumber(rowIndex: number): number {
  return (pagination.value.page - 1) * pagination.value.rowsPerPage + rowIndex + 1;
}

// Maps one row from GET /expenses into a ClaimRecord. The API uses
// all-lowercase field names (orgname, deploydate, claimamount, ...) while
// the rest of the app works in camelCase, so this is the single place that
// bridges the two.
function mapApiRecordToClaim(raw: Record<string, any>): ClaimRecord {
  const claimDate = formatDate(raw.claimdate);
  const submitted = Boolean(claimDate);
  const claimAmount = Number(raw.claimamount ?? 0);
  const receivedAmount = Number(raw.receiveamount ?? 0);

  let overdueDays = 0;
  if (submitted && receivedAmount < claimAmount && raw.claimdate) {
    const diffMs = Date.now() - new Date(raw.claimdate).getTime();
    overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    id: Number(raw.id),
    code: raw.code ?? '',
    title: raw.title ?? '',
    orgName: raw.orgname ?? '',
    fundSource: raw.fundsource ?? '',
    benefitId: raw.benefitId != null ? Number(raw.benefitId) : (raw.benefit?.id != null ? Number(raw.benefit.id) : null),
    deployDate: formatDate(raw.deploydate),
    deployDateIso: toIsoDate(raw.deploydate),
    claimDate,
    claimDateIso: toIsoDate(raw.claimdate),
    claimAmount,
    receivedAmount,
    overdueAmount: Number(raw.overdueamount ?? Math.max(0, claimAmount - receivedAmount)),
    receivedDate: formatDate(raw.receivedate),
    receivedDateIso: toIsoDate(raw.receivedate),
    status: (raw.status?.name ?? 'รอเบิกจ่ายปกติ') as ClaimStatus,
    submitted,
    overdueDays,
    note: raw.note ?? '',
  };
}

function extractList(payload: unknown, nestedKey: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const data = payload as Record<string, any> | undefined;
  return data?.data ?? data?.[nestedKey]?.data ?? [];
}

// ─── Notify Dialog ────────────────────────────────────────────────────────────
const showNotifyDialog = ref(false);
const notifySuccess = ref(true);
const notifyMessage = ref('');
const notifyKey = ref(0);
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

const openNotify = (success: boolean, message: string) => {
  if (notifyTimer) clearTimeout(notifyTimer);
  notifySuccess.value = success;
  notifyMessage.value = message;
  notifyKey.value++;
  showNotifyDialog.value = true;
  notifyTimer = setTimeout(() => {
    showNotifyDialog.value = false;
  }, NOTIFY_DURATION);
};

// ─── Data Fetching: Claims ────────────────────────────────────────────────────
const CLAIM_RECORDS = ref<ClaimRecord[]>([]);
const isLoadingClaims = ref(false);

const fetchExpense = async (): Promise<void> => {
  isLoadingClaims.value = true;
  try {
    const response = await api.get('/expenses', {
      params: {
        title: titleQuery.value.trim() || undefined,
        orgname: orgQuery.value.trim() || undefined,
        deploydate: deployDateQuery.value.trim() || undefined,
        statusId: statusId.value ?? undefined,
      },
    });
    CLAIM_RECORDS.value = extractList(response.data, 'expenses').map((row) =>
      mapApiRecordToClaim(row as Record<string, any>),
    );
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    CLAIM_RECORDS.value = [];
    openNotify(false, error.response?.data?.message ?? 'โหลดข้อมูลการเบิกจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  } finally {
    isLoadingClaims.value = false;
    pagination.value.page = 1;
  }
};

// ─── Data Fetching: Status Options ───────────────────────────────────────────
const statusOptions = ref<StatusOption[]>([]);

const fetchStatus = async (): Promise<void> => {
  try {
    const response = await api.get('/status/all');
    statusOptions.value = extractList(response.data, 'status').map((row: any) => ({
      id: Number(row.id),
      name: (row.name ?? row.status ?? row.label ?? '') as ClaimStatus,
    }));
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    openNotify(false, error.response?.data?.message ?? 'โหลดรายการสถานะเบิกจ่ายไม่สำเร็จ');
  }
};

const statusSelectOptions = computed<StatusOption[]>(() =>
  statusOptions.value.length ? statusOptions.value : STATUS_OPTIONS.map((name, i) => ({ id: i, name })),
);

const statusFilterOptions = computed<FilterOption[]>(() => [
  { value: 'all', label: 'ทุกสถานะ' },
  ...statusSelectOptions.value.map((s) => ({ value: s.name, label: s.name })),
]);

// The status filter works with a status *name* ("all" or a ClaimStatus
// string), but the API expects a numeric statusId. This resolves the name
// against the live list loaded from GET /status/all (never against the
// static fallback's placeholder ids, which don't correspond to real rows).
const statusId = computed<number | undefined>(() => {
  if (statusFilter.value === 'all') return undefined;
  return statusOptions.value.find((s) => s.name === statusFilter.value)?.id;
});

function resolveStatusId(name: ClaimStatus): number | undefined {
  return statusOptions.value.find((s) => s.name.trim() === name.trim())?.id;
}

// ─── Data Fetching: Benefit Options ──────────────────────────────────────────
const benefitOptions = ref<BenefitOption[]>([]);

const fetchBenefit = async (): Promise<void> => {
  try {
    const response = await api.get('/benefit/all');
    benefitOptions.value = extractList(response.data, 'benefit').map((row: any) => ({
      id: Number(row.id),
      name: (row.benefitname ?? row.name ?? '') as string,
    }));
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    openNotify(false, error.response?.data?.message ?? 'โหลดรายการสิทธิ์การรักษาไม่สำเร็จ');
  }
};

const benefitSelectOptions = computed<BenefitOption[]>(() =>
  benefitOptions.value.length ? benefitOptions.value : BENEFIT_OPTIONS.map((name, i) => ({ id: i, name })),
);

// ─── Claims (filtered by the API, rendered as-is) ────────────────────────────
const periodClaims = computed<ClaimRecord[]>(() => CLAIM_RECORDS.value);

// ─── Table ────────────────────────────────────────────────────────────────────
const pagination = ref({
  sortBy: null as string | null,
  descending: false,
  page: 1,
  rowsPerPage: 10,
});

const tableColumns = [
  { name: 'index', label: 'ลำดับ', field: () => '', align: 'center' as const, style: 'width: 3%', headerStyle: 'width: 3%' },
  { name: 'code', label: 'รหัส', field: 'code', align: 'left' as const, style: 'width: 7%', headerStyle: 'width: 7%', sortable: true },
  { name: 'title', label: 'งานออกหน่วย', field: 'title', align: 'left' as const, style: 'width: 19%', headerStyle: 'width: 19%', sortable: true },
  { name: 'orgName', label: 'สถานที่', field: 'orgName', align: 'left' as const, style: 'width: 13%', headerStyle: 'width: 13%', sortable: true },
  { name: 'deployDate', label: 'วันที่ออกหน่วย', field: 'deployDate', align: 'left' as const, style: 'width: 8%', headerStyle: 'width: 8%', sortable: true },
  { name: 'claimDate', label: 'วันที่ส่งตั้งเบิก', field: 'claimDate', align: 'left' as const, style: 'width: 8%', headerStyle: 'width: 8%', sortable: true },
  {
    name: 'claimAmount',
    label: 'ยอดเงินตั้งเบิก',
    field: (row: ClaimRecord) => row.claimAmount,
    align: 'right' as const,
    style: 'width: 9%',
    headerStyle: 'width: 9%',
    sortable: true,
  },
  {
    name: 'receivedAmount',
    label: 'ได้รับเงินแล้ว',
    field: (row: ClaimRecord) => row.receivedAmount,
    align: 'right' as const,
    style: 'width: 9%',
    headerStyle: 'width: 9%',
    sortable: true,
  },
  {
    name: 'pendingAmount',
    label: 'ยอดค้างชำระ',
    field: (row: ClaimRecord) => row.claimAmount - row.receivedAmount,
    align: 'right' as const,
    style: 'width: 9%',
    headerStyle: 'width: 9%',
    sortable: true,
  },
  { name: 'status', label: 'สถานะเบิกจ่าย', field: 'status', align: 'center' as const, style: 'width: 8%', headerStyle: 'width: 8%', sortable: true },
  { name: 'actions', label: 'การจัดการ', field: 'actions', align: 'center' as const, style: 'width: 7%', headerStyle: 'width: 7%' },
];

// ─── KPI & Chart Computeds ────────────────────────────────────────────────────
const totalClaimed = computed(() =>
  periodClaims.value.filter((c) => c.submitted).reduce((sum, c) => sum + c.claimAmount, 0),
);
const totalReceived = computed(() => periodClaims.value.reduce((sum, c) => sum + c.receivedAmount, 0));
const totalPending = computed(() =>
  periodClaims.value.reduce((sum, c) => sum + (c.claimAmount - c.receivedAmount), 0),
);
const receivedPercent = computed(() =>
  totalClaimed.value ? Math.round((totalReceived.value / totalClaimed.value) * 100) : 0,
);

const lateCount = computed(() => periodClaims.value.filter((c) => c.status === 'ล่าช้า <3 เดือน').length);
const unpaidCount = computed(() => periodClaims.value.filter((c) => c.status === 'ยังไม่ชำระเงิน').length);

const kpis = computed<Kpi[]>(() => [
  {
    title: 'ยอดเงินส่งเคลมตั้งเบิกทั้งหมด',
    value: fmtBaht(totalClaimed.value),
    sub: `จากการออกหน่วยทั้งหมด ${periodClaims.value.length} รอบ`,
    icon: 'send',
    iconBg: '#e6f0fb',
    iconColor: COLORS.revenue,
  },
  {
    title: 'ยอดเงินที่ได้รับโอนแล้ว (Received)',
    value: fmtBaht(totalReceived.value),
    valueColor: COLORS.profit,
    sub: `${receivedPercent.value}% ของยอดส่งเคลม`,
    icon: 'task_alt',
    iconBg: '#e3f7ea',
    iconColor: COLORS.profit,
  },
  {
    title: 'ยอดเงินค้างชำระรอเบิกจ่าย (Pending)',
    value: fmtBaht(totalPending.value),
    valueColor: COLORS.warning,
    sub: `ล่าช้า <3 เดือน (${lateCount.value} รอบ) • ยังไม่ชำระเงิน (${unpaidCount.value} รอบ)`,
    icon: 'hourglass_bottom',
    iconBg: '#fdf3dd',
    iconColor: COLORS.warning,
  },
]);

const donutSlices = computed(() => [
  { label: 'ได้รับแล้ว', value: totalReceived.value, color: COLORS.profit },
  { label: 'ค้างชำระ', value: totalPending.value, color: COLORS.warning },
]);

const donutGradient = computed(() => {
  const items = donutSlices.value;
  const total = items.reduce((sum, d) => sum + d.value, 0) || 1;
  let cursor = 0;
  const stops = items.map((d) => {
    const start = (cursor / total) * 360;
    cursor += d.value;
    const end = (cursor / total) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
});

const overdueBuckets = computed<Bucket[]>(() => {
  const totals = new Map<ClaimStatus, { amount: number; count: number }>();

  periodClaims.value.forEach((c) => {
    const pendingAmount = c.claimAmount - c.receivedAmount;
    const bucketAmount = c.status === 'ชำระเงินครบถ้วน' ? c.receivedAmount : pendingAmount;
    const existing = totals.get(c.status) ?? { amount: 0, count: 0 };
    totals.set(c.status, { amount: existing.amount + bucketAmount, count: existing.count + 1 });
  });

  const maxAmount = Math.max(...Array.from(totals.values(), (t) => t.amount), 1);

  return BUCKET_ORDER.filter((status) => totals.has(status)).map((status) => {
    const t = totals.get(status)!;
    return {
      label: status,
      color: BUCKET_COLOR[status],
      amount: t.amount,
      count: t.count,
      percent: Math.round((t.amount / maxAmount) * 100),
    };
  });
});

const lateList = computed<ClaimRecord[]>(() => periodClaims.value.filter((c) => c.status === 'ล่าช้า <3 เดือน'));
const unpaidList = computed<ClaimRecord[]>(() => periodClaims.value.filter((c) => c.status === 'ยังไม่ชำระเงิน'));

// ─── Status Dialog (record claim / received payment) ────────────────────────
interface StatusDialogState {
  show: boolean;
  id: string;
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

const statusDialog = reactive<StatusDialogState>({
  show: false,
  id: '',
  title: '',
  orgName: '',
  benefitId: null,
  deployDate: '',
  claimDate: '',
  claimAmount: 0,
  receivedAmount: 0,
  receivedDate: '',
  status: 'รอเบิกจ่ายปกติ',
  note: '',
});
const savingRowId = ref<string | null>(null);

const saveClaimStatus = (row: ClaimRecord): void => {
  statusDialog.id = String(row.id);
  statusDialog.title = row.title;
  statusDialog.orgName = row.orgName;
  statusDialog.benefitId = row.benefitId;
  statusDialog.deployDate = row.deployDateIso;
  statusDialog.claimDate = row.claimDateIso;
  statusDialog.claimAmount = row.claimAmount;
  statusDialog.receivedAmount = row.receivedAmount;
  statusDialog.receivedDate = row.receivedDateIso;
  statusDialog.status = row.status;
  statusDialog.note = row.note;
  statusDialog.show = true;
};

const closeStatusDialog = (): void => {
  statusDialog.show = false;
};

const submitStatusDialog = async (): Promise<void> => {
  if (!statusDialog.title.trim() || !statusDialog.orgName.trim()) {
    openNotify(false, 'กรุณากรอกชื่องานออกหน่วยและสถานที่ให้ครบถ้วนก่อนบันทึก');
    return;
  }
  if (statusDialog.benefitId === null) {
    openNotify(false, 'กรุณาเลือกสิทธิ์การรักษาก่อนบันทึก');
    return;
  }

  const resolvedStatusId = resolveStatusId(statusDialog.status);
  if (resolvedStatusId === undefined) {
    openNotify(false, 'ไม่พบรหัสสถานะที่เลือก กรุณารอโหลดรายการสถานะให้เสร็จแล้วลองใหม่อีกครั้ง');
    return;
  }

  savingRowId.value = statusDialog.id;
  try {
    await api.patch(`/expenses/${statusDialog.id}`, {
      title: statusDialog.title,
      orgname: statusDialog.orgName,
      benefitId: statusDialog.benefitId,
      deploydate: statusDialog.deployDate,
      claimdate: statusDialog.claimDate,
      claimamount: statusDialog.claimAmount,
      receiveamount: statusDialog.receivedAmount,
      receivedate: statusDialog.receivedDate,
      statusId: resolvedStatusId,
      note: statusDialog.note,
    });

    statusDialog.show = false;
    openNotify(true, `บันทึกสถานะรอบ ${statusDialog.id} (${statusDialog.orgName}) สำเร็จ`);
    await fetchExpense();
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    openNotify(false, error.response?.data?.message ?? 'บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  } finally {
    savingRowId.value = null;
  }
};

// ─── Add Dialog (new claim record) ───────────────────────────────────────────
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
  title: '',
  orgName: '',
  benefitId: null,
  deployDate: '',
  claimDate: '',
  claimAmount: 0,
  receivedAmount: 0,
  receivedDate: '',
  status: 'รอเบิกจ่ายปกติ',
  note: '',
});
const isAddingClaim = ref(false);

const openAddDialog = (): void => {
  addDialog.title = '';
  addDialog.orgName = '';
  addDialog.benefitId = null;
  addDialog.deployDate = '';
  addDialog.claimDate = '';
  addDialog.claimAmount = 0;
  addDialog.receivedAmount = 0;
  addDialog.receivedDate = '';
  addDialog.status = 'รอเบิกจ่ายปกติ';
  addDialog.note = '';
  addDialog.show = true;
};

const closeAddDialog = (): void => {
  addDialog.show = false;
};

const submitAddDialog = async (): Promise<void> => {
  if (!addDialog.title.trim() || !addDialog.orgName.trim()) {
    openNotify(false, 'กรุณากรอกชื่องานออกหน่วยและสถานที่ให้ครบถ้วนก่อนบันทึก');
    return;
  }
  if (addDialog.benefitId === null) {
    openNotify(false, 'กรุณาเลือกสิทธิ์การรักษาก่อนบันทึก');
    return;
  }

  const resolvedStatusId = resolveStatusId(addDialog.status);
  if (resolvedStatusId === undefined) {
    openNotify(false, 'ไม่พบรหัสสถานะที่เลือก กรุณารอโหลดรายการสถานะให้เสร็จแล้วลองใหม่อีกครั้ง');
    return;
  }

  isAddingClaim.value = true;
  try {
    await api.post('/expenses', {
      title: addDialog.title,
      orgname: addDialog.orgName,
      benefitId: addDialog.benefitId,
      deploydate: addDialog.deployDate,
      claimdate: addDialog.claimDate,
      claimamount: addDialog.claimAmount,
      receiveamount: addDialog.receivedAmount,
      receivedate: addDialog.receivedDate,
      statusId: resolvedStatusId,
      note: addDialog.note,
    });

    addDialog.show = false;
    openNotify(true, `เพิ่มรายการ (${addDialog.orgName}) สำเร็จ`);
    await fetchExpense();
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    openNotify(false, error.response?.data?.message ?? 'เพิ่มรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  } finally {
    isAddingClaim.value = false;
  }
};

// ─── Delete Dialog ────────────────────────────────────────────────────────────
interface DeleteDialogState {
  show: boolean;
  id: string;
  orgName: string;
}

const deleteDialog = reactive<DeleteDialogState>({ show: false, id: '', orgName: '' });
const deletingRowId = ref<string | null>(null);

const askDeleteClaim = (row: ClaimRecord): void => {
  deleteDialog.id = String(row.id);
  deleteDialog.orgName = row.orgName;
  deleteDialog.show = true;
};

const cancelDeleteClaim = (): void => {
  deleteDialog.show = false;
};

const confirmDeleteClaim = async (): Promise<void> => {
  const targetId = deleteDialog.id;
  const targetOrg = deleteDialog.orgName;

  deletingRowId.value = targetId;
  try {
    await api.delete(`/expenses/${targetId}`);
    deleteDialog.show = false;
    openNotify(true, `ลบรายการ ${targetId} (${targetOrg}) สำเร็จ`);
    await fetchExpense();
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    openNotify(false, error.response?.data?.message ?? 'ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  } finally {
    deletingRowId.value = null;
  }
};

// ─── Export to Excel ──────────────────────────────────────────────────────────
interface ClaimExportRow {
  รหัสรอบ: string;
  งานออกหน่วย: string;
  หน่วยงานเป้าหมาย: string;
  กองทุน: string;
  วันที่ออกหน่วย: string;
  วันส่งตั้งเบิก: string;
  'ยอดเงินตั้งเบิก (บาท)': number;
  'ได้รับเงินแล้ว (บาท)': number;
  'ยอดค้างชำระ (บาท)': number;
  จำนวนวันค้างชำระ: number;
  สถานะเบิกจ่าย: string;
}

const CLAIM_EXPORT_COL_WIDTHS: readonly number[] = [14, 40, 32, 18, 14, 14, 18, 18, 18, 16, 18];
const isExporting = ref(false);

const exportClaimsToExcel = (): void => {
  if (!periodClaims.value.length) {
    openNotify(false, 'ไม่มีข้อมูลการเบิกจ่ายสำหรับส่งออกในเงื่อนไขนี้');
    return;
  }

  isExporting.value = true;
  try {
    const rows: ClaimExportRow[] = periodClaims.value.map((c) => ({
      รหัสรอบ: c.code,
      งานออกหน่วย: c.title,
      หน่วยงานเป้าหมาย: c.orgName,
      กองทุน: c.fundSource,
      วันที่ออกหน่วย: c.deployDate,
      วันส่งตั้งเบิก: c.submitted ? c.claimDate : '-',
      'ยอดเงินตั้งเบิก (บาท)': c.claimAmount,
      'ได้รับเงินแล้ว (บาท)': c.receivedAmount,
      'ยอดค้างชำระ (บาท)': c.claimAmount - c.receivedAmount,
      จำนวนวันค้างชำระ: c.overdueDays,
      สถานะเบิกจ่าย: c.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = CLAIM_EXPORT_COL_WIDTHS.map((wch) => ({ wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ติดตามการเบิกจ่าย');

    const yearLabel = FISCAL_YEARS.find((y) => y.value === fiscalYear.value)?.label ?? fiscalYear.value;
    XLSX.writeFile(workbook, `รายงานการเบิกจ่าย_${yearLabel.replace(/\s|\./g, '')}.xlsx`);
    openNotify(true, 'ส่งออกไฟล์ Excel สำเร็จ');
  } catch {
    openNotify(false, 'ส่งออกไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  } finally {
    isExporting.value = false;
  }
};

// ─── Filter Events ────────────────────────────────────────────────────────────
// titleQuery/orgQuery already carry Quasar's own debounce via the input's
// `debounce` prop, so this only fires once the user pauses typing.
watch([titleQuery, orgQuery, deployDateQuery, statusFilter], () => {
  void fetchExpense();
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  void fetchExpense();
  void fetchStatus();
  void fetchBenefit();
});

onUnmounted(() => {
  if (notifyTimer) clearTimeout(notifyTimer);
});
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
  gap: 10px;
  flex-wrap: wrap;
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

.export-claim-btn {
  background: #eef2f7;
  color: #1a1f27;
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

.overdue-none {
  color: #b3bac5;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1f27;
}

.empty-sub {
  font-size: 0.82rem;
  color: #8a94a3;
  margin-top: 4px;
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

/* ─── Dialogs (shared shell for status / add / delete) ────────────────────── */
.custom-dialog {
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 20px 60px rgba(26, 31, 39, 0.18);
}

.custom-dialog--mobile {
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 100%;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

.delete-dialog {
  max-width: 380px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: #1a1f27;
  border-bottom: 1px solid #eef0f3;
}

.dialog-header--primary {
  background: linear-gradient(135deg, #e6f0fb, #f2f7fd);
}

.dialog-header--danger {
  background: linear-gradient(135deg, #fce8e8, #fff1f1);
}

.dialog-header-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dialog-header-icon--primary {
  background: linear-gradient(135deg, #3f8ae0, #1e6fd9);
}

.dialog-header-icon--danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.dialog-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(26, 31, 39, 0.06);
  color: #8a94a3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.dialog-close-btn:hover {
  background: rgba(26, 31, 39, 0.12);
}

.dialog-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 70vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 1.25rem 1.25rem;
}

.dialog-footer--mobile {
  display: grid !important;
  grid-template-columns: 1fr 1fr;
}

.dialog-footer--mobile .dlg-btn {
  justify-content: center;
  width: 100%;
}

.dialog-drag-handle {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.dialog-drag-handle::before {
  content: '';
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: rgba(26, 31, 39, 0.15);
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

.delete-confirm-body {
  text-align: center;
  padding: 0.5rem 0;
}

.delete-text {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0 0 10px;
  line-height: 1.6;
}

.delete-warn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  color: #8a94a3;
  margin: 0;
}

.dlg-btn {
  display: inline-flex;
  align-items: center;
  padding: 9px 22px;
  border-radius: 10px;
  border: none;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s, opacity 0.15s;
}

.dlg-btn:active {
  transform: scale(0.96);
}

.dlg-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.dlg-btn--cancel {
  background: rgba(26, 31, 39, 0.06);
  color: #6b7280;
}

.dlg-btn--cancel:hover {
  background: rgba(26, 31, 39, 0.12);
}

.dlg-btn--confirm {
  background: linear-gradient(135deg, #3f8ae0, #1e6fd9);
  color: white;
  box-shadow: 0 3px 12px rgba(30, 111, 217, 0.3);
}

.dlg-btn--confirm:hover {
  box-shadow: 0 5px 18px rgba(30, 111, 217, 0.4);
}

.dlg-btn--danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 3px 12px rgba(220, 38, 38, 0.3);
}

.dlg-btn--danger:hover {
  box-shadow: 0 5px 18px rgba(220, 38, 38, 0.4);
}

/* ─── Notify Dialog ─────────────────────────────────────────────────────── */
.notify-dialog {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  width: 340px;
  max-width: 92vw;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.12);
}

.notify-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.1rem 1.4rem;
}

.notify-header--success {
  background: linear-gradient(135deg, #0f6e3e, #17a865);
}

.notify-header--error {
  background: linear-gradient(135deg, #7f1d1d, #e5484d);
}

.notify-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notify-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.notify-sub {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 2px;
}

.notify-body {
  padding: 1.25rem 1.25rem 0.5rem;
}

.notify-msg {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 0 0 1rem;
  line-height: 1.6;
}

.notify-msg--success {
  background: #f0fdf4;
}

.notify-msg--error {
  background: #fce8e8;
}

.notify-progress {
  height: 4px;
  width: 100%;
  animation: progressShrink linear forwards;
}

.notify-progress--success {
  background: linear-gradient(90deg, #0f6e3e, #17a865);
}

.notify-progress--error {
  background: linear-gradient(90deg, #7f1d1d, #e5484d);
}

@keyframes progressShrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* ─── Responsive ───────────────────────────────────────────────────────── */
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

  .add-claim-btn,
  .export-claim-btn {
    flex: 1;
    justify-content: center;
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

  .dialog-body {
    max-height: 62vh;
  }

  .dlg-btn {
    flex: 1;
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