<template>
  <q-page class="cc-page">
    <div class="cc-container">
      <!-- ===== Page header ===== -->
      <div class="cc-header-card">
        <div class="cc-header-icon">
          <q-icon name="attach_money" size="22px" />
        </div>

        <div class="cc-header-text">
          <div class="cc-header-title">
            การตั้งค่าต้นทุนมาตรฐานการออกหน่วย
            <span class="cc-header-title-en">(Cost Management Setup)</span>
          </div>
          <div class="cc-header-sub">
            กำหนดราคาอ้างอิงของวัสดุแล็บ, อุปกรณ์แพทย์, ค่าแรงบุคลากร
            และค่าน้ำมันยานพาหนะ
          </div>
        </div>

        <div class="cc-header-toggle">
          <q-btn
            v-for="tab in TABS"
            :key="tab.id"
            no-caps
            dense
            flat
            :icon="tab.icon"
            :label="tab.label"
            class="cc-toggle-btn"
            :class="{ 'cc-toggle-btn--active': activeTab === tab.id }"
            @click="switchTab(tab.id)"
          />
        </div>
      </div>

      <!-- ===== Catalog header card =====
           Per-tab catalog title/subtitle/buttons, styled as its own light
           card above the table (distinct from the dark page header up
           top, which stays generic across all three tabs). -->
      <div class="cc-catalog-card">
        <div class="cc-catalog-header-row">
          <div class="cc-catalog-icon">
            <q-icon name="biotech" size="18px" />
          </div>
          <div class="cc-catalog-text">
            <div class="cc-catalog-title">
              {{ activeTabConfig.catalogTitleTh }}
              <span class="cc-catalog-title-en">{{
                activeTabConfig.catalogTitleEn
              }}</span>
            </div>
          </div>
          <div class="cc-catalog-actions">
            <span class="cc-catalog-count">{{ activeTotal }} รายการ</span>
            <q-btn
              no-caps
              flat
              dense
              icon="check_circle"
              :label="activeTabConfig.saveLabel"
              class="cc-secondary-btn"
              @click="saveCatalog"
            />
            <q-btn
              no-caps
              unelevated
              dense
              icon="add"
              :label="activeTabConfig.addLabel"
              class="cc-primary-btn"
              @click="openCreateDialog"
            />
          </div>
        </div>
        <div class="cc-catalog-sub">{{ activeTabConfig.catalogSubtitle }}</div>

        <div class="cc-filter-row">
          <div class="cc-filter-field">
            <label class="cc-filter-label">ค้นหารายการ</label>
            <q-input
              dense
              outlined
              clearable
              hide-bottom-space
              debounce="400"
              v-model="searchQuery"
              :placeholder="`ค้นหารหัส, ชื่อรายการ หรือ${activeTabConfig.vendorLabel}...`"
              class="cc-search-input"
            />
          </div>

          <q-btn
            v-if="hasActiveFilters"
            no-caps
            flat
            dense
            icon="close"
            label="ล้างตัวกรองทั้งหมด"
            class="cc-clear-filters-btn"
            @click="clearFilters"
          />
        </div>

        <!-- Loading state — materials, vehicle, and labor all fetch from
             the backend now. -->
        <div v-if="isLoadingActiveTab" class="cc-loading-state">
          <q-spinner-dots size="32px" color="primary" />
          <div class="cc-loading-text">กำลังโหลดข้อมูล...</div>
        </div>

        <div v-else-if="activeItems.length" class="cc-table-scroll">
        <q-table
          flat
          :rows="activeItems"
          :columns="ccColumns"
          row-key="id"
          v-model:pagination="tablePagination"
          :rows-per-page-options="[5, 10, 20, 50]"
          rows-per-page-label="Records per page:"
          :loading="isLoadingActiveTab"
          class="cc-qtable cc-desktop-table"
          @request="onTableRequest"
        >
          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="no" :props="props" class="cc-td-no">
  {{ (props.row as CostItem | VehicleItem | PositionItem).displayIndex }}
</q-td>

              <!-- Vehicle tab: GET {{baseURL}}/vehicle has its own shape
                   (type / depreciationRate / fuelEfficiency /
                   avgFuelPrice) — no code/unit/vendor, so it gets its own
                   set of cells instead of the shared CostItem columns
                   below. -->
              <template v-if="activeTab === 'vehicle'">
                <q-td key="type" :props="props" class="cc-td-name">
                  {{ (props.row as VehicleItem).type }}
                </q-td>
                <q-td key="depreciationRate" :props="props" class="cc-td-unit">
                  <span class="cc-unit-text">{{ (props.row as VehicleItem).depreciationRate }}</span>
                </q-td>
                <q-td key="fuelEfficiency" :props="props" class="cc-td-unit">
                  <span class="cc-unit-text">{{ (props.row as VehicleItem).fuelEfficiency }}</span>
                </q-td>
                <q-td key="avgFuelPrice" :props="props" class="cc-td-price">
                  <span class="cc-price-box">฿ {{ formatPrice((props.row as VehicleItem).avgFuelPrice) }}</span>
                </q-td>
              </template>

              <!-- Labor tab: GET {{baseURL}}/position has its own shape
                   (position / dailyWage / hourlyWage / fieldAllowance) —
                   no code/unit/vendor either, so it gets its own set of
                   cells too, same treatment as vehicle above. -->
              <template v-else-if="activeTab === 'labor'">
                <q-td key="position" :props="props" class="cc-td-name">
                  {{ (props.row as PositionItem).position }}
                </q-td>
                <q-td key="dailyWage" :props="props" class="cc-td-price">
                  <span class="cc-price-box">฿ {{ formatPrice((props.row as PositionItem).dailyWage) }}</span>
                </q-td>
                <q-td key="hourlyWage" :props="props" class="cc-td-price">
                  <span class="cc-price-box">฿ {{ formatPrice((props.row as PositionItem).hourlyWage) }}</span>
                </q-td>
                <q-td key="fieldAllowance" :props="props" class="cc-td-price">
                  <span class="cc-price-box">฿ {{ formatPrice((props.row as PositionItem).fieldAllowance) }}</span>
                </q-td>
              </template>

              <template v-else>
                <q-td key="code" :props="props" class="cc-td-code">
                  <span class="cc-code-text">{{ (props.row as CostItem).code }}</span>
                </q-td>
                <q-td key="name" :props="props" class="cc-td-name">
                  {{ (props.row as CostItem).name }}
                </q-td>
                <q-td key="unit" :props="props" class="cc-td-unit">
                  <span class="cc-unit-text">{{ (props.row as CostItem).unit }}</span>
                </q-td>
                <q-td key="price" :props="props" class="cc-td-price">
                  <span class="cc-price-box">฿ {{ formatPrice((props.row as CostItem).price) }}</span>
                </q-td>
                <q-td key="vendor" :props="props" class="cc-td-vendor">
                  {{ (props.row as CostItem).vendor }}
                </q-td>
              </template>

              <q-td key="actions" :props="props" class="cc-td-actions">
                <q-btn
                  flat
                  dense
                  icon="edit"
                  size="sm"
                  class="cc-row-edit-btn"
                  @click="openEditDialog(props.row)"
                />
                <q-btn
                  flat
                  dense
                  icon="delete_outline"
                  size="sm"
                  class="cc-row-delete-btn"
                  @click="requestDelete(props.row)"
                />
              </q-td>
            </q-tr>
          </template>
        </q-table>
        </div>
      </div>


      <!-- ===== Empty states =====
           The mobile card list was removed — the real q-table above now
           renders on every screen size (see .cc-table-scroll), scrolling
           horizontally on narrow viewports like the reference layout,
           instead of collapsing into stacked cards. -->
      <div
        v-if="!isLoadingActiveTab && !activeItems.length && hasActiveFilters"
        class="cc-empty-state"
      >
        <q-icon name="search_off" size="28px" class="cc-empty-icon" />
        <div class="cc-empty-title">ไม่พบรายการที่ตรงกับเงื่อนไข</div>
        <div class="cc-empty-sub">ลองแก้คำค้นหา หรือล้างตัวกรอง</div>
        <q-btn
          no-caps
          flat
          dense
          label="ล้างตัวกรองทั้งหมด"
          class="cc-empty-clear-btn"
          @click="clearFilters"
        />
      </div>

      <div
        v-else-if="!isLoadingActiveTab && !activeItems.length"
        class="cc-empty-state"
      >
        <q-icon name="inventory_2" size="28px" class="cc-empty-icon" />
        <div class="cc-empty-title">ยังไม่มีรายการในหมวดนี้</div>
        <div class="cc-empty-sub">
          เริ่มต้นเพิ่มรายการต้นทุนแรกของ {{ activeTabConfig.label }}
        </div>
      </div>
    </div>

    <!-- ===== Create / edit item dialog ===== -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="cc-item-dialog">
        <q-card-section class="cc-item-dialog-header">
          <div class="cc-item-dialog-title">
            {{
              editingItem
                ? "แก้ไขรายการต้นทุน"
                : `เพิ่มรายการใหม่ — ${activeTabConfig.label}`
            }}
          </div>
          <q-btn flat round dense icon="close" :disable="savingItem" @click="closeDialog" />
        </q-card-section>

        <q-card-section class="cc-item-dialog-body">
          <!-- Vehicle tab: own field set matching GET {{baseURL}}/vehicle's
               shape — no name/unit/vendor, just type + the three cost
               drivers used to compute per-trip cost. -->
          <template v-if="activeTab === 'vehicle'">
            <q-input
              dense
              outlined
              v-model="vehicleForm.type"
              label="ประเภทยานพาหนะ *"
              class="cc-dialog-field"
            />

            <div class="cc-dialog-row">
              <q-input
                dense
                outlined
                type="number"
                inputmode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                suffix="% /ปี"
                v-model.number="vehicleForm.depreciationRate"
                label="อัตราค่าเสื่อมราคา (% /ปี) *"
                @keydown="onPriceKeydown"
                @paste="onPricePaste"
                class="cc-dialog-field"
              />
              <q-input
                dense
                outlined
                type="number"
                inputmode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                v-model.number="vehicleForm.fuelEfficiency"
                label="อัตราสิ้นเปลืองน้ำมัน (กม./ลิตร) *"
                @keydown="onPriceKeydown"
                @paste="onPricePaste"
                class="cc-dialog-field"
              />
            </div>

            <q-input
              dense
              outlined
              type="number"
              inputmode="decimal"
                pattern="[0-9]*\.?[0-9]*"
              prefix="฿"
              
              v-model.number="vehicleForm.avgFuelPrice"
              label="ราคาน้ำมันเฉลี่ย (บาท/ลิตร) *"
              @keydown="onPriceKeydown"
                @paste="onPricePaste"
              class="cc-dialog-field"
            />
          </template>

          <!-- Labor tab: own field set matching GET {{baseURL}}/position's
               shape — no name/unit/vendor, just the position title + the
               three wage/allowance figures. -->
          <template v-else-if="activeTab === 'labor'">
            <q-input
              dense
              outlined
              v-model="positionForm.position"
              label="ตำแหน่ง *"
              class="cc-dialog-field"
            />

            <div class="cc-dialog-row">
              <q-input
                dense
                outlined
                type="number"
                inputmode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                prefix="฿"
                v-model.number="positionForm.dailyWage"
                label="ค่าแรงต่อวัน (บาท/วัน) *"
                @keydown="onPriceKeydown"
                @paste="onPricePaste"
                class="cc-dialog-field"
              />
              <q-input
                dense
                outlined
                type="number"
                inputmode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                prefix="฿"
                v-model.number="positionForm.hourlyWage"
                label="ค่าแรงต่อชั่วโมง (บาท/ชม.)*"
                @keydown="onPriceKeydown"
                @paste="onPricePaste"
                class="cc-dialog-field"
              />
            </div>

            <q-input
              dense
              outlined
              type="number"
              inputmode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              prefix="฿"
              v-model.number="positionForm.fieldAllowance"
              label="ค่าตอบแทนออกพื้นที่ (บาท) *"
              @keydown="onPriceKeydown"
              @paste="onPricePaste"
              class="cc-dialog-field"
            />
          </template>

          <template v-else>
            <q-input
              dense
              outlined
              v-model="form.name"
              label="ชื่อรายการ *"
              class="cc-dialog-field"
            />

            <div class="cc-dialog-row">
              <q-select
                dense
                outlined
                use-input
                hide-selected
                fill-input
                new-value-mode="add-unique"
                v-model="form.unit"
                :options="unitInputOptions"
                label="หน่วย *"
                class="cc-dialog-field"
                @filter="filterUnitOptions"
              />
              <!-- Reference price: digits 0-9 only. Kept as type="text"
                   (not type="number") because a native number input still
                   lets the browser accept e/E/+/-/. on many platforms even
                   with a keypress guard — text + inputmode="numeric" gives
                   the numeric mobile keyboard while `onPriceKeydown` /
                   `onPriceInput` below fully own what characters can land
                   in the field. -->
              <q-input
                dense
                outlined
                type="number"
                inputmode="decimal"
                
                autocomplete="off"
                prefix="฿"
                v-model="priceDisplay"
                label="ราคาอ้างอิง (บาท) *"
                class="cc-dialog-field"
                @keydown="onPriceKeydown"
                @paste="onPricePaste"
              />
            </div>

            <q-input
              dense
              outlined
              v-model="form.vendor"
              :label="activeTabConfig.vendorLabel"
              class="cc-dialog-field"
            />
          </template>
        </q-card-section>

        <q-card-actions align="right" class="cc-item-dialog-actions">
          <q-btn no-caps flat label="ยกเลิก" :disable="savingItem" @click="closeDialog" />
          <q-btn
            no-caps
            unelevated
            label="บันทึกรายการ"
            class="cc-primary-btn"
            :loading="savingItem"
            :disable="savingItem"
            @click="saveItem"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== Delete confirmation dialog ===== -->
    <q-dialog v-model="deleteDialogOpen" persistent>
      <q-card class="cc-delete-dialog">
        <q-card-section class="cc-delete-dialog-body">
          <q-icon
            name="warning_amber"
            size="26px"
            class="cc-delete-dialog-icon"
          />
          <div class="cc-delete-dialog-title">ยืนยันการลบรายการ</div>
          <div class="cc-delete-dialog-desc">
            ต้องการลบ
            <strong>{{ deleteItemLabel }}</strong>
            ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
          </div>
        </q-card-section>
        <q-card-actions align="right" class="cc-delete-dialog-actions">
          <q-btn no-caps flat label="ยกเลิก" :disable="deletingItem" @click="cancelDelete" />
          <q-btn
            no-caps
            unelevated
            label="ลบรายการ"
            class="cc-confirm-delete-btn"
            :loading="deletingItem"
            :disable="deletingItem"
            @click="confirmDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from "vue";
import { useQuasar } from "quasar";
import { api } from "@/boot/axios"; // ปรับ path ให้ตรงกับ axios instance ของโปรเจกต์จริง
import type { AxiosError } from "axios";

const $q = useQuasar();

// ─── Notify dialog (matches the Ignore page's pattern: an animated card
// dialog with a progress-bar auto-dismiss, instead of plain toast) ────────
const NOTIFY_DURATION = 2500;
const showNotifyDialog = ref(false);
const notifySuccess = ref(true);
const notifyMessage = ref("");
const notifyKey = ref(0);
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function openNotify(success: boolean, message: string): void {
  if (notifyTimer) clearTimeout(notifyTimer);
  notifySuccess.value = success;
  notifyMessage.value = message;
  notifyKey.value++;
  showNotifyDialog.value = true;
  notifyTimer = setTimeout(() => {
    showNotifyDialog.value = false;
  }, NOTIFY_DURATION);
}

// Extracts a server-provided error message when available, falling back to
// a generic one — same pattern as the Ignore page's AxiosError handling.
function apiErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<{ message?: string }>;
  return error.response?.data?.message ?? fallback;
}

/* =========================================================================
 * Digit-only input guard (ราคาอ้างอิง)
 *
 * The reference-price field must only ever contain the characters 0-9 —
 * no decimal point, no minus sign, no scientific notation. A native
 * type="number" input still lets browsers accept e/E/+/-/. through the
 * keyboard in several combinations, so the field is rendered as
 * type="text" + inputmode="numeric" instead, with these two handlers
 * fully owning what can land in it:
 *   - onPriceKeydown blocks any keypress that isn't a digit, backspace,
 *     delete, arrow key, tab, or a copy/paste/select-all shortcut.
 *   - onPricePaste strips non-digit characters out of pasted text before
 *     it's inserted, rather than blocking the paste outright.
 * `priceDisplay` is the string the input actually binds to; `form.price`
 * (a number | null, used everywhere else — validation, the API payload)
 * is kept in sync via the watcher declared right after `form` below.
 * ========================================================================= */

const ALLOWED_NAV_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Home",
  "End"
]);


function onPriceKeydown(event: KeyboardEvent): void {
  // Let copy/paste/select-all/cut shortcuts through (Ctrl/Cmd+C/V/A/X).
  if (event.ctrlKey || event.metaKey) return;
  if (ALLOWED_NAV_KEYS.has(event.key)) return;

  const isDigit = /^[0-9]$/.test(event.key);
  const isDecimalPoint = event.key === ".";
  const alreadyHasDecimal = priceDisplay.value.includes(".");

  if (isDigit) return;
  if (isDecimalPoint && !alreadyHasDecimal) return;

  event.preventDefault();
}

function onPricePaste(event: ClipboardEvent): void {
  event.preventDefault();
  const pasted = event.clipboardData?.getData("text") ?? "";

  // Keep digits and dots only, then collapse to a single leading decimal point.
  let cleaned = pasted.replace(/[^0-9.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");
  if (firstDotIndex !== -1) {
    cleaned =
      cleaned.slice(0, firstDotIndex + 1) +
      cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
  }
  if (!cleaned) return;

  const target = event.target as HTMLInputElement;
  const start = target.selectionStart ?? priceDisplay.value.length;
  const end = target.selectionEnd ?? priceDisplay.value.length;
  const merged =
    priceDisplay.value.slice(0, start) + cleaned + priceDisplay.value.slice(end);

  // Guard against ending up with 2+ decimal points after merging with
  // existing text (e.g. pasting "1.5" into "2.3").
  const parts = merged.split(".");
  priceDisplay.value =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : merged;
}
/* =========================================================================
 * Tabs
 *
 * All three tabs are backend-driven with real server-side page/limit/
 * search now:
 * - materials: GET/POST/PATCH/DELETE {{baseURL}}/material
 * - vehicle:   GET/POST/PATCH/DELETE {{baseURL}}/vehicle
 * - labor:     GET/POST/PATCH/DELETE {{baseURL}}/position
 *
 * Vehicle and labor each have their own response shape instead of the
 * generic name/unit/price/vendor one materials uses (see VehicleItem /
 * PositionItem below), so they get their own table columns, form fields,
 * and API wrappers throughout this file.
 * ========================================================================= */

type TabId = "materials" | "labor" | "vehicle";

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  codePrefix: string;
  vendorLabel: string;
  catalogTitleTh: string;
  catalogTitleEn: string;
  catalogSubtitle: string;
  addLabel: string;
  saveLabel: string;
}

const TABS: readonly TabConfig[] = [
  {
    id: "materials",
    label: "วัสดุ/น้ำยา",
    icon: "science",
    codePrefix: "MAT",
    vendorLabel: "บริษัท/ผู้จัดจำหน่าย",
    catalogTitleTh: "แคตตาล็อกต้นทุนน้ำยาตรวจวิเคราะห์และเวชภัณฑ์",
    catalogTitleEn: "(Material & Reagents Catalog)",
    catalogSubtitle:
      "ราคาต้นทุนต่อหน่วย (บาท/เทสต์ หรือ บาท/ชิ้น) ใช้คำนวณต้นทุนต่อหัว",
    addLabel: "เพิ่มรายการวัสดุ",
    saveLabel: "บันทึกต้นทุนน้ำยา"
  },
  {
    id: "labor",
    label: "ค่าแรงบุคลากร",
    icon: "groups",
    codePrefix: "LAB",
    vendorLabel: "หน่วยงาน/ผู้ว่าจ้าง",
    catalogTitleTh: "แคตตาล็อกต้นทุนค่าแรงบุคลากร",
    catalogTitleEn: "(Labor Cost Catalog)",
    catalogSubtitle: "ค่าแรงต่อหน่วย (บาท/กะ หรือ บาท/วัน) ใช้คำนวณต้นทุนต่อหัว",
    addLabel: "เพิ่มรายการค่าแรง",
    saveLabel: "บันทึกค่าแรงบุคลากร"
  },
  {
    id: "vehicle",
    label: "ค่าพาหนะ/น้ำมัน",
    icon: "local_shipping",
    codePrefix: "VEH",
    vendorLabel: "ผู้ให้บริการ/บริษัทเช่า",
    catalogTitleTh: "แคตตาล็อกต้นทุนค่าพาหนะและน้ำมัน",
    catalogTitleEn: "(Vehicle & Fuel Cost Catalog)",
    catalogSubtitle:
      "ค่าใช้จ่ายต่อหน่วย (บาท/ลิตร หรือ บาท/เที่ยว) ใช้คำนวณต้นทุนต่อหัว",
    addLabel: "เพิ่มรายการพาหนะ",
    saveLabel: "บันทึกค่าพาหนะ/น้ำมัน"
  }
];

const activeTab = ref<TabId>("materials");
const activeTabConfig = computed(
  () => TABS.find(t => t.id === activeTab.value) ?? TABS[0]
);

/* =========================================================================
 * Cost items (materials)
 * ========================================================================= */

type CostTabId = "materials";

interface CostItem {
  displayIndex: number;
  id: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  vendor: string;
}

// Suggested units for materials — shown as autocomplete options in the
// create/edit dialog and inline unit select. Users can still type a new
// value that isn't in this list (new-value-mode="add-unique").
const UNIT_SUGGESTIONS: Record<CostTabId, string[]> = {
  materials: ["เทสต์", "ชุด", "แผ่น", "หลอด", "ภาพ", "คน", "ขวด", "กล่อง"]
};

const costData = reactive<Record<CostTabId, CostItem[]>>({
  materials: [] // populated by fetchMaterials()
});

/* =========================================================================
 * Vehicle items — GET {{baseURL}}/vehicle has its own shape (type /
 * depreciationRate / fuelEfficiency / avgFuelPrice, no code/unit/vendor),
 * so vehicle rows live in their own array, populated by fetchVehicles().
 * ========================================================================= */

interface VehicleItem {
  displayIndex: number;
  id: string;
  type: string;
  depreciationRate: number;
  fuelEfficiency: number;
  avgFuelPrice: number;
}

const vehicleItems = ref<VehicleItem[]>([]);

/* =========================================================================
 * Labor (position) items — GET {{baseURL}}/position has its own shape
 * (position / dailyWage / hourlyWage / fieldAllowance, no code/unit/
 * vendor), so labor rows live in their own array, populated by
 * fetchPositions().
 * ========================================================================= */

interface PositionItem {
  displayIndex: number;
  id: string;
  position: string;
  dailyWage: number;
  hourlyWage: number;
  fieldAllowance: number;
}

const positionItems = ref<PositionItem[]>([]);

const activeItems = computed<(CostItem | VehicleItem | PositionItem)[]>(() => {
  if (activeTab.value === "vehicle") return vehicleItems.value;
  if (activeTab.value === "labor") return positionItems.value;
  return costData[activeTab.value as CostTabId];
});

/* =========================================================================
 * Server-side pagination + search
 *
 * `tablePagination` is bound to the q-table's own pagination state
 * (page, rowsPerPage) plus `rowsNumber`, which tells q-table the true
 * total lives on the server rather than being `activeItems.value.length`.
 * Every page/rows-per-page change fires `onTableRequest` (q-table's
 * built-in server-side pagination hook); every search change resets to
 * page 1 and refetches. `searchQuery`'s own `debounce="400"` on the
 * q-input means the watcher below fires once per pause in typing, not
 * per keystroke.
 * ========================================================================= */

const searchQuery = ref("");
const hasActiveFilters = computed(() => searchQuery.value.trim().length > 0);

function clearFilters(): void {
  searchQuery.value = "";
}

const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

const materialsTotal = ref(0);
const vehiclesTotal = ref(0);
const positionsTotal = ref(0);

const activeTotal = computed(() => {
  if (activeTab.value === "vehicle") return vehiclesTotal.value;
  if (activeTab.value === "labor") return positionsTotal.value;
  return materialsTotal.value;
});

interface FetchParams {
  page: number;
  limit: number;
  search: string;
}

/* =========================================================================
 * Materials API (GET / POST / PATCH / DELETE) — server-side page/limit/search
 * ========================================================================= */

interface MaterialApiItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  vendor: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MaterialApiResponse {
  material: {
    data: MaterialApiItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
}

const loadingMaterials = ref(false);

const isLoadingActiveTab = computed(
  () =>
    (activeTab.value === "materials" && loadingMaterials.value) ||
    (activeTab.value === "vehicle" && loadingVehicles.value) ||
    (activeTab.value === "labor" && loadingPositions.value)
);

function mapMaterialApiItem(item: MaterialApiItem, displayIndex: number): CostItem {
  return {
    displayIndex,
    id: String(item.id),
    code: item.code,
    name: item.name,
    unit: item.unit,
    price: item.price,
    vendor: item.vendor
  };
}

async function fetchMaterials(params: FetchParams): Promise<void> {
  loadingMaterials.value = true;
  try {
    const { data } = await api.get<MaterialApiResponse>("/material", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined
      }
    });
    const startIndex = (params.page - 1) * params.limit;
    costData.materials = data.material.data
      .filter(item => !item.deletedAt)
      .map((item, index) => mapMaterialApiItem(item, startIndex + index + 1));
    materialsTotal.value = data.material.total;
  } catch (err) {
    console.error("โหลดข้อมูลวัสดุไม่สำเร็จ", err);
    openNotify(false, apiErrorMessage(err, "โหลดข้อมูลวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  } finally {
    loadingMaterials.value = false;
  }
}

// Creates one material row on the backend (POST {{baseURL}}/material).
// The API generates the authoritative `code` (e.g. "MAT-0826-006") — the
// form no longer collects or previews a code for this reason.
async function createMaterialApi(payload: {
  name: string;
  unit: string;
  price: number;
  vendor: string;
}): Promise<CostItem> {
  const { data } = await api.post<{ material?: MaterialApiItem } & Partial<MaterialApiItem>>(
    "/material",
    payload
  );
  const raw = (data.material ?? data) as MaterialApiItem;
  return mapMaterialApiItem(raw);
}

async function updateMaterialApi(
  id: string,
  payload: { name: string; unit: string; price: number; vendor: string }
): Promise<CostItem> {
  const { data } = await api.patch<{ material?: MaterialApiItem } & Partial<MaterialApiItem>>(
    `/material/${id}`,
    payload
  );
  const raw = (data.material ?? data) as MaterialApiItem;
  return mapMaterialApiItem(raw);
}

async function deleteMaterialApi(id: string): Promise<void> {
  await api.delete(`/material/${id}`);
}

/* =========================================================================
 * Vehicle API (GET / POST / PATCH / DELETE) — server-side page/limit/search
 * ========================================================================= */

interface VehicleApiItem {
  id: number;
  type: string;
  depreciationRate: number;
  fuelEfficiency: number;
  avgFuelPrice: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface VehicleApiResponse {
  vehicle: {
    data: VehicleApiItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
}

const loadingVehicles = ref(false);

function mapVehicleApiItem(item: VehicleApiItem, displayIndex: number): VehicleItem {
  return {
    displayIndex,
    id: String(item.id),
    type: item.type,
    depreciationRate: item.depreciationRate,
    fuelEfficiency: item.fuelEfficiency,
    avgFuelPrice: item.avgFuelPrice
  };
}

async function fetchVehicles(params: FetchParams): Promise<void> {
  loadingVehicles.value = true;
  try {
    const { data } = await api.get<VehicleApiResponse>("/vehicle", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined
      }
    });
    const startIndex = (params.page - 1) * params.limit;
    vehicleItems.value = data.vehicle.data
      .filter(item => !item.deletedAt)
      .map((item, index) => mapVehicleApiItem(item, startIndex + index + 1));
    vehiclesTotal.value = data.vehicle.total;
  } catch (err) {
    console.error("โหลดข้อมูลค่าพาหนะ/น้ำมันไม่สำเร็จ", err);
    openNotify(
      false,
      apiErrorMessage(err, "โหลดข้อมูลค่าพาหนะ/น้ำมันไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
    );
  } finally {
    loadingVehicles.value = false;
  }
}

async function createVehicleApi(payload: {
  type: string;
  depreciationRate: number;
  fuelEfficiency: number;
  avgFuelPrice: number;
}): Promise<VehicleItem> {
  const { data } = await api.post<{ vehicle?: VehicleApiItem } & Partial<VehicleApiItem>>(
    "/vehicle",
    payload
  );
  const raw = (data.vehicle ?? data) as VehicleApiItem;
  return mapVehicleApiItem(raw);
}

async function updateVehicleApi(
  id: string,
  payload: {
    type: string;
    depreciationRate: number;
    fuelEfficiency: number;
    avgFuelPrice: number;
  }
): Promise<VehicleItem> {
  const { data } = await api.patch<{ vehicle?: VehicleApiItem } & Partial<VehicleApiItem>>(
    `/vehicle/${id}`,
    payload
  );
  const raw = (data.vehicle ?? data) as VehicleApiItem;
  return mapVehicleApiItem(raw);
}

async function deleteVehicleApi(id: string): Promise<void> {
  await api.delete(`/vehicle/${id}`);
}

/* =========================================================================
 * Labor (position) API (GET / POST / PATCH / DELETE) — server-side
 * page/limit/search
 * ========================================================================= */

interface PositionApiItem {
  id: number;
  position: string;
  dailyWage: number;
  hourlyWage: number;
  fieldAllowance: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PositionApiResponse {
  position: {
    data: PositionApiItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
}

const loadingPositions = ref(false);

function mapPositionApiItem(item: PositionApiItem, displayIndex: number): PositionItem {
  return {
    displayIndex,
    id: String(item.id),
    position: item.position,
    dailyWage: item.dailyWage,
    hourlyWage: item.hourlyWage,
    fieldAllowance: item.fieldAllowance
  };
}

async function fetchPositions(params: FetchParams): Promise<void> {
  loadingPositions.value = true;
  try {
    const { data } = await api.get<PositionApiResponse>("/position", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined
      }
    });
    const startIndex = (params.page - 1) * params.limit;
    positionItems.value = data.position.data
      .filter(item => !item.deletedAt)
      .map((item, index) => mapPositionApiItem(item, startIndex + index + 1));
    positionsTotal.value = data.position.total;
  } catch (err) {
    console.error("โหลดข้อมูลค่าแรงบุคลากรไม่สำเร็จ", err);
    openNotify(
      false,
      apiErrorMessage(err, "โหลดข้อมูลค่าแรงบุคลากรไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
    );
  } finally {
    loadingPositions.value = false;
  }
}

async function createPositionApi(payload: {
  position: string;
  dailyWage: number;
  hourlyWage: number;
  fieldAllowance: number;
}): Promise<PositionItem> {
  const { data } = await api.post<{ position?: PositionApiItem } & Partial<PositionApiItem>>(
    "/position",
    payload
  );
  const raw = (data.position ?? data) as PositionApiItem;
  return mapPositionApiItem(raw);
}

async function updatePositionApi(
  id: string,
  payload: {
    position: string;
    dailyWage: number;
    hourlyWage: number;
    fieldAllowance: number;
  }
): Promise<PositionItem> {
  const { data } = await api.patch<{ position?: PositionApiItem } & Partial<PositionApiItem>>(
    `/position/${id}`,
    payload
  );
  const raw = (data.position ?? data) as PositionApiItem;
  return mapPositionApiItem(raw);
}

async function deletePositionApi(id: string): Promise<void> {
  await api.delete(`/position/${id}`);
}

/* =========================================================================
 * Loading the active tab
 *
 * `loadActiveTab()` is the single entry point that fetches whichever tab
 * is active using the current page / rowsPerPage / search, then syncs
 * `tablePagination.rowsNumber` from the server's `total` so q-table's
 * built-in pagination footer reflects the real count instead of the
 * (page-sized) array that was just loaded.
 * ========================================================================= */

async function loadActiveTab(): Promise<void> {
  const params: FetchParams = {
    page: tablePagination.value.page,
    limit: tablePagination.value.rowsPerPage,
    search: searchQuery.value.trim()
  };

  if (activeTab.value === "vehicle") {
    await fetchVehicles(params);
  } else if (activeTab.value === "labor") {
    await fetchPositions(params);
  } else {
    await fetchMaterials(params);
  }

  tablePagination.value.rowsNumber = activeTotal.value;
}

// q-table's server-side pagination hook — fired on page change and
// rows-per-page change.
function onTableRequest(requestProp: {
  pagination: { page: number; rowsPerPage: number };
}): void {
  tablePagination.value.page = requestProp.pagination.page;
  tablePagination.value.rowsPerPage = requestProp.pagination.rowsPerPage;
  void loadActiveTab();
}

// Debounced search (the q-input carries debounce="400") — reset to page 1
// and refetch whenever the search term settles.
watch(searchQuery, () => {
  tablePagination.value.page = 1;
  void loadActiveTab();
});

function switchTab(id: TabId): void {
  activeTab.value = id;
  searchQuery.value = "";
  tablePagination.value.page = 1;
  tablePagination.value.rowsNumber = 0;
  // Vehicle and labor have no "unit" field/suggestions of their own.
  unitInputOptions.value =
    id === "vehicle" || id === "labor" ? [] : [...UNIT_SUGGESTIONS[id]];
  void loadActiveTab();
}

onMounted(() => {
  void loadActiveTab(); // loads the default tab (materials) only
});

onUnmounted(() => {
  if (notifyTimer) clearTimeout(notifyTimer);
});

/* =========================================================================
 * Table columns
 *
 * Columns power the q-table header only — every cell is rendered through
 * the custom `body` slot in the template. Search/pagination are now fully
 * server-side (see loadActiveTab/onTableRequest above), so there's no
 * client-side filtering left here.
 * ========================================================================= */

const ccColumns = computed(() => {
  if (activeTab.value === "vehicle") {
    return [
      { name: "no", label: "ลำดับ", field: "id", align: "left" as const },
      { name: "type", label: "ประเภทยานพาหนะ", field: "type", align: "left" as const },
      {
        name: "depreciationRate",
        label: "อัตราค่าเสื่อมราคา",
        field: "depreciationRate",
        align: "left" as const
      },
      {
        name: "fuelEfficiency",
        label: "อัตราสิ้นเปลืองน้ำมัน",
        field: "fuelEfficiency",
        align: "left" as const
      },
      {
        name: "avgFuelPrice",
        label: "ราคาน้ำมันเฉลี่ย (บาท/ลิตร)",
        field: "avgFuelPrice",
        align: "left" as const
      },
      { name: "actions", label: "การจัดการ", field: "id", align: "right" as const }
    ];
  }

  if (activeTab.value === "labor") {
    return [
      { name: "no", label: "ลำดับ", field: "id", align: "left" as const },
      { name: "position", label: "ตำแหน่ง", field: "position", align: "left" as const },
      {
        name: "dailyWage",
        label: "ค่าแรงต่อวัน (บาท)",
        field: "dailyWage",
        align: "left" as const
      },
      {
        name: "hourlyWage",
        label: "ค่าแรงต่อชั่วโมง (บาท)",
        field: "hourlyWage",
        align: "left" as const
      },
      {
        name: "fieldAllowance",
        label: "ค่าตอบแทนออกพื้นที่ (บาท)",
        field: "fieldAllowance",
        align: "left" as const
      },
      { name: "actions", label: "การจัดการ", field: "id", align: "right" as const }
    ];
  }

  return [
    { name: "no", label: "ลำดับ", field: "id", align: "left" as const },
    { name: "code", label: "รหัสรายการ", field: "code", align: "left" as const },
    { name: "name", label: "รายการ", field: "name", align: "left" as const },
    { name: "unit", label: "หน่วยนับ", field: "unit", align: "left" as const },
    {
      name: "price",
      label: "ราคาอ้างอิง (บาท)",
      field: "price",
      align: "left" as const
    },
    {
      name: "vendor",
      label: activeTabConfig.value.vendorLabel,
      field: "vendor",
      align: "left" as const
    },
    { name: "actions", label: "การจัดการ", field: "id", align: "right" as const }
  ];
});

/* =========================================================================
 * Unit/price display + formatting helpers
 * ========================================================================= */

const unitInputOptions = ref<string[]>([...UNIT_SUGGESTIONS.materials]);

function filterUnitOptions(
  val: string,
  update: (cb: () => void) => void
): void {
  update(() => {
    if (activeTab.value === "vehicle" || activeTab.value === "labor") {
      unitInputOptions.value = [];
      return;
    }
    const base = UNIT_SUGGESTIONS[activeTab.value as CostTabId];
    const needle = val.toLowerCase();
    unitInputOptions.value = base.filter(u => u.toLowerCase().includes(needle));
  });
}

// Thousands separator + up to 2 decimals, e.g. 1234.5 -> "1,234.50".
// Drops trailing zeros only when the value is a whole number.
function formatPrice(value: number): string {
  const hasDecimals = value % 1 !== 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function saveCatalog(): void {
  openNotify(true, `บันทึกรายการต้นทุน — ${activeTabConfig.value.label} สำเร็จ`);
}

/* =========================================================================
 * Create / edit dialog
 * ========================================================================= */

interface ItemForm {
  name: string;
  unit: string;
  price: number | null;
  vendor: string;
}

function emptyForm(): ItemForm {
  return { name: "", unit: "", price: null, vendor: "" };
}

interface VehicleForm {
  type: string;
  depreciationRate: number | null;
  fuelEfficiency: number | null;
  avgFuelPrice: number | null;
}

function emptyVehicleForm(): VehicleForm {
  return {
    type: "",
    depreciationRate: null,
    fuelEfficiency: null,
    avgFuelPrice: null
  };
}

interface PositionForm {
  position: string;
  dailyWage: number | null;
  hourlyWage: number | null;
  fieldAllowance: number | null;
}

function emptyPositionForm(): PositionForm {
  return {
    position: "",
    dailyWage: null,
    hourlyWage: null,
    fieldAllowance: null
  };
}

const dialogOpen = ref(false);
const editingItem = ref<CostItem | VehicleItem | PositionItem | null>(null);
const savingItem = ref(false);
const form = reactive<ItemForm>(emptyForm());
const vehicleForm = reactive<VehicleForm>(emptyVehicleForm());
const positionForm = reactive<PositionForm>(emptyPositionForm());

// `priceDisplay` is what the digit-only text input actually binds to
// (see onPriceKeydown/onPricePaste above); it's kept in sync with
// `form.price` (the number | null used for validation and the API
// payload) in both directions so opening the edit dialog pre-fills it
// and typing in it updates form.price for saveItem()/validation to use.
const priceDisplay = ref("");

watch(priceDisplay, val => {
  form.price = val === "" ? null : Number(val);
});

function openCreateDialog(): void {
  editingItem.value = null;
  if (activeTab.value === "vehicle") {
    Object.assign(vehicleForm, emptyVehicleForm());
  } else if (activeTab.value === "labor") {
    Object.assign(positionForm, emptyPositionForm());
  } else {
    Object.assign(form, emptyForm());
    priceDisplay.value = "";
    unitInputOptions.value = UNIT_SUGGESTIONS[activeTab.value as CostTabId];
  }
  dialogOpen.value = true;
}

function openEditDialog(item: CostItem | VehicleItem | PositionItem): void {
  editingItem.value = item;
  if (activeTab.value === "vehicle") {
    const vehicle = item as VehicleItem;
    Object.assign(vehicleForm, {
      type: vehicle.type,
      depreciationRate: vehicle.depreciationRate,
      fuelEfficiency: vehicle.fuelEfficiency,
      avgFuelPrice: vehicle.avgFuelPrice
    });
  } else if (activeTab.value === "labor") {
    const positionItem = item as PositionItem;
    Object.assign(positionForm, {
      position: positionItem.position,
      dailyWage: positionItem.dailyWage,
      hourlyWage: positionItem.hourlyWage,
      fieldAllowance: positionItem.fieldAllowance
    });
  } else {
    const costItem = item as CostItem;
    Object.assign(form, {
      name: costItem.name,
      unit: costItem.unit,
      price: costItem.price,
      vendor: costItem.vendor
    });
    priceDisplay.value = String(costItem.price);
    unitInputOptions.value = UNIT_SUGGESTIONS[activeTab.value as CostTabId];
  }
  dialogOpen.value = true;
}

function closeDialog(): void {
  if (savingItem.value) return;
  dialogOpen.value = false;
}

async function saveItem(): Promise<void> {
  const tabId = activeTab.value;

  if (tabId === "vehicle") {
    if (!vehicleForm.type.trim()) {
      openNotify(false, "กรุณากรอกประเภทยานพาหนะ");
      return;
    }
    if (
      vehicleForm.depreciationRate === null ||
      Number.isNaN(vehicleForm.depreciationRate) ||
      vehicleForm.depreciationRate < 0
    ) {
      openNotify(false, "กรุณากรอกอัตราค่าเสื่อมราคาให้ถูกต้อง");
      return;
    }
    if (
      vehicleForm.fuelEfficiency === null ||
      Number.isNaN(vehicleForm.fuelEfficiency) ||
      vehicleForm.fuelEfficiency < 0
    ) {
      openNotify(false, "กรุณากรอกอัตราสิ้นเปลืองน้ำมันให้ถูกต้อง");
      return;
    }
    if (
      vehicleForm.avgFuelPrice === null ||
      Number.isNaN(vehicleForm.avgFuelPrice) ||
      vehicleForm.avgFuelPrice < 0
    ) {
      openNotify(false, "กรุณากรอกราคาน้ำมันเฉลี่ยให้ถูกต้อง");
      return;
    }

    if (editingItem.value) {
      const editing = editingItem.value as VehicleItem;
      savingItem.value = true;
      try {
        const updated = await updateVehicleApi(editing.id, {
          type: vehicleForm.type.trim(),
          depreciationRate: vehicleForm.depreciationRate,
          fuelEfficiency: vehicleForm.fuelEfficiency,
          avgFuelPrice: vehicleForm.avgFuelPrice
        });
        openNotify(true, `บันทึกการแก้ไข ${updated.type} สำเร็จ`);
        dialogOpen.value = false;
        await loadActiveTab();
      } catch (err) {
        console.error("แก้ไขรายการพาหนะไม่สำเร็จ", err);
        openNotify(
          false,
          apiErrorMessage(err, "แก้ไขรายการพาหนะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
        );
      } finally {
        savingItem.value = false;
      }
      return;
    }

    savingItem.value = true;
    try {
      const created = await createVehicleApi({
        type: vehicleForm.type.trim(),
        depreciationRate: vehicleForm.depreciationRate,
        fuelEfficiency: vehicleForm.fuelEfficiency,
        avgFuelPrice: vehicleForm.avgFuelPrice
      });
      openNotify(true, `เพิ่ม ${created.type} สำเร็จ`);
      dialogOpen.value = false;
      // Jump to page 1 so the newly-created row is visible even if the
      // user was deep in pagination when they created it.
      tablePagination.value.page = 1;
      await loadActiveTab();
    } catch (err) {
      console.error("เพิ่มรายการพาหนะไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "เพิ่มรายการพาหนะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      savingItem.value = false;
    }
    return;
  }

  if (tabId === "labor") {
    if (!positionForm.position.trim()) {
      openNotify(false, "กรุณากรอกตำแหน่ง");
      return;
    }
    if (
      positionForm.dailyWage === null ||
      Number.isNaN(positionForm.dailyWage) ||
      positionForm.dailyWage < 0
    ) {
      openNotify(false, "กรุณากรอกค่าแรงต่อวันให้ถูกต้อง");
      return;
    }
    if (
      positionForm.hourlyWage === null ||
      Number.isNaN(positionForm.hourlyWage) ||
      positionForm.hourlyWage < 0
    ) {
      openNotify(false, "กรุณากรอกค่าแรงต่อชั่วโมงให้ถูกต้อง");
      return;
    }
    if (
      positionForm.fieldAllowance === null ||
      Number.isNaN(positionForm.fieldAllowance) ||
      positionForm.fieldAllowance < 0
    ) {
      openNotify(false, "กรุณากรอกค่าตอบแทนออกพื้นที่ให้ถูกต้อง");
      return;
    }

    if (editingItem.value) {
      const editing = editingItem.value as PositionItem;
      savingItem.value = true;
      try {
        const updated = await updatePositionApi(editing.id, {
          position: positionForm.position.trim(),
          dailyWage: positionForm.dailyWage,
          hourlyWage: positionForm.hourlyWage,
          fieldAllowance: positionForm.fieldAllowance
        });
        openNotify(true, `บันทึกการแก้ไข ${updated.position} สำเร็จ`);
        dialogOpen.value = false;
        await loadActiveTab();
      } catch (err) {
        console.error("แก้ไขรายการค่าแรงไม่สำเร็จ", err);
        openNotify(
          false,
          apiErrorMessage(err, "แก้ไขรายการค่าแรงไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
        );
      } finally {
        savingItem.value = false;
      }
      return;
    }

    savingItem.value = true;
    try {
      const created = await createPositionApi({
        position: positionForm.position.trim(),
        dailyWage: positionForm.dailyWage,
        hourlyWage: positionForm.hourlyWage,
        fieldAllowance: positionForm.fieldAllowance
      });
      openNotify(true, `เพิ่ม ${created.position} สำเร็จ`);
      dialogOpen.value = false;
      tablePagination.value.page = 1;
      await loadActiveTab();
    } catch (err) {
      console.error("เพิ่มรายการค่าแรงไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "เพิ่มรายการค่าแรงไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      savingItem.value = false;
    }
    return;
  }

  // tabId === "materials"
  if (!form.name.trim()) {
    openNotify(false, "กรุณากรอกชื่อรายการ");
    return;
  }
  if (!form.unit.trim()) {
    openNotify(false, "กรุณาเลือกหรือระบุหน่วย");
    return;
  }
  if (form.price === null || Number.isNaN(form.price) || form.price < 0) {
    openNotify(false, "กรุณากรอกราคาอ้างอิงให้ถูกต้อง");
    return;
  }

  if (editingItem.value) {
    const editing = editingItem.value as CostItem;
    savingItem.value = true;
    try {
      const updated = await updateMaterialApi(editing.id, {
        name: form.name.trim(),
        unit: form.unit.trim(),
        price: form.price,
        vendor: form.vendor.trim()
      });
      openNotify(true, `บันทึกการแก้ไข ${updated.code} สำเร็จ`);
      dialogOpen.value = false;
      await loadActiveTab();
    } catch (err) {
      console.error("แก้ไขรายการวัสดุไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "แก้ไขรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      savingItem.value = false;
    }
    return;
  }

  savingItem.value = true;
  try {
    const created = await createMaterialApi({
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: form.price,
      vendor: form.vendor.trim()
    });
    openNotify(true, `เพิ่ม ${created.code} สำเร็จ`);
    dialogOpen.value = false;
    tablePagination.value.page = 1;
    await loadActiveTab();
  } catch (err) {
    console.error("เพิ่มรายการวัสดุไม่สำเร็จ", err);
    openNotify(false, apiErrorMessage(err, "เพิ่มรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  } finally {
    savingItem.value = false;
  }
}

/* =========================================================================
 * Delete item
 *
 * All three tabs delete on the backend: DELETE {{baseURL}}/material/{:id},
 * DELETE {{baseURL}}/vehicle/{:id}, DELETE {{baseURL}}/position/{:id}.
 * After a successful delete, if the deleted row was the last one on the
 * current page (and it wasn't page 1), step back a page before refetching
 * — otherwise the user would land on a page the server now considers
 * empty.
 * ========================================================================= */

const deleteDialogOpen = ref(false);
const itemPendingDelete = ref<CostItem | VehicleItem | PositionItem | null>(null);
const deletingItem = ref(false);

const deleteItemLabel = computed(() => {
  const item = itemPendingDelete.value;
  if (!item) return "";
  if (activeTab.value === "vehicle") {
    return (item as VehicleItem).type;
  }
  if (activeTab.value === "labor") {
    return (item as PositionItem).position;
  }
  const costItem = item as CostItem;
  return `${costItem.code} — ${costItem.name}`;
});

function requestDelete(item: CostItem | VehicleItem | PositionItem): void {
  itemPendingDelete.value = item;
  deleteDialogOpen.value = true;
}

function cancelDelete(): void {
  if (deletingItem.value) return;
  deleteDialogOpen.value = false;
  itemPendingDelete.value = null;
}

function stepBackIfPageEmptied(): void {
  const wasOnlyItemOnPage = activeItems.value.length === 1;
  if (wasOnlyItemOnPage && tablePagination.value.page > 1) {
    tablePagination.value.page -= 1;
  }
}

async function confirmDelete(): Promise<void> {
  if (!itemPendingDelete.value) return;
  const tabId = activeTab.value;

  if (tabId === "materials") {
    const { id, code } = itemPendingDelete.value as CostItem;
    deletingItem.value = true;
    try {
      await deleteMaterialApi(id);
      openNotify(true, `ลบ ${code} สำเร็จ`);
      deleteDialogOpen.value = false;
      itemPendingDelete.value = null;
      stepBackIfPageEmptied();
      await loadActiveTab();
    } catch (err) {
      console.error("ลบรายการวัสดุไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "ลบรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      deletingItem.value = false;
    }
    return;
  }

  if (tabId === "vehicle") {
    const { id, type } = itemPendingDelete.value as VehicleItem;
    deletingItem.value = true;
    try {
      await deleteVehicleApi(id);
      openNotify(true, `ลบ ${type} สำเร็จ`);
      deleteDialogOpen.value = false;
      itemPendingDelete.value = null;
      stepBackIfPageEmptied();
      await loadActiveTab();
    } catch (err) {
      console.error("ลบรายการพาหนะไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "ลบรายการพาหนะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      deletingItem.value = false;
    }
    return;
  }

  // tabId === "labor"
  const { id, position } = itemPendingDelete.value as PositionItem;
  deletingItem.value = true;
  try {
    await deletePositionApi(id);
    openNotify(true, `ลบ ${position} สำเร็จ`);
    deleteDialogOpen.value = false;
    itemPendingDelete.value = null;
    stepBackIfPageEmptied();
    await loadActiveTab();
  } catch (err) {
    console.error("ลบรายการค่าแรงไม่สำเร็จ", err);
    openNotify(false, apiErrorMessage(err, "ลบรายการค่าแรงไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  } finally {
    deletingItem.value = false;
  }
}
</script>

<style scoped>
.cc-page {
  background: #f5f7fa;
  padding: 20px 16px 40px;
  overflow-x: hidden;
}

.cc-container {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Header (light) ===== */
.cc-header-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 14px;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.cc-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e6f0fb;
  color: #1e6fd9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.cc-header-text {
  min-width: 0;
}

.cc-header-title {
  font-size: 1rem;
  font-weight: 800;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.cc-header-title-en {
  font-weight: 600;
  color: #6b7280;
}

.cc-header-sub {
  font-size: 0.8rem;
  color: #8a94a3;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.cc-header-toggle {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cc-toggle-btn {
  font-size: 0.76rem;
  font-weight: 600;
  border-radius: 8px;
  color: #6b7280;
  background: #ffffff;
  border: 1px solid #e6e9ee;
  min-height: 40px;
  padding: 0 14px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.cc-toggle-btn :deep(.q-btn__content) {
  line-height: 1.25;
}

.cc-toggle-btn--active {
  background: #17a865;
  color: #ffffff;
  border-color: #17a865;
}

/* ===== Catalog header card ===== */
.cc-catalog-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cc-catalog-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cc-catalog-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #e6f0fb;
  color: #2f6feb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.cc-catalog-text {
  min-width: 0;
  flex: 1 1 auto;
}

.cc-catalog-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.cc-catalog-title-en {
  font-weight: 600;
  color: #8a94a3;
  margin-left: 4px;
  font-size: 0.82rem;
}

.cc-catalog-sub {
  font-size: 0.76rem;
  color: #8a94a3;
  overflow-wrap: anywhere;
}

.cc-catalog-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: none;
}

.cc-catalog-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: #8a94a3;
  white-space: nowrap;
}

.cc-primary-btn {
  background: #2f6feb;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 16px;
}

.cc-secondary-btn {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0 8px;
}

/* ===== Search + filter row ===== */
.cc-filter-row {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.cc-filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 260px;
}

.cc-filter-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: #6b7280;
}

.cc-search-input {
  width: 100%;
}

.cc-clear-filters-btn {
  font-size: 0.76rem;
  font-weight: 600;
  color: #8a94a3;
  flex: none;
  margin-bottom: 2px;
}

/* ===== Loading state ===== */
.cc-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
}

.cc-loading-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: #8a94a3;
}

/* ===== Desktop / tablet table (row-mode q-table) ===== */
.cc-qtable {
  background: #ffffff;
  margin-top: 6px;
}

.cc-qtable :deep(thead tr) {
  background: #eef1f6;
}

.cc-qtable :deep(thead th) {
  font-size: 0.74rem;
  font-weight: 700;
  color: #4b5563;
  white-space: nowrap;
}

.cc-qtable :deep(tbody td) {
  vertical-align: middle;
  border-color: #eef0f3;
}

.cc-qtable :deep(tbody tr:hover) {
  background: #fafbfc;
}

.cc-qtable :deep(.q-table__bottom) {
  color: #6b7280;
  font-size: 0.78rem;
  border-color: #eef0f3;
}

.cc-td-no {
  font-size: 0.82rem;
  font-weight: 600;
  color: #8a94a3;
  width: 48px;
}

.cc-td-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: #1a1f27;
  min-width: 240px;
  overflow-wrap: anywhere;
}

.cc-td-vendor {
  font-size: 0.82rem;
  color: #4b5563;
  white-space: nowrap;
}

.cc-code-text {
  font-size: 0.82rem;
  font-weight: 700;
  color: #2f6feb;
  white-space: nowrap;
}

.cc-unit-text {
  font-size: 0.84rem;
  color: #374151;
}

.cc-price-box {
  display: inline-flex;
  align-items: center;
  font-size: 0.84rem;
  font-weight: 700;
  color: #1a1f27;
  white-space: nowrap;
  background: #ffffff;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  padding: 7px 12px;
  min-width: 84px;
}

.cc-td-actions {
  text-align: right;
  white-space: nowrap;
}

.cc-row-edit-btn {
  color: #2f6feb;
}

.cc-row-delete-btn {
  color: #dc2626;
}

/* ===== Table horizontal scroll wrapper ===== */
.cc-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* ===== Empty state ===== */
.cc-empty-state {
  background: #ffffff;
  border: 1px dashed #d7dce3;
  border-radius: 12px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.cc-empty-icon {
  color: #b3bac5;
  margin-bottom: 4px;
}

.cc-empty-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1a1f27;
}

.cc-empty-sub {
  font-size: 0.78rem;
  color: #8a94a3;
}

.cc-empty-clear-btn {
  margin-top: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1e6fd9;
}

/* ===== Create/edit dialog ===== */
.cc-item-dialog {
  width: 100%;
  max-width: 560px;
}

.cc-item-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef0f3;
}

.cc-item-dialog-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: #1a1f27;
}

.cc-item-dialog-body {
  max-height: 65vh;
  overflow-y: auto;
}

.cc-dialog-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cc-dialog-field {
  margin-bottom: 12px;
}

.cc-item-dialog-actions {
  border-top: 1px solid #eef0f3;
}

/* ===== Delete confirmation dialog ===== */
.cc-delete-dialog {
  width: 100%;
  max-width: 400px;
}

.cc-delete-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-top: 24px;
}

.cc-delete-dialog-icon {
  color: #f5a524;
  margin-bottom: 4px;
}

.cc-delete-dialog-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: #1a1f27;
}

.cc-delete-dialog-desc {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.5;
}

.cc-delete-dialog-actions {
  border-top: 1px solid #eef0f3;
}

.cc-confirm-delete-btn {
  background: #e5484d;
  color: #ffffff;
  font-weight: 700;
}

/* ===== Tablet (600px–960px) ===== */
@media (max-width: 960px) {
  .cc-header-card {
    grid-template-columns: 40px minmax(0, 1fr);
    row-gap: 12px;
  }

  .cc-header-toggle {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

/* ===== Mobile (<600px) ===== */
@media (max-width: 599px) {
  .cc-page {
    padding: 14px 10px 28px;
  }

  .cc-header-card {
    padding: 14px 16px;
  }

  .cc-header-title {
    font-size: 0.88rem;
  }

  .cc-header-title-en {
    display: block;
    font-size: 0.72rem;
    margin-top: 2px;
  }

  .cc-header-sub {
    font-size: 0.72rem;
  }

  .cc-header-toggle {
    flex-direction: column;
    align-items: stretch;
  }

  .cc-toggle-btn {
    width: 100%;
    justify-content: flex-start;
  }

  .cc-catalog-header-row {
    flex-wrap: wrap;
  }

  .cc-catalog-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .cc-primary-btn,
  .cc-secondary-btn {
    width: 100%;
  }

  .cc-filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .cc-filter-field {
    flex: none;
    width: 100%;
  }

  .cc-clear-filters-btn {
    width: 100%;
    margin-bottom: 0;
  }

  .cc-qtable :deep(th),
  .cc-qtable :deep(td) {
    padding: 8px 10px;
    font-size: 0.78rem;
  }

  .cc-td-name {
    min-width: 160px;
  }

  .cc-price-box {
    font-size: 0.78rem;
    padding: 5px 10px;
    min-width: 68px;
  }

  .cc-dialog-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}
</style>