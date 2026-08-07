<template>
  <q-page class="kits-page">
    <div class="kits-container">
      <!-- ===== Page header ===== -->
      <div class="header-card">
        <div class="header-icon">
          <q-icon name="layers" size="22px" />
        </div>

        <div class="header-text">
          <div class="header-title">
            การตั้งค่าชุดตรวจสุขภาพ &amp; อัตราการเบิกจ่ายตามสิทธิ์
            <span class="header-title-en"
              >(Checkup Sets &amp; Rights Mapping)</span
            >
          </div>
          <div class="header-sub">
            ผูกรายการตรวจกับต้นทุนวัสดุ/น้ำยาต่อหัว
            และกำหนดเรทเบิกจ่ายของแต่ละสิทธิ์การรักษา
          </div>
        </div>

        <div class="header-toggle">
          <q-btn
            no-caps
            dense
            flat
            icon="inventory_2"
            label="จัดการชุดตรวจ (Checkup Sets)"
            class="toggle-btn"
            :class="{ 'toggle-btn--active': view === 'sets' }"
            @click="view = 'sets'"
          />
          <q-btn
            no-caps
            dense
            flat
            icon="grid_on"
            label="ตารางเรทเบิกจ่าย (Reimbursement Matrix)"
            class="toggle-btn"
            :class="{ 'toggle-btn--active': view === 'matrix' }"
            @click="view = 'matrix'"
          />
        </div>
      </div>

      <!-- ===== Checkup sets view ===== -->
      <template v-if="view === 'sets'">
        <div class="section-row">
          <span class="section-label">
            ชุดตรวจสุขภาพที่เปิดให้บริการออกหน่วย
            <span class="section-count">
              ({{ filteredSets.length }} จาก {{ checkupSets.length }} ชุด)
            </span>
          </span>
          <q-btn
            no-caps
            unelevated
            icon="add"
            label="สร้าง Set ตรวจใหม่"
            class="create-btn"
            @click="openCreateDialog"
          />
        </div>

        <!--
          ===== Sets grid, following the reference q-table pattern =====
          grid mode + hide-header, same as the provided example. The search
          box lives in the `top-right` slot (debounced, borderless,
          v-model bound directly to `filter`) exactly like the reference —
          the item-filter menu and "clear all" button move into `top-left`
          so they stay available without cluttering the search slot.
          `hide-bottom` is dropped so q-table renders its own default
          pagination footer (rows-per-page dropdown, "X-Y of Z", prev/next
          arrows) instead of the separate custom pagination bar below.
        -->
        <q-table
          flat
          borderless
          grid
          hide-header
          :rows="checkupSets"
          :columns="setColumns"
          row-key="id"
          :filter="setFilterTerms"
          :filter-method="filterSetRows"
          v-model:pagination="setsPagination"
          class="sets-table"
        >
          <template v-slot:top-left>
            <div class="filter-toolbar">
              <q-btn
                no-caps
                outline
                icon="filter_list"
                :label="filterButtonLabel"
                class="filter-btn"
              >
                <q-menu anchor="bottom left" self="top left">
                  <div class="filter-menu">
                    <div class="filter-menu-title">
                      กรองตามรายการตรวจที่มีใน Set
                    </div>
                    <div class="item-check-grid item-check-grid--menu">
                      <label
                        v-for="item in ITEM_CATALOG"
                        :key="item.id"
                        class="item-check"
                        :class="{
                          'item-check--checked': filterItemIds.includes(item.id)
                        }"
                      >
                        <q-checkbox
                          dense
                          color="positive"
                          v-model="filterItemIds"
                          :val="item.id"
                        />
                        <span class="item-check-label" :title="item.label">{{
                          item.label
                        }}</span>
                      </label>
                    </div>
                    <div class="filter-menu-actions">
                      <q-btn
                        no-caps
                        flat
                        dense
                        size="sm"
                        label="ล้างตัวกรองรายการตรวจ"
                        :disable="!filterItemIds.length"
                        @click="filterItemIds = []"
                      />
                    </div>
                  </div>
                </q-menu>
              </q-btn>

              <q-btn
                v-if="hasActiveFilters"
                no-caps
                flat
                dense
                icon="close"
                label="ล้างตัวกรองทั้งหมด"
                class="clear-filters-btn"
                @click="clearFilters"
              />
            </div>
          </template>

          <!-- Search box, same shape as the reference table:
               borderless, dense, debounce="300", v-model + append icon.
               @clear resets the model directly — with `debounce` set,
               the clear button's emitted empty value can otherwise get
               absorbed by the debounce timer and the text won't disappear. -->
          <template v-slot:top-right>
            <q-input
              borderless
              dense
              debounce="300"
              clearable
              v-model="searchQuery"
              placeholder="ค้นหาชื่อชุดตรวจ หรือรหัสชุดตรวจ..."
              class="search-input"
              @clear="searchQuery = ''"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>

          <template v-slot:item="scope">
            <div class="col-12 col-md-6 q-pa-xs">
              <div class="set-card">
                <div class="set-card-top">
                  <span class="set-code">{{ scope.row.code }}</span>
                  <div class="set-cost">
                    <span class="set-cost-label">ต้นทุนวัสดุ/น้ำยาต่อหัว</span>
                    <span class="set-cost-value">{{
                      fmtBaht(scope.row.costPerHead)
                    }}</span>
                  </div>
                </div>

                <div class="set-title">{{ scope.row.title }}</div>
                <div class="set-desc">{{ scope.row.description }}</div>

                <div class="set-items-label">
                  รายการตรวจที่ผูกใน Set นี้ ({{ scope.row.itemIds.length }}
                  รายการ):
                </div>
                <div class="set-items">
                  <span
                    v-for="(item, idx) in setItems(scope.row)"
                    :key="item.id"
                    class="set-item-chip"
                    :class="{
                      'set-item-chip--matched': filterItemIds.includes(item.id)
                    }"
                  >
                    <q-icon
                      :name="item.icon"
                      size="14px"
                      :style="{ color: chipColor(idx) }"
                    />
                    {{ item.label }}
                  </span>
                </div>

                <div class="set-card-actions">
                  <q-btn
                    no-caps
                    flat
                    dense
                    icon="delete_outline"
                    label="ลบ"
                    class="delete-btn"
                    @click="requestDelete(scope.row)"
                  />
                  <q-btn
                    no-caps
                    flat
                    dense
                    icon="edit"
                    label="แก้ไข Set"
                    class="edit-btn"
                    @click="openEditDialog(scope.row)"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- ===== Empty state, rendered by the table itself when the
               filter/filter-method yields no rows ===== -->
          <template v-slot:no-data>
            <div v-if="hasActiveFilters" class="empty-state">
              <q-icon name="search_off" size="28px" class="empty-icon" />
              <div class="empty-title">ไม่พบชุดตรวจที่ตรงกับเงื่อนไข</div>
              <div class="empty-sub">ลองแก้คำค้นหา หรือล้างตัวกรองรายการตรวจ</div>
              <q-btn
                no-caps
                flat
                dense
                label="ล้างตัวกรองทั้งหมด"
                class="empty-clear-btn"
                @click="clearFilters"
              />
            </div>

            <div v-else class="empty-state">
              <q-icon name="inventory_2" size="28px" class="empty-icon" />
              <div class="empty-title">ยังไม่มีชุดตรวจ</div>
              <div class="empty-sub">
                เริ่มต้นสร้างชุดตรวจสุขภาพชุดแรกสำหรับออกหน่วย
              </div>
            </div>
          </template>
        </q-table>
      </template>

      <!-- ===== Reimbursement matrix view ===== -->
      <template v-else>
        <div class="matrix-header-card">
          <div class="matrix-header-icon">
            <q-icon name="table_chart" size="20px" />
          </div>
          <div class="matrix-header-text">
            <div class="matrix-header-title">
              ตารางเปรียบเทียบและแก้ไขอัตราเบิกจ่าย
              <span class="matrix-header-title-en"
                >(Reimbursement Rate Matrix)</span
              >
            </div>
            <div class="matrix-header-sub">
              กำหนดราคาเบิกจ่าย (รายรับ) ของแต่ละรายการตรวจ แยกตามสิทธิ์การรักษา
              (บาท)
            </div>
          </div>
          <div class="matrix-header-actions">
            <span class="matrix-header-count"
              >{{ filteredMatrixItems.length }} รายการ</span
            >
            <q-btn
              no-caps
              unelevated
              icon="check_circle"
              label="บันทึกตารางเรทเบิกจ่าย"
              class="matrix-save-btn"
              @click="saveMatrixRates"
            />
          </div>
        </div>

        <!--
          ===== Rate matrix, same bordered row-table + built-in footer
          structure as the reimbursement tracking table: a search box
          above a bordered table with a shaded header row, and the
          default q-table pagination footer at the bottom (rows-per-page
          dropdown + "X-Y of Z" + prev/next). Each rate cell is rendered
          through a custom `body` slot so it stays an editable q-input
          bound straight to `matrixRates`, exactly as before.
        -->
        <q-table
          flat
          bordered
          :rows="ITEM_CATALOG"
          :columns="matrixColumns"
          row-key="id"
          :filter="matrixSearchQuery"
          :filter-method="filterMatrixRows"
          v-model:pagination="matrixTablePagination"
          :rows-per-page-options="[5, 10, 20, 50]"
          class="matrix-qtable"
        >
          <template v-slot:top-right>
            <q-input
              borderless
              dense
              debounce="300"
              clearable
              v-model="matrixSearchQuery"
              placeholder="ค้นหารายการตรวจ หรือรหัสรายการ..."
              class="search-input"
              @clear="matrixSearchQuery = ''"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="item" :props="props" class="matrix-td-item">
                <div class="matrix-item-title">{{ props.row.label }}</div>
                <div class="matrix-item-code">{{ props.row.code }}</div>
              </q-td>
              <q-td
                v-for="r in rights"
                :key="r.id"
                :props="props"
                class="matrix-td-rate"
              >
                <q-input
                  dense
                  outlined
                  type="number"
                  min="0"
                  prefix="฿"
                  class="matrix-rate-input"
                  :model-value="matrixRates[props.row.id]?.[r.id] ?? 0"
                  @update:model-value="
                    val => setItemRate(props.row.id, r.id, val)
                  "
                />
              </q-td>
            </q-tr>
          </template>

          <template v-slot:no-data>
            <div class="empty-state">
              <q-icon name="search_off" size="28px" class="empty-icon" />
              <div class="empty-title">ไม่พบรายการตรวจที่ตรงกับเงื่อนไข</div>
              <div class="empty-sub">ลองแก้คำค้นหา</div>
              <q-btn
                no-caps
                flat
                dense
                label="ล้างคำค้นหา"
                class="empty-clear-btn"
                @click="matrixSearchQuery = ''"
              />
            </div>
          </template>
        </q-table>
      </template>

      <!-- ===== Create / edit set dialog ===== -->
      <q-dialog v-model="dialogOpen" persistent>
        <q-card class="set-dialog">
          <q-card-section class="set-dialog-header">
            <div class="set-dialog-title">
              {{ editingSet ? "แก้ไขชุดตรวจ" : "สร้างชุดตรวจสุขภาพใหม่" }}
            </div>
            <q-btn flat round dense icon="close" @click="closeDialog" />
          </q-card-section>

          <q-card-section class="set-dialog-body">
            <div class="dialog-grid">
              <div class="dialog-code-field">
                <div class="dialog-code-label">รหัสชุดตรวจ</div>
                <div class="dialog-code-readonly">{{ form.code }}</div>
              </div>
              <q-input
                dense
                outlined
                v-model="form.title"
                label="ชื่อชุดตรวจ *"
                class="dialog-title-input"
              />
            </div>

            <q-input
              dense
              outlined
              type="textarea"
              autogrow
              v-model="form.description"
              label="คำอธิบาย"
              class="dialog-field"
            />

            <div class="dialog-items-label">
              เลือกรายการตรวจที่รวมใน Set นี้:
            </div>
            <div class="item-check-grid">
              <label
                v-for="item in ITEM_CATALOG"
                :key="item.id"
                class="item-check"
                :class="{
                  'item-check--checked': form.itemIds.includes(item.id)
                }"
              >
                <q-checkbox
                  dense
                  color="positive"
                  v-model="form.itemIds"
                  :val="item.id"
                />
                <span class="item-check-label" :title="item.label">{{
                  item.label
                }}</span>
              </label>
            </div>

            <div class="dialog-cost-preview">
              <span>ต้นทุนวัสดุ/น้ำยาต่อหัวโดยประมาณ</span>
              <strong>{{ fmtBaht(previewCost) }}</strong>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="set-dialog-actions">
            <q-btn no-caps flat label="ยกเลิก" @click="closeDialog" />
            <q-btn
              no-caps
              unelevated
              label="บันทึกชุดตรวจ"
              class="create-btn"
              @click="saveSet"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ===== Delete confirmation dialog ===== -->
      <q-dialog v-model="deleteDialogOpen" persistent>
        <q-card class="delete-dialog">
          <q-card-section class="delete-dialog-body">
            <q-icon
              name="warning_amber"
              size="26px"
              class="delete-dialog-icon"
            />
            <div class="delete-dialog-title">ยืนยันการลบชุดตรวจ</div>
            <div class="delete-dialog-desc">
              ต้องการลบ
              <strong
                >{{ setPendingDelete?.code }} —
                {{ setPendingDelete?.title }}</strong
              >
              ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้ และเรทเบิกจ่ายของ Set
              นี้จะถูกลบไปด้วย
            </div>
          </q-card-section>
          <q-card-actions align="right" class="delete-dialog-actions">
            <q-btn no-caps flat label="ยกเลิก" @click="cancelDelete" />
            <q-btn
              no-caps
              unelevated
              label="ลบชุดตรวจ"
              class="confirm-delete-btn"
              @click="confirmDelete"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { Notify } from "quasar";

/* =========================================================================
 * Shared design tokens
 * Kept consistent with the rest of the admin dashboard's palette.
 * ========================================================================= */

const COLORS = {
  revenue: "#1e6fd9",
  profit: "#17a865",
  warning: "#f5a524",
  danger: "#e5484d"
} as const;

const ITEM_CHIP_COLORS: readonly string[] = [COLORS.profit, COLORS.revenue];

function chipColor(index: number): string {
  return ITEM_CHIP_COLORS[index % ITEM_CHIP_COLORS.length];
}

/* =========================================================================
 * Pagination page-size options, shared by both paginated lists on this
 * page (checkup sets grid and the reimbursement matrix table).
 * ========================================================================= */

const PAGE_SIZE_OPTIONS = [
  { label: "6 รายการ/หน้า", value: 6 },
  { label: "12 รายการ/หน้า", value: 12 },
  { label: "24 รายการ/หน้า", value: 24 }
];

/* =========================================================================
 * View toggle: manage checkup sets vs. edit the reimbursement matrix
 * ========================================================================= */

type View = "sets" | "matrix";
const view = ref<View>("sets");

/* =========================================================================
 * Checkup item catalog
 *
 * The master list of individual tests that a set can be built from. Each
 * entry carries its own material/reagent cost, so a set's per-head cost is
 * always the sum of whatever tests are checked in — no separate manual
 * "cost per head" field to keep in sync. The same catalog also powers the
 * "filter by included test" checklist above the set grid and the rows of
 * the reimbursement matrix.
 * ========================================================================= */

interface CatalogItem {
  id: string;
  code: string;
  label: string;
  icon: string;
  unitCost: number;
}

const ITEM_CATALOG: readonly CatalogItem[] = [
  {
    id: "physical-exam",
    code: "PE",
    label: "ตรวจร่างกายทั่วไปโดยแพทย์ (Physical Exam)",
    icon: "medical_services",
    unitCost: 5.0
  },
  {
    id: "cbc",
    code: "CBC",
    label: "ตรวจความสมบูรณ์ของเม็ดเลือด (CBC)",
    icon: "bloodtype",
    unitCost: 25.0
  },
  {
    id: "fbs",
    code: "FBS",
    label: "ตรวจระดับน้ำตาลในเลือด (Fasting Blood Sugar)",
    icon: "water_drop",
    unitCost: 19.0
  },
  {
    id: "lipid",
    code: "LIPID",
    label: "ตรวจระดับไขมันในเลือด (Chol, Trig, HDL, LDL)",
    icon: "science",
    unitCost: 50.0
  },
  {
    id: "liver",
    code: "LFT",
    label: "ตรวจการทำงานของตับ (ALT/AST Function)",
    icon: "science",
    unitCost: 30.0
  },
  {
    id: "urinalysis",
    code: "UA",
    label: "ตรวจปัสสาวะสมบูรณ์แบบ (Urinalysis)",
    icon: "opacity",
    unitCost: 21.2
  },
  {
    id: "chest-xray",
    code: "CXR",
    label: "เอ็กซเรย์ทรวงอกดิจิทัล (Chest X-Ray)",
    icon: "medical_information",
    unitCost: 45.0
  },
  {
    id: "ecg",
    code: "ECG",
    label: "ตรวจคลื่นไฟฟ้าหัวใจ (Electrocardiogram 12-lead)",
    icon: "monitor_heart",
    unitCost: 20.0
  }
];

const CATALOG_BY_ID: Readonly<Record<string, CatalogItem>> = Object.fromEntries(
  ITEM_CATALOG.map(item => [item.id, item])
);

function getCatalogItem(id: string): CatalogItem {
  return (
    CATALOG_BY_ID[id] ?? { id, code: "", label: id, icon: "help_outline", unitCost: 0 }
  );
}

/* =========================================================================
 * Checkup sets
 * ========================================================================= */

interface CheckupSet {
  id: string;
  code: string;
  title: string;
  description: string;
  costPerHead: number;
  itemIds: string[];
}

const checkupSets = ref<CheckupSet[]>([
  {
    id: "set-a",
    code: "SET-A",
    title: "Set A: ตรวจสุขภาพพื้นฐาน (Basic Checkup)",
    description: "ตรวจร่างกายโดยแพทย์, CBC, และตรวจปัสสาวะ UA",
    costPerHead: 51.2,
    itemIds: ["physical-exam", "cbc", "urinalysis"]
  },
  {
    id: "set-b",
    code: "SET-B",
    title: "Set B: ตรวจคัดกรองเบาหวาน/ไขมัน (NCD Screening)",
    description: "ตรวจร่างกาย, CBC, FBS, Lipid Profile และ Urine UA",
    costPerHead: 120.2,
    itemIds: ["physical-exam", "cbc", "fbs", "lipid", "urinalysis"]
  }
]);

function setItems(set: CheckupSet): CatalogItem[] {
  return set.itemIds.map(getCatalogItem);
}

function fmtBaht(amount: number): string {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* =========================================================================
 * Search + item-based filtering
 *
 * `searchQuery` matches against a set's title and code. `filterItemIds`
 * narrows to sets that include every checked test (AND match) — ticking
 * more boxes narrows the result further, which matches how the filter
 * menu reads ("sets that have all of these tests"). The same matching
 * logic backs both the q-table `filter-method` (so the grid only renders
 * matching rows) and our own `filteredSets` computed (used for the "X of
 * Y" count and the pagination range text).
 * ========================================================================= */

const searchQuery = ref("");
const filterItemIds = ref<string[]>([]);

const hasActiveFilters = computed(
  () => searchQuery.value.trim().length > 0 || filterItemIds.value.length > 0
);

const filterButtonLabel = computed(() =>
  filterItemIds.value.length
    ? `กรองรายการตรวจ (${filterItemIds.value.length})`
    : "กรองตามรายการตรวจ"
);

interface SetFilterTerms {
  query: string;
  itemIds: string[];
}

const setFilterTerms = computed<SetFilterTerms>(() => ({
  query: searchQuery.value.trim().toLowerCase(),
  itemIds: filterItemIds.value
}));

function matchesSetFilter(s: CheckupSet, terms: SetFilterTerms): boolean {
  const matchesQuery =
    !terms.query ||
    s.title.toLowerCase().includes(terms.query) ||
    s.code.toLowerCase().includes(terms.query);
  const matchesItems =
    !terms.itemIds.length || terms.itemIds.every(id => s.itemIds.includes(id));
  return matchesQuery && matchesItems;
}

// q-table's expected filter-method signature: (rows, terms) => filtered rows.
function filterSetRows(
  rows: readonly CheckupSet[],
  terms: SetFilterTerms
): CheckupSet[] {
  return rows.filter(s => matchesSetFilter(s, terms));
}

const filteredSets = computed(() =>
  checkupSets.value.filter(s => matchesSetFilter(s, setFilterTerms.value))
);

function clearFilters(): void {
  searchQuery.value = "";
  filterItemIds.value = [];
}

/* =========================================================================
 * Checkup-sets grid + pagination
 *
 * The card grid itself is rendered by q-table in `grid` mode (via the
 * `item` slot), which handles slicing rows to the current page/rowsPerPage
 * internally. We keep our own `setsPagination` ref as the single source of
 * truth (bound to the table with v-model:pagination) so the pagination bar
 * below the grid — built to match the rest of this app's UI rather than
 * Quasar's default footer — can read/drive the same state.
 * ========================================================================= */

const setColumns = [
  { name: "code", label: "รหัสชุดตรวจ", field: "code", align: "left" as const },
  { name: "title", label: "ชื่อชุดตรวจ", field: "title", align: "left" as const }
];

const setsPagination = ref({ page: 1, rowsPerPage: 6 });

// Reset to page 1 whenever the filtered set or page size changes, so the
// pager never points past the end of a newly-narrowed result set.
watch([searchQuery, filterItemIds, () => setsPagination.value.rowsPerPage], () => {
  setsPagination.value.page = 1;
});

/* =========================================================================
 * Reimbursement rate matrix (checkup items x rights)
 *
 * This is the authoritative per-test reimbursement rate — how much the
 * fund pays back for each individual checkup item under each right. It's
 * independent of which sets a test happens to belong to.
 * ========================================================================= */

interface Right {
  id: string;
  label: string;
  subLabel: string;
}

const rights: readonly Right[] = [
  { id: "uc", label: "UC", subLabel: "บัตรทอง (สปสช. / หลักประกันสุขภาพ)" },
  { id: "sss", label: "SSS", subLabel: "ประกันสังคม (ม.33/ม.39)" },
  { id: "csmbs", label: "CSMBS", subLabel: "จ่ายตรงข้าราชการ (กรมบัญชีกลาง)" },
  { id: "lgo", label: "LGO", subLabel: "องค์กรปกครองส่วนท้องถิ่น (อปท.)" },
  {
    id: "selfpay",
    label: "SELFPAY",
    subLabel: "ชำระเงินเอง / เงินบำรุงโรงพยาบาล"
  }
];

// Seed rates, keyed by checkup-item id then right id (บาทต่อครั้ง).
const matrixRates = reactive<Record<string, Record<string, number>>>({
  "physical-exam": { uc: 50, sss: 60, csmbs: 80, lgo: 80, selfpay: 100 },
  cbc: { uc: 90, sss: 80, csmbs: 100, lgo: 100, selfpay: 120 },
  fbs: { uc: 40, sss: 50, csmbs: 60, lgo: 60, selfpay: 70 },
  lipid: { uc: 150, sss: 180, csmbs: 200, lgo: 200, selfpay: 250 },
  liver: { uc: 110, sss: 130, csmbs: 150, lgo: 150, selfpay: 180 },
  urinalysis: { uc: 40, sss: 45, csmbs: 50, lgo: 50, selfpay: 60 },
  "chest-xray": { uc: 170, sss: 170, csmbs: 200, lgo: 200, selfpay: 220 },
  ecg: { uc: 150, sss: 180, csmbs: 200, lgo: 200, selfpay: 250 }
});

function setItemRate(
  itemId: string,
  rightId: string,
  value: string | number | null
): void {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (!matrixRates[itemId]) matrixRates[itemId] = {};
  matrixRates[itemId][rightId] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function saveMatrixRates(): void {
  Notify.create({
    type: "positive",
    message: "บันทึกตารางเรทเบิกจ่ายสำเร็จ",
    position: "top"
  });
}

/* =========================================================================
 * Matrix search + table
 *
 * The matrix is a row-mode q-table (bordered, shaded header) rather than
 * a plain HTML table, so it gets the same built-in pagination footer as
 * the sets grid. `filteredMatrixItems` still exists for the header's item
 * count and the search-input's "clear" affordance; `filterMatrixRows` is
 * the filter-method q-table itself calls to decide which rows to show.
 * ========================================================================= */

const matrixSearchQuery = ref("");

const filteredMatrixItems = computed(() => {
  const q = matrixSearchQuery.value.trim().toLowerCase();
  if (!q) return ITEM_CATALOG;
  return ITEM_CATALOG.filter(
    item =>
      item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
  );
});

function filterMatrixRows(
  rows: readonly CatalogItem[],
  terms: string
): CatalogItem[] {
  const q = terms.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter(
    item => item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
  );
}

// Column definitions for the row-mode matrix table: the item name/code
// column plus one column per right. Only `name`/`label` are actually used
// (header rendering + the `item` cell) — the rate cells are drawn entirely
// through the custom `body` slot in the template, keyed off `rights`
// directly, so no `field`/`format` is needed on the right-hand columns.
const matrixColumns = computed(() => [
  {
    name: "item",
    label: "รายการตรวจ (CHECKUP ITEM)",
    field: "label",
    align: "left" as const
  },
  ...rights.map(r => ({
    name: r.id,
    label: `${r.label} — ${r.subLabel}`,
    field: r.id,
    align: "center" as const
  }))
]);

const matrixTablePagination = ref({ page: 1, rowsPerPage: 10 });

watch(matrixSearchQuery, () => {
  matrixTablePagination.value.page = 1;
});

/* =========================================================================
 * Create / edit dialog
 * ========================================================================= */

interface SetForm {
  code: string;
  title: string;
  description: string;
  itemIds: string[];
}

function emptyForm(): SetForm {
  return { code: "", title: "", description: "", itemIds: [] };
}

// Next sequential code (SET-A, SET-B, SET-C, ...) based on the highest
// letter currently in use, so a freshly-created set never collides with an
// existing one even after sets have been removed.
function nextSetCode(): string {
  const usedLetters = checkupSets.value
    .map(s => s.code.match(/^SET-([A-Z])$/)?.[1])
    .filter((c): c is string => !!c)
    .map(c => c.charCodeAt(0));
  const highest = usedLetters.length
    ? Math.max(...usedLetters)
    : "A".charCodeAt(0) - 1;
  return `SET-${String.fromCharCode(highest + 1)}`;
}

const dialogOpen = ref(false);
const editingSet = ref<CheckupSet | null>(null);
const form = reactive<SetForm>(emptyForm());

// Live estimate of the set's per-head cost, summed from whichever catalog
// items are currently checked — mirrors what gets saved as costPerHead.
const previewCost = computed(() =>
  form.itemIds.reduce((sum, id) => sum + getCatalogItem(id).unitCost, 0)
);

function openCreateDialog(): void {
  editingSet.value = null;
  Object.assign(form, emptyForm());
  form.code = nextSetCode();
  dialogOpen.value = true;
}

function openEditDialog(set: CheckupSet): void {
  editingSet.value = set;
  Object.assign(form, {
    code: set.code,
    title: set.title,
    description: set.description,
    itemIds: [...set.itemIds]
  });
  dialogOpen.value = true;
}

function closeDialog(): void {
  dialogOpen.value = false;
}

function saveSet(): void {
  if (!form.title.trim()) {
    Notify.create({
      type: "warning",
      message: "กรุณากรอกชื่อชุดตรวจ",
      position: "top"
    });
    return;
  }
  if (!form.itemIds.length) {
    Notify.create({
      type: "warning",
      message: "กรุณาเลือกรายการตรวจอย่างน้อย 1 รายการ",
      position: "top"
    });
    return;
  }

  if (editingSet.value) {
    const target = checkupSets.value.find(s => s.id === editingSet.value!.id);
    if (target) {
      target.title = form.title.trim();
      target.description = form.description.trim();
      target.itemIds = [...form.itemIds];
      target.costPerHead = previewCost.value;
    }
    Notify.create({
      type: "positive",
      message: `บันทึกการแก้ไข ${target?.code ?? form.code} สำเร็จ`,
      position: "top"
    });
  } else {
    const id = `set-${Date.now()}`;
    checkupSets.value.push({
      id,
      code: form.code,
      title: form.title.trim(),
      description: form.description.trim(),
      costPerHead: previewCost.value,
      itemIds: [...form.itemIds]
    });
    Notify.create({
      type: "positive",
      message: `สร้าง ${form.code} สำเร็จ`,
      position: "top"
    });
  }

  dialogOpen.value = false;
}

/* =========================================================================
 * Delete set
 * ========================================================================= */

const deleteDialogOpen = ref(false);
const setPendingDelete = ref<CheckupSet | null>(null);

function requestDelete(set: CheckupSet): void {
  setPendingDelete.value = set;
  deleteDialogOpen.value = true;
}

function cancelDelete(): void {
  deleteDialogOpen.value = false;
  setPendingDelete.value = null;
}

function confirmDelete(): void {
  if (!setPendingDelete.value) return;
  const { id, code } = setPendingDelete.value;

  checkupSets.value = checkupSets.value.filter(s => s.id !== id);

  Notify.create({
    type: "positive",
    message: `ลบ ${code} สำเร็จ`,
    position: "top"
  });
  deleteDialogOpen.value = false;
  setPendingDelete.value = null;
}
</script>

<style scoped>
.kits-page {
  background: #f5f7fa;
  padding: 20px 16px 40px;
  overflow-x: hidden;
}

.kits-container {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Header ===== */
.header-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #e6f0fb;
  color: #1e6fd9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.header-text {
  min-width: 0;
}

.header-title {
  font-size: 1rem;
  font-weight: 800;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.header-title-en {
  font-weight: 600;
  color: #6b7280;
}

.header-sub {
  font-size: 0.8rem;
  color: #8a94a3;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.header-toggle {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toggle-btn {
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

.toggle-btn :deep(.q-btn__content) {
  line-height: 1.25;
}

.toggle-btn--active {
  background: #17a865;
  color: #ffffff;
  border-color: #17a865;
}

/* ===== Section row ===== */
.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.section-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #1a1f27;
}

.section-count {
  font-weight: 600;
  color: #8a94a3;
}

.create-btn {
  background: #17a865;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 14px;
}

/* ===== Filter toolbar (top-left slot: item-filter menu + clear-all) ===== */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  width: 260px;
  max-width: 100%;
}

.search-input :deep(input) {
  font-size: 0.82rem;
}

.filter-btn {
  font-size: 0.76rem;
  font-weight: 600;
  color: #4b5563;
  border-color: #e6e9ee;
  min-height: 32px;
  padding: 0 10px;
  flex: none;
}

.clear-filters-btn {
  font-size: 0.76rem;
  font-weight: 600;
  color: #8a94a3;
  flex: none;
}

.filter-menu {
  padding: 14px;
  width: 380px;
  max-width: 90vw;
}

.filter-menu-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1a1f27;
  margin-bottom: 10px;
}

.item-check-grid.item-check-grid--menu {
  grid-template-columns: 1fr;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 6px;
}

.filter-menu-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* ===== Sets grid (rendered by q-table's grid-mode item slot; card sizing
   comes from the col-12 / col-md-6 wrapper in the template, this class
   only styles the q-table host element itself) ===== */
.sets-table {
  background: transparent;
}

.sets-table :deep(.q-table__top) {
  padding: 4px 4px 12px;
  flex-wrap: wrap;
  gap: 10px;
}

/* q-table renders top-left/top-right slot content as flex children —
   without min-width: 0 + flex-basis, a long filter button next to a
   fixed-width search input has no room to shrink and the two collide.
   Letting each side wrap to its own line on narrow widths fixes it. */
.sets-table :deep(.q-table__top > div) {
  flex: 1 1 auto;
  min-width: 240px;
}

.sets-table :deep(.q-table__top-right) {
  justify-content: flex-end;
}

.set-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 18px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.set-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.set-code {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #8a94a3;
  text-transform: uppercase;
}

.set-cost {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.set-cost-label {
  font-size: 0.68rem;
  color: #8a94a3;
}

.set-cost-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e6fd9;
}

.set-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #1a1f27;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.set-desc {
  font-size: 0.8rem;
  color: #6b7280;
  overflow-wrap: anywhere;
}

.set-items-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: #8a94a3;
  margin-top: 8px;
}

.set-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.set-item-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f8f9fb;
  border: 1px solid #e6e9ee;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.74rem;
  color: #4b5563;
}

.set-item-chip--matched {
  border-color: #17a865;
  background: #f0faf4;
  color: #17a865;
  font-weight: 600;
}

.set-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
}

.edit-btn {
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #1e6fd9;
}

.delete-btn {
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #e5484d;
}

/* ===== Pagination bar (shared by sets grid + matrix table) ===== */
.pagination-bar {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  flex: none;
}

.pagination-nav {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
}

.page-size-select {
  width: 140px;
  flex: none;
}

.page-size-select :deep(.q-field__control) {
  height: 36px;
  min-height: 36px;
}

.page-size-select :deep(.q-field__marginal) {
  height: 36px;
}

.page-size-select :deep(.q-field__native) {
  font-size: 0.78rem;
}

/* ===== Empty state ===== */
.empty-state {
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

.empty-icon {
  color: #b3bac5;
  margin-bottom: 4px;
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1a1f27;
}

.empty-sub {
  font-size: 0.78rem;
  color: #8a94a3;
}

.empty-clear-btn {
  margin-top: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1e6fd9;
}

/* ===== Reimbursement matrix header card ===== */
.matrix-header-card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 12px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.matrix-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #e6f0fb;
  color: #1e6fd9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.matrix-header-text {
  min-width: 0;
}

.matrix-header-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.matrix-header-title-en {
  font-weight: 600;
  color: #6b7280;
}

.matrix-header-sub {
  font-size: 0.78rem;
  color: #1e6fd9;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.matrix-header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: none;
}

.matrix-header-count {
  font-size: 0.8rem;
  font-weight: 700;
  color: #8a94a3;
  white-space: nowrap;
}

.matrix-save-btn {
  background: #17a865;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 16px;
  white-space: nowrap;
}

/* ===== Reimbursement matrix table (row-mode q-table) =====
   Bordered cells + a shaded header row, matching the reference tracking
   table's look. Search box sits in the table's own `top-right` slot, and
   pagination uses q-table's built-in footer — no separate card/scroll
   wrapper or custom pagination bar needed anymore. */
.matrix-qtable {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.matrix-qtable :deep(.q-table__top) {
  padding: 10px 14px;
  border-bottom: 1px solid #eef0f3;
  flex-wrap: wrap;
  gap: 10px;
}

/* Same fix as the sets grid's toolbar: without a minimum width, the
   top-right container can be squeezed by q-table's layout and the search
   placeholder text gets clipped against the box edge. */
.matrix-qtable :deep(.q-table__top > div) {
  flex: 1 1 auto;
  min-width: 240px;
}

.matrix-qtable :deep(.q-table__top-right) {
  justify-content: flex-end;
}

.matrix-qtable :deep(thead tr) {
  background: #f8f9fb;
}

.matrix-qtable :deep(thead th) {
  font-size: 0.76rem;
  font-weight: 700;
  color: #1a1f27;
  white-space: normal;
}

.matrix-qtable :deep(tbody td) {
  vertical-align: middle;
}

.matrix-qtable :deep(tbody tr:hover) {
  background: #fafbfc;
}

.matrix-item-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: #1a1f27;
  overflow-wrap: anywhere;
}

.matrix-item-code {
  font-size: 0.68rem;
  font-weight: 700;
  color: #1e6fd9;
  text-transform: uppercase;
  margin-top: 2px;
}

.matrix-td-item {
  min-width: 220px;
}

.matrix-td-rate {
  min-width: 120px;
}

.matrix-rate-input {
  max-width: 120px;
  margin: 0 auto;
}

.matrix-rate-input :deep(input) {
  text-align: left;
}

/* ===== Create/edit dialog ===== */
.set-dialog {
  width: 100%;
  max-width: 560px;
}

.set-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef0f3;
}

.set-dialog-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: #1a1f27;
}

.set-dialog-body {
  max-height: 65vh;
  overflow-y: auto;
}

.dialog-grid {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 10px;
  align-items: end;
}

.dialog-code-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-code-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
}

.dialog-code-readonly {
  height: 40px;
  border-radius: 4px;
  background: #eef0f3;
  color: #6b7280;
  font-weight: 700;
  font-size: 0.86rem;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.dialog-field {
  margin-bottom: 10px;
}

.dialog-items-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1a1f27;
  margin: 10px 0 8px;
}

/* Checklist grid: two columns on desktop/tablet, collapses to one on
   mobile. Checked cards get a positive-colored border and tint so the
   selection state reads clearly at a glance. Reused for both the
   create/edit dialog and the "filter by test" menu above the grid. */
.item-check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.item-check {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  padding: 6px 10px 6px 2px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.item-check--checked {
  border-color: #17a865;
  background: #f0faf4;
}

.item-check :deep(.q-checkbox) {
  margin-top: 2px;
}

.item-check-label {
  font-size: 0.78rem;
  color: #1a1f27;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.35;
  min-width: 0;
  padding-top: 2px;
}

.dialog-cost-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 10px 12px;
  background: #f8f9fb;
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #4b5563;
}

.dialog-cost-preview strong {
  color: #1e6fd9;
  font-size: 0.9rem;
}

.set-dialog-actions {
  border-top: 1px solid #eef0f3;
}

/* ===== Delete confirmation dialog ===== */
.delete-dialog {
  width: 100%;
  max-width: 400px;
}

.delete-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-top: 24px;
}

.delete-dialog-icon {
  color: #f5a524;
  margin-bottom: 4px;
}

.delete-dialog-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: #1a1f27;
}

.delete-dialog-desc {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.5;
}

.delete-dialog-actions {
  border-top: 1px solid #eef0f3;
}

.confirm-delete-btn {
  background: #e5484d;
  color: #ffffff;
  font-weight: 700;
}

/* ===== Tablet (600px–960px) ===== */
@media (max-width: 960px) {
  .header-card {
    grid-template-columns: 36px minmax(0, 1fr);
    row-gap: 10px;
  }

  .header-toggle {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .matrix-header-card {
    grid-template-columns: 32px minmax(0, 1fr);
    row-gap: 10px;
  }

  .matrix-header-actions {
    grid-column: 1 / -1;
    justify-content: space-between;
    width: 100%;
  }

  .matrix-save-btn {
    flex: 1;
  }
}

/* ===== Mobile (<600px) ===== */
@media (max-width: 599px) {
  .kits-page {
    padding: 14px 10px 28px;
  }

  .header-card {
    padding: 12px 14px;
  }

  .matrix-header-card {
    padding: 12px 14px;
  }

  .matrix-header-title {
    font-size: 0.86rem;
  }

  .matrix-header-title-en {
    display: block;
    font-size: 0.7rem;
    margin-top: 2px;
  }

  .matrix-header-sub {
    font-size: 0.72rem;
  }

  .header-title {
    font-size: 0.88rem;
  }

  .header-title-en {
    display: block;
    font-size: 0.72rem;
    margin-top: 2px;
  }

  .header-toggle {
    flex-direction: column;
    align-items: stretch;
  }

  .toggle-btn {
    width: 100%;
    justify-content: flex-start;
  }

  .section-row {
    flex-direction: column;
    align-items: stretch;
  }

  .create-btn {
    width: 100%;
  }

  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .search-input,
  .filter-btn,
  .clear-filters-btn {
    width: 100%;
    flex: none;
  }

  .set-card {
    padding: 14px;
  }

  .set-card-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .set-cost {
    align-items: flex-start;
    text-align: left;
  }

  .set-card-actions {
    justify-content: stretch;
  }

  .set-card-actions .q-btn {
    flex: 1;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .item-check-grid {
    grid-template-columns: 1fr;
  }

  .item-check-label {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .pagination-info {
    text-align: center;
  }

  .pagination-nav {
    justify-content: center;
  }

  .page-size-select {
    width: 100%;
  }
}
</style>