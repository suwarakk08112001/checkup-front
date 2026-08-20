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

        <!-- Loading state (currently only the materials tab fetches from
             the backend; labor/vehicle stay instant since they're still
             local seed data). -->
        <div v-if="isLoadingActiveTab" class="cc-loading-state">
          <q-spinner-dots size="32px" color="primary" />
          <div class="cc-loading-text">กำลังโหลดข้อมูล...</div>
        </div>

        <q-table
          v-else-if="filteredItems.length"
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
              <q-td key="code" :props="props" class="cc-td-code">
                <span class="cc-code-text">{{ props.row.code }}</span>
              </q-td>
              <q-td key="name" :props="props" class="cc-td-name">
                {{ props.row.name }}
              </q-td>
              <q-td key="unit" :props="props" class="cc-td-unit">
                <span class="cc-unit-text">{{ props.row.unit }}</span>
              </q-td>
              <q-td key="price" :props="props" class="cc-td-price">
                <span class="cc-price-text">฿{{ formatPrice(props.row.price) }}</span>
              </q-td>
              <q-td key="vendor" :props="props" class="cc-td-vendor">
                {{ props.row.vendor }}
              </q-td>
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

      <!-- ===== Mobile card list ===== -->
      <div
        v-if="!isLoadingActiveTab && filteredItems.length"
        class="cc-mobile-list"
      >
        <div
          v-for="item in pagedItems"
          :key="item.id"
          class="cc-mobile-card"
        >
          <div class="cc-mobile-card-top">
            <div>
              <span class="cc-code-text">{{ item.code }}</span>
              <div class="cc-item-title">{{ item.name }}</div>
            </div>
          </div>

          <div class="cc-mobile-vendor">{{ item.vendor }}</div>

          <div class="cc-mobile-fields">
            <div class="cc-mobile-field">
              <span class="cc-mobile-field-label">หน่วยนับ</span>
              <span class="cc-unit-text">{{ item.unit }}</span>
            </div>
            <div class="cc-mobile-field">
              <span class="cc-mobile-field-label">ราคาอ้างอิง</span>
              <span class="cc-price-text">฿{{ formatPrice(item.price) }}</span>
            </div>
          </div>

          <div class="cc-mobile-card-actions">
            <q-btn
              no-caps
              flat
              dense
              icon="delete_outline"
              label="ลบ"
              class="cc-row-delete-btn"
              @click="requestDelete(item)"
            />
            <q-btn
              no-caps
              flat
              dense
              icon="edit"
              label="แก้ไข"
              class="cc-row-edit-btn"
              @click="openEditDialog(item)"
            />
          </div>
        </div>

        <!-- The desktop table above renders its own pagination footer;
             on mobile that table is hidden (see cc-desktop-table media
             query), so the card list gets an equivalent pager here,
             reading/writing the same `tablePagination` state. -->
        <div class="cc-mobile-pagination-bar">
          <div class="cc-mobile-pagination-info">
            แสดง {{ pagedRangeStart }}–{{ pagedRangeEnd }} จาก
            {{ filteredItems.length }} รายการ
          </div>
          <q-pagination
            v-model="tablePagination.page"
            :max="mobileTotalPages"
            :max-pages="5"
            boundary-numbers
            direction-links
            dense
            color="primary"
            active-design="unelevated"
            class="cc-mobile-pagination-nav"
          />
        </div>
      </div>

      <!-- ===== Empty states ===== -->
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
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-card-section class="cc-item-dialog-body">
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
            <strong
              >{{ itemPendingDelete?.code }} —
              {{ itemPendingDelete?.name }}</strong
            >
            ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
          </div>
        </q-card-section>
        <q-card-actions align="right" class="cc-delete-dialog-actions">
          <q-btn no-caps flat label="ยกเลิก" @click="cancelDelete" />
          <q-btn
            no-caps
            unelevated
            label="ลบรายการ"
            class="cc-confirm-delete-btn"
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
 * All three tabs (materials/reagents, labor, vehicle/fuel) share the exact
 * same data shape — code, name, unit, reference price, and a "vendor"
 * style field whose label changes per tab (supplier for materials, agency
 * for labor, provider for vehicles). One generic list + dialog
 * implementation drives all of them; only seed data, code prefix, and
 * suggested units/vendor-label differ per tab.
 *
 * The "materials" tab's data now comes from GET {{baseURL}}/material
 * instead of local seed data — see fetchMaterials() below. Labor and
 * vehicle still use local mock data until their endpoints exist.
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
  // suggestions.
  unitInputOptions.value = [...UNIT_SUGGESTIONS[id]];
}
 
/* =========================================================================
 * Cost items
 * ========================================================================= */
 
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
// value that isn't in this list (new-value-mode="add-unique").
const UNIT_SUGGESTIONS: Record<TabId, string[]> = {
  materials: ["เทสต์", "ชุด", "แผ่น", "หลอด", "ภาพ", "คน", "ขวด", "กล่อง"],
  labor: ["ต่อชม.", "ต่อกะ", "ต่อวัน", "ต่อเที่ยว"],
  vehicle: ["ต่อลิตร", "ต่อกม.", "ต่อเที่ยว", "ต่อวัน"]
};
 
const costData = reactive<Record<TabId, CostItem[]>>({
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
  ],
  vehicle: [
    {
      id: "veh-1",
      code: "VEH-001",
      name: "รถตรวจสุขภาพเคลื่อนที่ (ตู้ X-Ray)",
      unit: "ต่อเที่ยว",
      price: 3500.0,
      vendor: "งานยานพาหนะ รพ.ปะเหลียน"
    },
    {
      id: "veh-2",
      code: "VEH-002",
      name: "น้ำมันดีเซล",
      unit: "ต่อลิตร",
      price: 31.9,
      vendor: "ปตท. สาขาปะเหลียน"
    },
    {
      id: "veh-3",
      code: "VEH-003",
      name: "รถตู้ขนอุปกรณ์และเวชภัณฑ์",
      unit: "ต่อเที่ยว",
      price: 1200.0,
      vendor: "งานยานพาหนะ รพ.ปะเหลียน"
    }
  ]
});
 
const activeItems = computed(() => costData[activeTab.value]);
 
/* =========================================================================
 * Fetch materials from the backend
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
 
// Only the materials tab is backend-driven right now, so the loading
// state only needs to gate that one tab's table/card list.
const isLoadingActiveTab = computed(
  () => activeTab.value === "materials" && loadingMaterials.value
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
 
onMounted(() => {
  void fetchMaterials();
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
  return activeItems.value.filter(item => {
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.vendor.toLowerCase().includes(q)
    );
  });
});
 
function clearFilters(): void {
  searchQuery.value = "";
}
 
/* =========================================================================
 * Desktop table columns + pagination
 *
 * Columns power the q-table header only — every cell is rendered through
 * the custom `body` slot in the template (inline-editable unit/price,
 * action buttons), same as the reimbursement matrix. Pagination state
 * (`tablePagination`) is shared with the mobile card list below via
 * `pagedItems`, so both views always show the same page of results, and
 * resets to page 1 whenever the search or active tab changes so it never
 * points past the end of a newly-narrowed list.
 * ========================================================================= */
 
const ccColumns = computed(() => [
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
]);
 
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
 
const pagedItems = computed(() => {
  const start = (tablePagination.value.page - 1) * tablePagination.value.rowsPerPage;
  return filteredItems.value.slice(start, start + tablePagination.value.rowsPerPage);
});
 
const pagedRangeStart = computed(() =>
  filteredItems.value.length
    ? (tablePagination.value.page - 1) * tablePagination.value.rowsPerPage + 1
    : 0
);
const pagedRangeEnd = computed(() =>
  Math.min(
    tablePagination.value.page * tablePagination.value.rowsPerPage,
    filteredItems.value.length
  )
);
const mobileTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / tablePagination.value.rowsPerPage))
);
 
/* =========================================================================
 * Unit/price display
 *
 * The table and mobile card list used to let you edit unit/price inline
 * (a q-select + q-input right in the row). That's been replaced with
 * plain read-only text — use the "แก้ไข" button to open the dialog
 * instead. unitInputOptions/filterUnitOptions are still used there, for
 * the unit autocomplete field in the create/edit dialog.
 *
 * NOTE: for the materials tab, edits made through the dialog and delete
 * below currently only mutate the in-memory `costData.materials` array —
 * they are not yet persisted back to the /material API. Only creation
 * (POST) and the initial GET fetch are wired up so far.
 * ========================================================================= */
 
const unitInputOptions = ref<string[]>([...UNIT_SUGGESTIONS.materials]);
 
function filterUnitOptions(
  val: string,
  update: (cb: () => void) => void
): void {
  update(() => {
    const base = UNIT_SUGGESTIONS[activeTab.value];
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
 * Create / edit dialog (name / vendor, plus unit & price as a convenience
 * so the whole row can be edited from one place too)
 *
 * The dialog no longer collects a `code` — materials get theirs from the
 * backend on create; labor/vehicle still get one auto-assigned locally
 * (see nextItemCode below) since they don't have an API yet.
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
 
// Next sequential code (LAB-001, VEH-001, ...) based on the highest number
// currently used within the active tab, so a new item never collides with
// an existing one even after items have been removed. Only used for the
// labor/vehicle tabs now — materials get their code from the API response
// on create (see createMaterialApi above).
function nextItemCode(tabId: TabId): string {
  const prefix = TABS.find(t => t.id === tabId)!.codePrefix;
  const usedNumbers = costData[tabId]
    .map(i => i.code.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1])
    .filter((n): n is string => !!n)
    .map(n => parseInt(n, 10));
  const highest = usedNumbers.length ? Math.max(...usedNumbers) : 0;
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}
 
const dialogOpen = ref(false);
const editingItem = ref<CostItem | null>(null);
const savingItem = ref(false);
const form = reactive<ItemForm>(emptyForm());
 
function openCreateDialog(): void {
  editingItem.value = null;
  Object.assign(form, emptyForm());
  unitInputOptions.value = UNIT_SUGGESTIONS[activeTab.value];
  dialogOpen.value = true;
}
 
function openEditDialog(item: CostItem): void {
  editingItem.value = item;
  Object.assign(form, {
    name: item.name,
    unit: item.unit,
    price: item.price,
    vendor: item.vendor
  });
  unitInputOptions.value = UNIT_SUGGESTIONS[activeTab.value];
  dialogOpen.value = true;
}
 
function closeDialog(): void {
  if (savingItem.value) return;
  dialogOpen.value = false;
}
 
async function saveItem(): Promise<void> {
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
 
  const tabId = activeTab.value;
 
  if (editingItem.value) {
    // NOTE: materials edits are still local-only — no PATCH/PUT endpoint
    // wired up yet. See comment above unitInputOptions.
    const target = costData[tabId].find(i => i.id === editingItem.value!.id);
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
 
  // labor/vehicle: still local-only, no backend endpoint yet.
  // FIX: Date.now() alone can collide if two items are added within the
  // same millisecond (e.g. scripted/rapid submissions). Add a short
  // random suffix so ids stay unique.
  const id = `${tabId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = nextItemCode(tabId);
  costData[tabId].push({
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
 * ========================================================================= */
 
const deleteDialogOpen = ref(false);
const itemPendingDelete = ref<CostItem | null>(null);
 
function requestDelete(item: CostItem): void {
  itemPendingDelete.value = item;
  deleteDialogOpen.value = true;
}
 
function cancelDelete(): void {
  deleteDialogOpen.value = false;
  itemPendingDelete.value = null;
}
 
function confirmDelete(): void {
  if (!itemPendingDelete.value) return;
  const { id, code } = itemPendingDelete.value;
  const tabId = activeTab.value;
 
  costData[tabId] = costData[tabId].filter(i => i.id !== id);
 
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

.cc-price-text {
  font-size: 0.86rem;
  font-weight: 700;
  color: #2f6feb;
  white-space: nowrap;
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

/* ===== Mobile card list (hidden on desktop) ===== */
.cc-mobile-list {
  display: none;
  flex-direction: column;
  gap: 10px;
}

.cc-mobile-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cc-mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.cc-item-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: #1a1f27;
  overflow-wrap: anywhere;
  margin-top: 4px;
}

.cc-mobile-vendor {
  font-size: 0.78rem;
  color: #8a94a3;
}

.cc-mobile-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cc-mobile-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cc-mobile-field-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #8a94a3;
}

.cc-mobile-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px dashed #eef0f3;
}

.cc-mobile-card-actions .q-btn {
  flex: 1;
}

.cc-mobile-pagination-bar {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cc-mobile-pagination-info {
  font-size: 0.76rem;
  font-weight: 600;
  color: #6b7280;
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

  /* Swap: table hides, card list takes over */
  .cc-desktop-table {
    display: none;
  }

  .cc-mobile-list {
    display: flex;
  }

  .cc-dialog-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}
</style>