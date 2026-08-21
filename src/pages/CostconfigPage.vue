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
            <span class="cc-catalog-count">{{ filteredItems.length }} รายการ</span>
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

        <!-- Loading state (materials and vehicle fetch from the backend;
             labor stays instant since it's still local seed data). -->
        <div v-if="isLoadingActiveTab" class="cc-loading-state">
          <q-spinner-dots size="32px" color="primary" />
          <div class="cc-loading-text">กำลังโหลดข้อมูล...</div>
        </div>

        <div v-else-if="filteredItems.length" class="cc-table-scroll">
        <q-table
          flat
          :rows="filteredItems"
          :columns="ccColumns"
          row-key="id"
          v-model:pagination="tablePagination"
          :rows-per-page-options="[5, 10, 20, 50]"
          rows-per-page-label="Records per page:"
          class="cc-qtable cc-desktop-table"
        >
          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="no" :props="props" class="cc-td-no">
                {{
                  (tablePagination.page - 1) * tablePagination.rowsPerPage +
                  props.rowIndex +
                  1
                }}
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
        v-if="!isLoadingActiveTab && !filteredItems.length && hasActiveFilters"
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
        v-else-if="!isLoadingActiveTab && !filteredItems.length"
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
                suffix="% /ปี"
                v-model.number="vehicleForm.depreciationRate"
                label="อัตราค่าเสื่อมราคา *"
                class="cc-dialog-field"
              />
              <q-input
                dense
                outlined
                type="number"
                suffix="กม./ลิตร"
                v-model.number="vehicleForm.fuelEfficiency"
                label="อัตราสิ้นเปลืองน้ำมัน *"
                class="cc-dialog-field"
              />
            </div>

            <q-input
              dense
              outlined
              type="number"
              prefix="฿"
              suffix="/ลิตร"
              v-model.number="vehicleForm.avgFuelPrice"
              label="ราคาน้ำมันเฉลี่ย *"
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
              <q-input
                dense
                outlined
                type="number"
                prefix="฿"
                v-model.number="form.price"
                label="ราคาอ้างอิง (บาท) *"
                class="cc-dialog-field"
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
import { api } from "@/boot/axios";
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
 * Tabs
 *
 * Materials and labor share the same data shape — code, name, unit,
 * reference price, and a "vendor" style field whose label changes per tab
 * (supplier for materials, agency for labor). One generic list + dialog
 * implementation drives both of them.
 *
 * Vehicle is different: GET {{baseURL}}/vehicle returns its own shape
 * (type, depreciationRate, fuelEfficiency, avgFuelPrice — see
 * VehicleItem below) instead of code/name/unit/price/vendor, so it gets
 * its own table columns, search behavior, and create/edit form fields
 * (see the `activeTab === 'vehicle'` branches throughout this file).
 *
 * The "materials" tab's data comes from GET {{baseURL}}/material — see
 * fetchMaterials() below. Create (POST), update (PATCH), and delete
 * (DELETE) are all wired up to the backend for materials. The "vehicle"
 * tab's data comes from GET {{baseURL}}/vehicle — see fetchVehicles()
 * below — but create/update/delete aren't wired up yet (no endpoint), so
 * those stay local-only for now, same as labor.
 * ========================================================================= */

type TabId = "materials" | "labor" | "vehicle";

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  codePrefix: string;
  vendorLabel: string;
  // Catalog header card shown above the table — title/subtitle/button
  // wording specific to this tab's catalog (e.g. "Material & Reagents
  // Catalog" for materials), distinct from the generic page header above.
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

function switchTab(id: TabId): void {
  activeTab.value = id;
  clearFilters();
  // FIX: the inline unit autocomplete option list was left holding the
  // *previous* tab's suggestions until the user typed into a filter box.
  // Reset it here so switching tabs immediately shows the right
  // suggestions. Vehicle has no "unit" field/suggestions of its own.
  unitInputOptions.value = id === "vehicle" ? [] : [...UNIT_SUGGESTIONS[id]];
}

/* =========================================================================
 * Cost items (materials + labor)
 * ========================================================================= */

// The two tabs still driven by the generic name/unit/price/vendor form.
type CostTabId = "materials" | "labor";

interface CostItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  vendor: string;
}

// Suggested units per tab — shown as autocomplete options in the
// create/edit dialog and inline unit select. Users can still type a new
// value that isn't in this list (new-value-mode="add-unique"). Vehicle
// isn't here — it has no "unit" field in its own shape (see VehicleItem).
const UNIT_SUGGESTIONS: Record<CostTabId, string[]> = {
  materials: ["เทสต์", "ชุด", "แผ่น", "หลอด", "ภาพ", "คน", "ขวด", "กล่อง"],
  labor: ["ต่อชม.", "ต่อกะ", "ต่อวัน", "ต่อเที่ยว"]
};

const costData = reactive<Record<CostTabId, CostItem[]>>({
  // Populated by fetchMaterials() on mount — starts empty instead of
  // seeded mock data now that this tab is backend-driven.
  materials: [],
  labor: [
    {
      id: "lab-1",
      code: "LAB-001",
      name: "แพทย์ตรวจร่างกาย",
      unit: "ต่อกะ",
      price: 2500.0,
      vendor: "กลุ่มงานเวชกรรม รพ.ปะเหลียน"
    },
    {
      id: "lab-2",
      code: "LAB-002",
      name: "พยาบาลวิชาชีพ",
      unit: "ต่อกะ",
      price: 900.0,
      vendor: "กลุ่มงานการพยาบาล"
    },
    {
      id: "lab-3",
      code: "LAB-003",
      name: "นักเทคนิคการแพทย์ (เจาะเลือด)",
      unit: "ต่อกะ",
      price: 800.0,
      vendor: "กลุ่มงานเทคนิคการแพทย์"
    }
  ]
});

/* =========================================================================
 * Vehicle items
 *
 * GET {{baseURL}}/vehicle returns a different shape than materials/labor
 * (type / depreciationRate / fuelEfficiency / avgFuelPrice, no code, unit,
 * or vendor), so vehicle rows live in their own array instead of
 * `costData`, populated by fetchVehicles() below. Create/update/delete
 * aren't wired up to a backend endpoint yet, so those still mutate this
 * array locally, same as labor currently does for its own tab.
 * ========================================================================= */

interface VehicleItem {
  id: string;
  type: string;
  depreciationRate: number;
  fuelEfficiency: number;
  avgFuelPrice: number;
}

const vehicleItems = ref<VehicleItem[]>([]);

const activeItems = computed<(CostItem | VehicleItem)[]>(() => {
  if (activeTab.value === "vehicle") return vehicleItems.value;
  return costData[activeTab.value as CostTabId];
});

/* =========================================================================
 * Materials API (GET / POST / PATCH / DELETE)
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

// Materials and vehicle are both backend-driven now, so the loading state
// gates whichever of those two tabs is active; labor stays instant.
const isLoadingActiveTab = computed(
  () =>
    (activeTab.value === "materials" && loadingMaterials.value) ||
    (activeTab.value === "vehicle" && loadingVehicles.value)
);

function mapMaterialApiItem(item: MaterialApiItem): CostItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    unit: item.unit,
    price: item.price,
    vendor: item.vendor
  };
}

async function fetchMaterials(): Promise<void> {
  loadingMaterials.value = true;
  try {
    // limit set high so the client-side search/pagination below (shared
    // with the labor/vehicle mock-data tabs) has the full data set to
    // work with. Move to real server-side pagination once the materials
    // catalog grows past a page or two.
    const { data } = await api.get<MaterialApiResponse>("/material", {
      params: { limit: 1000 }
    });
    costData.materials = data.material.data
      .filter(item => !item.deletedAt)
      .map(mapMaterialApiItem);
  } catch (err) {
    console.error("โหลดข้อมูลวัสดุไม่สำเร็จ", err);
    openNotify(false, apiErrorMessage(err, "โหลดข้อมูลวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  } finally {
    loadingMaterials.value = false;
  }
}

// Creates one material row on the backend (POST {{baseURL}}/material) and
// returns it mapped to the shared CostItem shape. The API generates the
// authoritative `code` (e.g. "MAT-0826-006") — the form no longer collects
// or previews a code for this reason (see cc-item-dialog above).
//
// Response shape is assumed to mirror fetchMaterials' wrapper convention
// ({ material: ... }); if the API ever returns the created row unwrapped
// instead, the `.material ??` fallback below still handles it.
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

// Updates one material row on the backend (PATCH {{baseURL}}/material/{:id})
// and returns it mapped to the shared CostItem shape.
//
// Response shape is assumed to mirror fetchMaterials'/createMaterialApi's
// wrapper convention ({ material: ... }); the `.material ??` fallback
// below handles an unwrapped response too.
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

// Deletes one material row on the backend (DELETE {{baseURL}}/material/{:id}).
async function deleteMaterialApi(id: string): Promise<void> {
  await api.delete(`/material/${id}`);
}

/* =========================================================================
 * Vehicle API (GET only for now)
 *
 * GET {{baseURL}}/vehicle returns type/depreciationRate/fuelEfficiency/
 * avgFuelPrice instead of code/name/unit/price/vendor — see VehicleItem
 * above. No POST/PATCH/DELETE endpoint exists yet, so create/edit/delete
 * on this tab still mutate `vehicleItems` locally (see saveItem/
 * confirmDelete below), same as labor currently does for its own tab.
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

function mapVehicleApiItem(item: VehicleApiItem): VehicleItem {
  return {
    id: String(item.id),
    type: item.type,
    depreciationRate: item.depreciationRate,
    fuelEfficiency: item.fuelEfficiency,
    avgFuelPrice: item.avgFuelPrice
  };
}

async function fetchVehicles(): Promise<void> {
  loadingVehicles.value = true;
  try {
    // limit set high for the same reason as fetchMaterials — the
    // client-side search/pagination below wants the full data set.
    const { data } = await api.get<VehicleApiResponse>("/vehicle", {
      params: { limit: 1000 }
    });
    vehicleItems.value = data.vehicle.data
      .filter(item => !item.deletedAt)
      .map(mapVehicleApiItem);
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

onMounted(() => {
  void fetchMaterials();
  void fetchVehicles();
});

onUnmounted(() => {
  if (notifyTimer) clearTimeout(notifyTimer);
});

/* =========================================================================
 * Search filtering (scoped to the active tab)
 * ========================================================================= */

const searchQuery = ref("");

const hasActiveFilters = computed(() => searchQuery.value.trim().length > 0);

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return activeItems.value;

  if (activeTab.value === "vehicle") {
    return vehicleItems.value.filter(item => item.type.toLowerCase().includes(q));
  }

  return costData[activeTab.value as CostTabId].filter(
    item =>
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.vendor.toLowerCase().includes(q)
  );
});

function clearFilters(): void {
  searchQuery.value = "";
}

/* =========================================================================
 * Table columns + pagination
 *
 * Columns power the q-table header only — every cell is rendered through
 * the custom `body` slot in the template (inline-editable unit/price,
 * action buttons), same as the reimbursement matrix. The same q-table now
 * renders on every screen size (see .cc-table-scroll), so its built-in
 * pagination footer is the only pager needed. `tablePagination` resets to
 * page 1 whenever the search or active tab changes so it never points
 * past the end of a newly-narrowed list.
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

const tablePagination = ref({ page: 1, rowsPerPage: 10 });

watch([searchQuery, activeTab], () => {
  tablePagination.value.page = 1;
});

// FIX: deleting the last item on the last page (or shrinking rowsPerPage)
// used to leave `tablePagination.page` pointing past the new last page,
// showing a blank table/card list until the user manually paged back.
// Clamp it whenever the filtered list size changes.
watch(filteredItems, () => {
  const maxPage = Math.max(
    1,
    Math.ceil(filteredItems.value.length / tablePagination.value.rowsPerPage)
  );
  if (tablePagination.value.page > maxPage) {
    tablePagination.value.page = maxPage;
  }
});

/* =========================================================================
 * Unit/price display
 *
 * The table and mobile card list used to let you edit unit/price inline
 * (a q-select + q-input right in the row). That's been replaced with
 * plain read-only text — use the "แก้ไข" button to open the dialog
 * instead. unitInputOptions/filterUnitOptions are still used there, for
 * the unit autocomplete field in the create/edit dialog.
 *
 * NOTE: for the materials tab, create (POST), update (PATCH), and delete
 * (DELETE) are all wired up to the /material API now.
 * ========================================================================= */

const unitInputOptions = ref<string[]>([...UNIT_SUGGESTIONS.materials]);

function filterUnitOptions(
  val: string,
  update: (cb: () => void) => void
): void {
  update(() => {
    if (activeTab.value === "vehicle") {
      unitInputOptions.value = [];
      return;
    }
    const base = UNIT_SUGGESTIONS[activeTab.value as CostTabId];
    const needle = val.toLowerCase();
    unitInputOptions.value = base.filter(u => u.toLowerCase().includes(needle));
  });
}

// Thousands separator + up to 2 decimals, e.g. 1234.5 -> "1,234.50".
// Drops trailing zeros only when the value is a whole number (4 -> "4",
// not "4.00"), which matches how the reference prices were entered.
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
 *
 * Materials/labor share the generic name/unit/price/vendor form (`form`
 * below). The dialog no longer collects a `code` for them — materials get
 * theirs from the backend on create; labor still gets one auto-assigned
 * locally (see nextItemCode below) since it doesn't have an API yet.
 *
 * Vehicle has its own form (`vehicleForm`) matching GET
 * {{baseURL}}/vehicle's shape (type/depreciationRate/fuelEfficiency/
 * avgFuelPrice) — see the `activeTab === 'vehicle'` template branch above.
 * ========================================================================= */

interface ItemForm {
  name: string;
  unit: string;
  price: number | null;
  vendor: string;
}

function emptyForm(): ItemForm {
  return {
    name: "",
    unit: "",
    price: null,
    vendor: ""
  };
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

// Next sequential code (LAB-001, ...) based on the highest number
// currently used within the active tab, so a new item never collides with
// an existing one even after items have been removed. Only used for the
// labor tab now — materials get their code from the API response on
// create (see createMaterialApi above), and vehicle rows don't have a
// `code` field at all.
function nextItemCode(tabId: CostTabId): string {
  const prefix = TABS.find(t => t.id === tabId)!.codePrefix;
  const usedNumbers = costData[tabId]
    .map(i => i.code.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1])
    .filter((n): n is string => !!n)
    .map(n => parseInt(n, 10));
  const highest = usedNumbers.length ? Math.max(...usedNumbers) : 0;
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

const dialogOpen = ref(false);
const editingItem = ref<CostItem | VehicleItem | null>(null);
const savingItem = ref(false);
const form = reactive<ItemForm>(emptyForm());
const vehicleForm = reactive<VehicleForm>(emptyVehicleForm());

function openCreateDialog(): void {
  editingItem.value = null;
  if (activeTab.value === "vehicle") {
    Object.assign(vehicleForm, emptyVehicleForm());
  } else {
    Object.assign(form, emptyForm());
    unitInputOptions.value = UNIT_SUGGESTIONS[activeTab.value as CostTabId];
  }
  dialogOpen.value = true;
}

function openEditDialog(item: CostItem | VehicleItem): void {
  editingItem.value = item;
  if (activeTab.value === "vehicle") {
    const vehicle = item as VehicleItem;
    Object.assign(vehicleForm, {
      type: vehicle.type,
      depreciationRate: vehicle.depreciationRate,
      fuelEfficiency: vehicle.fuelEfficiency,
      avgFuelPrice: vehicle.avgFuelPrice
    });
  } else {
    const costItem = item as CostItem;
    Object.assign(form, {
      name: costItem.name,
      unit: costItem.unit,
      price: costItem.price,
      vendor: costItem.vendor
    });
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

    // No POST/PATCH endpoint for vehicle yet — mutate vehicleItems
    // locally, same as labor does for its own tab.
    if (editingItem.value) {
      const editing = editingItem.value as VehicleItem;
      const target = vehicleItems.value.find(i => i.id === editing.id);
      if (target) {
        target.type = vehicleForm.type.trim();
        target.depreciationRate = vehicleForm.depreciationRate;
        target.fuelEfficiency = vehicleForm.fuelEfficiency;
        target.avgFuelPrice = vehicleForm.avgFuelPrice;
      }
      openNotify(true, `บันทึกการแก้ไข ${target?.type ?? ""} สำเร็จ`);
      dialogOpen.value = false;
      return;
    }

    // FIX: Date.now() alone can collide if two items are added within the
    // same millisecond — add a short random suffix so ids stay unique
    // (same pattern used for labor below).
    const id = `veh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    vehicleItems.value.push({
      id,
      type: vehicleForm.type.trim(),
      depreciationRate: vehicleForm.depreciationRate,
      fuelEfficiency: vehicleForm.fuelEfficiency,
      avgFuelPrice: vehicleForm.avgFuelPrice
    });
    openNotify(true, `เพิ่ม ${vehicleForm.type.trim()} สำเร็จ`);
    dialogOpen.value = false;
    return;
  }

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

    if (tabId === "materials") {
      // Materials edits go through PATCH {{baseURL}}/material/:id now.
      savingItem.value = true;
      try {
        const updated = await updateMaterialApi(editing.id, {
          name: form.name.trim(),
          unit: form.unit.trim(),
          price: form.price,
          vendor: form.vendor.trim()
        });
        const index = costData.materials.findIndex(i => i.id === editing.id);
        if (index !== -1) costData.materials[index] = updated;
        openNotify(true, `บันทึกการแก้ไข ${updated.code} สำเร็จ`);
        dialogOpen.value = false;
      } catch (err) {
        console.error("แก้ไขรายการวัสดุไม่สำเร็จ", err);
        openNotify(false, apiErrorMessage(err, "แก้ไขรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
      } finally {
        savingItem.value = false;
      }
      return;
    }

    // labor: still local-only, no backend endpoint yet.
    const target = costData.labor.find(i => i.id === editing.id);
    if (target) {
      target.name = form.name.trim();
      target.unit = form.unit.trim();
      target.price = form.price;
      target.vendor = form.vendor.trim();
    }
    openNotify(true, `บันทึกการแก้ไข ${target?.code ?? ""} สำเร็จ`);
    dialogOpen.value = false;
    return;
  }

  if (tabId === "materials") {
    savingItem.value = true;
    try {
      const created = await createMaterialApi({
        name: form.name.trim(),
        unit: form.unit.trim(),
        price: form.price,
        vendor: form.vendor.trim()
      });
      costData.materials.push(created);
      openNotify(true, `เพิ่ม ${created.code} สำเร็จ`);
      dialogOpen.value = false;
    } catch (err) {
      console.error("เพิ่มรายการวัสดุไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "เพิ่มรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      savingItem.value = false;
    }
    return;
  }

  // labor: still local-only, no backend endpoint yet.
  // FIX: Date.now() alone can collide if two items are added within the
  // same millisecond (e.g. scripted/rapid submissions). Add a short
  // random suffix so ids stay unique.
  const id = `${tabId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = nextItemCode(tabId as CostTabId);
  costData.labor.push({
    id,
    code,
    name: form.name.trim(),
    unit: form.unit.trim(),
    price: form.price,
    vendor: form.vendor.trim()
  });
  openNotify(true, `เพิ่ม ${code} สำเร็จ`);
  dialogOpen.value = false;
}

/* =========================================================================
 * Delete item
 *
 * Materials are deleted on the backend (DELETE {{baseURL}}/material/{:id})
 * via deleteMaterialApi(); labor and vehicle stay local-only since neither
 * has a delete endpoint yet. `deletingItem` gates the confirm dialog's
 * buttons so the user can't double-submit or dismiss mid-request.
 * ========================================================================= */

const deleteDialogOpen = ref(false);
const itemPendingDelete = ref<CostItem | VehicleItem | null>(null);
const deletingItem = ref(false);

// Label shown in the delete confirmation dialog — materials/labor show
// "code — name"; vehicle rows have neither, so they show just the type.
const deleteItemLabel = computed(() => {
  const item = itemPendingDelete.value;
  if (!item) return "";
  if (activeTab.value === "vehicle") {
    return (item as VehicleItem).type;
  }
  const costItem = item as CostItem;
  return `${costItem.code} — ${costItem.name}`;
});

function requestDelete(item: CostItem | VehicleItem): void {
  itemPendingDelete.value = item;
  deleteDialogOpen.value = true;
}

function cancelDelete(): void {
  if (deletingItem.value) return;
  deleteDialogOpen.value = false;
  itemPendingDelete.value = null;
}

async function confirmDelete(): Promise<void> {
  if (!itemPendingDelete.value) return;
  const tabId = activeTab.value;

  if (tabId === "materials") {
    const { id, code } = itemPendingDelete.value as CostItem;
    deletingItem.value = true;
    try {
      await deleteMaterialApi(id);
      costData.materials = costData.materials.filter(i => i.id !== id);
      openNotify(true, `ลบ ${code} สำเร็จ`);
      deleteDialogOpen.value = false;
      itemPendingDelete.value = null;
    } catch (err) {
      console.error("ลบรายการวัสดุไม่สำเร็จ", err);
      openNotify(false, apiErrorMessage(err, "ลบรายการวัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      deletingItem.value = false;
    }
    return;
  }

  if (tabId === "vehicle") {
    // No DELETE endpoint for vehicle yet — remove locally.
    const { id, type } = itemPendingDelete.value as VehicleItem;
    vehicleItems.value = vehicleItems.value.filter(i => i.id !== id);
    openNotify(true, `ลบ ${type} สำเร็จ`);
    deleteDialogOpen.value = false;
    itemPendingDelete.value = null;
    return;
  }

  // labor: still local-only, no backend endpoint yet.
  const { id, code } = itemPendingDelete.value as CostItem;
  costData.labor = costData.labor.filter(i => i.id !== id);
  openNotify(true, `ลบ ${code} สำเร็จ`);
  deleteDialogOpen.value = false;
  itemPendingDelete.value = null;
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

/* ===== Header (light) =====
   Matches the light header card style used elsewhere in the app (white
   background, light-blue icon box, dark title, green-when-active toggle
   buttons) instead of the previous dark navy gradient. */
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

/* ===== Catalog header card =====
   Light card above the table — icon + title (green, matching the brand
   accent) + subtitle (blue, matching the reimbursement matrix's sub-line
   style elsewhere) + item count + per-tab add/save buttons. */
.cc-catalog-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Single header row — icon + title on the left, count + actions on the
   right — matching the reference tracking table's header row. */
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

/* Primary CTA — solid blue button, matching the reference table's
   "+ เพิ่ม..." button. This is the dominant action in the header. */
.cc-primary-btn {
  background: #2f6feb;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 16px;
}

/* Secondary action — plain text button, demoted so the primary button
   stays the single visual focal point like the reference header. */
.cc-secondary-btn {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0 8px;
}

/* ===== Search + filter row =====
   No nested card/border — fields sit directly inside the catalog card,
   labeled above each input, matching the reference tracking table's
   filter-row layout exactly. */
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

/* ===== Desktop / tablet table (row-mode q-table) =====
   Light theme, matching the header/catalog cards above (previously this
   was a dark navy gradient to match a dark header — now that the header
   is light, the table follows suit so the whole page reads consistently). */
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

/* Plain bold blue text (no chip background), matching the reference
   table's clickable-looking code column. */
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

/* Bordered "input-style" box around the reference price, matching the
   reimbursement matrix's boxed price fields (white background, light
   gray border, rounded corners) instead of plain colored text. Used in
   both the desktop table and the mobile card list. */
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

/* ===== Table horizontal scroll wrapper =====
   The real q-table now renders on every screen size instead of swapping
   to stacked cards on mobile. On narrow viewports the table is wider
   than the screen, so this wrapper lets it scroll sideways (like the
   reference layout) rather than wrapping/collapsing awkwardly. */
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

  /* The table stays a real table on mobile now (no more card swap) —
     .cc-table-scroll handles the sideways scroll. Just tighten up the
     row height/columns a little so more fits on screen before scrolling
     kicks in, matching the reference layout's compact table. */
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