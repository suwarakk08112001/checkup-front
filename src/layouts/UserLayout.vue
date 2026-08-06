<template>
  <q-layout view="lHh Lpr lFf">
    <!-- ===== HEADER (original navbar, unchanged) ===== -->
    <q-header bordered class="app-header">
      <div class="header-top header-container">
        <div class="brand">
          <q-btn
            flat
            dense
            round
            icon="menu"
            class="menu-toggle-btn"
            @click="toggleSidebar"
          />

          <div class="brand-icon">
            <q-icon name="local_hospital" size="24px" />
          </div>

          <div class="brand-text">
            <div class="brand-title-row">
              <span class="brand-title">ศูนย์ตรวจสุขภาพ โรงพยาบาลปะเหลียน</span>
              <q-badge rounded class="brand-badge">PLH Wellness Center</q-badge>
            </div>
            <div class="brand-sub">
              ระบบบริหารจัดการต้นทุนและรายได้การออกหน่วยตรวจสุขภาพเคลื่อนที่
            </div>
            <a class="brand-link" href="#">กลุ่มงานเทคนิคการแพทย์</a>
          </div>
        </div>

        <div class="header-actions">
          <q-btn flat no-caps class="user-block">
            <!-- <q-icon name="account_circle" size="34px" class="user-avatar" /> -->
            <div class="user-text">
              <div class="user-name">
                {{ currentUser.name }}
                <!-- <q-icon name="expand_more" size="16px" /> -->
              </div>
              <div class="user-role">{{ currentUser.role }}</div>
            </div>
          </q-btn>
          <!-- 
         
          <q-badge rounded class="role-pill">
            <q-icon name="verified_user" size="12px" class="q-mr-xs" />
            <span class="role-pill-text">{{ currentUser.badge }}</span>
          </q-badge> -->

          <q-separator vertical inset class="header-sep" />

          <q-btn
            flat
            dense
            round
            icon="logout"
            class="logout-btn"
            href="/login"
            @click.prevent="handleLogout"
          />
        </div>
      </div>
    </q-header>

    <!-- ===== SIDEBAR DRAWER ===== -->
    <q-drawer
      v-model="leftDrawerOpen"
      :width="sidebarWidth"
      :mini="sidebarMini"
      :mini-width="64"
      :breakpoint="768"
      bordered
      class="app-sidebar"
      @mouseover="onSidebarHover(true)"
      @mouseleave="onSidebarHover(false)"
    >
      <!-- Sidebar brand -->
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">
          <q-icon name="local_hospital" size="20px" />
        </div>
        <span v-if="!sidebarMini || sidebarHovered" class="sidebar-brand-title">
          PLH Wellness Center
        </span>
        <q-btn
          v-if="!sidebarMini || sidebarHovered"
          flat
          dense
          round
          icon="close"
          size="sm"
          class="sidebar-close-btn lt-md"
          @click="leftDrawerOpen = false"
        />
      </div>

      <q-separator class="sidebar-separator" />

      <!-- Nav items -->
      <div class="sidebar-nav">
        <q-item
          v-for="item in navItems"
          :key="item.name"
          clickable
          v-ripple
          class="sidebar-item"
          :class="{ 'sidebar-item--active': activeTab === item.name }"
          @click="goTo(item)"
        >
          <q-item-section avatar>
            <q-icon
              :name="item.icon"
              size="22px"
              :color="activeTab === item.name ? 'white' : 'primary'"
            />
          </q-item-section>
          <q-item-section v-if="!sidebarMini || sidebarHovered">
            {{ item.label }}
          </q-item-section>

          <q-tooltip
            v-if="sidebarMini && !sidebarHovered"
            anchor="center right"
            self="center left"
          >
            {{ item.label }}
          </q-tooltip>
        </q-item>
      </div>

      <!-- Collapse toggle (desktop only) -->
      <!-- <div class="sidebar-collapse-btn gt-sm" @click="toggleMini">
        <q-icon :name="sidebarMini ? 'chevron_right' : 'chevron_left'" size="18px" color="grey-7" />
      </div> -->
    </q-drawer>

    <!-- ===== PAGE CONTENT ===== -->
    <q-page-container>
      <div class="page-content">
        <router-view />
      </div>
    </q-page-container>

    <!-- ===== ALERT DIALOG ===== -->
    <q-dialog v-model="alertDialog.show" persistent>
      <q-card class="alert-card">
        <div
          class="alert-icon-wrap"
          :class="`alert-icon-wrap--${alertDialog.type}`"
        >
          <div class="alert-icon-ring">
            <q-icon :name="alertDialog.icon" size="34px" color="white" />
          </div>
        </div>
        <q-card-section class="alert-body">
          <div class="alert-title">{{ alertDialog.title }}</div>
          <div class="alert-message">{{ alertDialog.message }}</div>
        </q-card-section>
        <q-card-actions align="center" class="alert-actions">
          <q-btn
            unelevated
            :label="alertDialog.btnLabel || 'ตกลง'"
            class="alert-btn"
            :class="`alert-btn--${alertDialog.type}`"
            @click="alertDialog.show = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== FOOTER ===== -->
    <q-footer bordered class="app-footer">
      <div class="footer-content">
        <span class="footer-text">{{ appVersionLabel }}</span>
        <span class="footer-dot">•</span>
        <span class="footer-text"
          >© {{ currentYear }} ศูนย์ตรวจสุขภาพ โรงพยาบาลปะเหลียน</span
        >
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useQuasar } from "quasar";

// ─── Types ──────────────────────────────────────────────────────────────────
interface NavItem {
  name: string;
  label: string;
  icon: string;
  to: string;
}

interface CurrentUser {
  name: string;
  role: string;
  badge: string;
}

type AlertType = "error" | "success" | "warning" | "info";

interface AlertDialog {
  show: boolean;
  type: AlertType;
  icon: string;
  title: string;
  message: string;
  btnLabel: string;
}

const emit = defineEmits<{ (e: "refresh"): void; (e: "logout"): void }>();

// ─── Router / Quasar ────────────────────────────────────────────────────────
const router = useRouter();
const route = useRoute();
const $q = useQuasar();

// ─── User (replace with your real auth/user source) ────────────────────────
const currentUser: CurrentUser = {
  name: "นพ.สมชาย ตั้งใจ (Admin Wellness)",
  role: "หัวหน้ากลุ่มงาน Wellness & ออกหน่วย",
  badge: "Admin Wellness"
};

// ─── Nav items ──────────────────────────────────────────────────────────────
const navItems: NavItem[] = [
  {
    name: "dashboard",
    label: "Dashboard สรุปผล",
    icon: "insights",
    to: "/"
  },
  {
    name: "expenses",
    label: "ติดตามเบิกจ่าย & แจ้งเตือน",
    icon: "receipt_long",
    to: "/expenses"
  },
  {
    name: "trips",
    label: "การออกหน่วย (Pre/Post Trip)",
    icon: "event_available",
    to: "/trips"
  },
  {
    name: "kits",
    label: "ตั้งค่า & ค่าบริการตรวจสุขภาพประจำปีตามสิทธิ์",
    icon: "medical_information",
    to: "/kits"
  },
  {
    name: "cost-config",
    label: "ตั้งค่าต้นทุน (Cost Config)",
    icon: "tune",
    to: "/cost-config"
  }
];

// const activeTab = ref(
//   navItems.find(n => route.path.startsWith(n.to))?.name ?? navItems[0].name
// );
const activeTab = computed(() => {
  const match = navItems
    .filter(n => route.path === n.to || route.path.startsWith(n.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.name ?? navItems[0].name;
});
// ─── Sidebar state ──────────────────────────────────────────────────────────
// Starts open+expanded on desktop, closed (overlay) on mobile — same
// breakpoint logic as before, now paired with a mini/hover-expand mode
// on desktop to match the backoffice layout's collapse behavior.
const leftDrawerOpen = ref($q.screen.gt.sm);
const sidebarMini = ref(false);
const sidebarHovered = ref(false);
const sidebarWidth = 260;

function toggleSidebar(): void {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleMini(): void {
  sidebarMini.value = !sidebarMini.value;
  if (!sidebarMini.value) sidebarHovered.value = false;
}

function onSidebarHover(state: boolean): void {
  if (sidebarMini.value) sidebarHovered.value = state;
}

function goTo(item: NavItem): void {
  router.push(item.to);

  // On mobile the drawer overlays the page, so close it after picking
  // a destination. On desktop it's persistent and this has no effect.
  if ($q.screen.lt.md) {
    leftDrawerOpen.value = false;
  }
}

// ─── Alert dialog (generic, reusable) ───────────────────────────────────────
const alertDialog = reactive<AlertDialog>({
  show: false,
  type: "error",
  icon: "report_problem",
  title: "",
  message: "",
  btnLabel: "ตกลง"
});

const ALERT_ICONS: Record<AlertType, string> = {
  error: "report_problem",
  success: "check_circle",
  warning: "warning",
  info: "info"
};

function showAlert(
  type: AlertType,
  title: string,
  message: string,
  btnLabel = "ตกลง"
): void {
  alertDialog.type = type;
  alertDialog.icon = ALERT_ICONS[type];
  alertDialog.title = title;
  alertDialog.message = message;
  alertDialog.btnLabel = btnLabel;
  alertDialog.show = true;
}

defineExpose({ showAlert });

// ─── Logout ─────────────────────────────────────────────────────────────────
// Actual sign-out (clearing tokens, calling the API, etc.) is delegated to
// the parent via the "logout" emit, same as the original layout — this
// component only owns its own UI state.
// function handleLogout(): void {
//   emit("logout");
// }
async function handleLogout() {
  router.push("/login");
}

// ─── Footer ─────────────────────────────────────────────────────────────────
const currentYear = computed(() => new Date().getFullYear());
const APP_VERSION = "1.0.0";
const appVersionLabel = computed(
  () => `ระบบบริหารจัดการต้นทุนและรายได้ฯ v${APP_VERSION}`
);
</script>

<style lang="scss" scoped>
// ─── Design tokens (kept from the Wellness Center's existing blue theme) ────
$blue: #1e6fd9;
$blue-dark: #14406b;
$blue-mid: #2563eb;
$purple: #7e3ff2;
$surface: #ffffff;
$text-main: #1a1f27;
$text-muted: #8a94a3;

// ─── HEADER (original navbar, unchanged) ───────────────────────────────────
.app-header {
  background: #ffffff;
  color: inherit;
  box-shadow: none;
  border-bottom: 1px solid #e6e9ee;
  overflow-x: hidden;
}

.header-container {
  width: 100%;
  box-sizing: border-box;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.menu-toggle-btn {
  flex: none;
  color: #4b5563;
  margin-top: 4px;
}

.brand-icon {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: $blue;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.brand-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: $text-main;
  white-space: nowrap;
}

.brand-badge {
  background: #e6f0fb;
  color: $blue;
  font-weight: 600;
  font-size: 0.7rem;
  padding: 3px 10px;
}

.brand-sub {
  font-size: 0.78rem;
  color: $text-muted;
  margin-top: 2px;
  line-height: 1.35;
}

.brand-link {
  display: inline-block;
  font-size: 0.78rem;
  color: $blue;
  text-decoration: none;
  margin-top: 2px;
  &:hover {
    text-decoration: underline;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  text-transform: none;
  min-width: 0;
}

// .user-avatar {
//   color: #9aa4b2;
// }

.user-text {
  text-align: left;
  line-height: 1.25;
  min-width: 0;
  overflow-wrap: anywhere;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-main;
  overflow-wrap: anywhere;
}

.user-role {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-muted;
  overflow-wrap: anywhere;
}

.role-pill {
  background: #f1e9fb;
  color: $purple;
  font-weight: 600;
  font-size: 0.72rem;
  padding: 5px 12px;
}

.logout-btn {
  color: #4b5563;
  border: 1px solid #e2e6ec;
  border-radius: 8px;
}

/* ---------- Header responsive ---------- */
@media (max-width: 1024px) {
  .brand-title {
    white-space: normal;
    line-height: 1.3;
  }

  .header-top {
    padding: 12px 16px;
  }
}

@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-sep {
    display: none;
  }
}

@media (max-width: 599px) {
  .header-top {
    padding: 10px 12px;
  }

  .brand {
    gap: 8px;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
  }

  .brand-title {
    font-size: 0.92rem;
  }

  .brand-sub,
  .brand-link {
    display: none;
  }

  .brand-badge {
    font-size: 0.65rem;
    padding: 2px 8px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  // q-btn's label markup lives inside the child component's own template,
  // so it never carries this component's scoped data attribute — :deep()
  // drops that requirement so the selector can reach in.
  .gws-btn :deep(.q-btn__content span) {
    display: none;
  }

  .gws-btn {
    padding: 8px;
    min-width: 0;
  }

  .icon-text-btn :deep(.q-btn__content span) {
    display: none;
  }

  .icon-text-btn {
    padding: 8px;
    min-width: 0;
  }

  .role-pill .role-pill-text {
    font-size: 0.62rem;
    white-space: nowrap;
  }

  .role-pill {
    padding: 4px 8px;
    gap: 2px;
  }

  .user-name {
    font-size: 0.78rem;
  }

  .user-role {
    font-size: 0.68rem;
  }
}

@media (max-width: 360px) {
  .brand-title {
    font-size: 0.85rem;
  }

  // .user-avatar {
  //   font-size: 28px !important;
  // }
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────────
.app-sidebar {
  background: #fff;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.sidebar-brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  background: linear-gradient(135deg, $blue-dark, $blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-brand-title {
  flex: 1;
  min-width: 0;
  font-size: clamp(13px, 3.5vw, 18px);
  font-weight: 700;
  color: $text-main;
  overflow-wrap: anywhere;
}

.sidebar-close-btn {
  flex-shrink: 0;
  color: $text-muted;
}

.sidebar-separator {
  margin: 0;
}

.sidebar-nav {
  padding: 10px 8px;
}

.sidebar-item {
  border-radius: 12px;
  margin-bottom: 2px;
  color: $text-main;
  font-size: 0.93rem;
  font-weight: 600;
  transition: background 0.15s;
  &:hover {
    background: rgba(30, 111, 217, 0.08);
  }
}

.sidebar-item--active {
  background: linear-gradient(135deg, $blue-dark, $blue, $blue-mid);
  color: #fff;
  &:hover {
    background: linear-gradient(135deg, $blue-dark, $blue, $blue-mid);
  }
  :deep(.q-item__section) {
    color: #fff;
  }
}

.sidebar-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  margin: 8px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  transition: background 0.15s;
  &:hover {
    background: #f4f6f9;
  }
}

// ─── PAGE CONTENT ─────────────────────────────────────────────────────────
.page-content {
  background: #f5f7fa;
  min-height: 60vh;
}

// ─── ALERT DIALOG ───────────────────────────────────────────────────────────
.alert-card {
  width: 340px;
  max-width: 92vw;
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18) !important;
}

.alert-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 0 20px;
  &--error {
    background: linear-gradient(135deg, #7f1d1d, #e11d48);
  }
  &--success {
    background: linear-gradient(135deg, #14532d, #16a34a);
  }
  &--warning {
    background: linear-gradient(135deg, #78350f, #f59e0b);
  }
  &--info {
    background: linear-gradient(135deg, $blue-dark, $blue-mid);
  }
}

.alert-icon-ring {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 2px solid rgba(255, 255, 255, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-body {
  padding: 20px 24px 8px !important;
  text-align: center;
}

.alert-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: $text-main;
  margin-bottom: 8px;
}

.alert-message {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.65;
}

.alert-actions {
  padding: 12px 24px 22px !important;
}

.alert-btn {
  min-width: 110px;
  border-radius: 10px !important;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 8px 28px !important;
  &--error {
    background: linear-gradient(135deg, #e11d48, #db2777) !important;
    color: #fff !important;
  }
  &--success {
    background: linear-gradient(135deg, #16a34a, #15803d) !important;
    color: #fff !important;
  }
  &--warning {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
    color: #fff !important;
  }
  &--info {
    background: linear-gradient(135deg, $blue-mid, #1d4ed8) !important;
    color: #fff !important;
  }
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
.app-footer {
  background: #ffffff;
  color: $text-muted;
  border-top: 1px solid #e6e9ee;
  box-shadow: none;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.78rem;
  flex-wrap: wrap;
  text-align: center;
}

.footer-text {
  color: $text-muted;
}

.footer-dot {
  color: #cbd5e1;
}

@media (max-width: 599px) {
  .footer-content {
    font-size: 0.72rem;
    padding: 8px 12px;
  }
}
</style>

<style lang="scss">
body .q-drawer,
body .q-drawer .q-drawer__content {
  background: #fff !important;
}
</style>
