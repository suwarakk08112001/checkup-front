<template>
  <q-page class="login-page">
    <div class="bg-blob bg-blob-1" />
    <div class="bg-blob bg-blob-2" />
    <div class="bg-blob bg-blob-3" />

    <div class="login-center">
      <div class="login-card">
        <!-- Brand -->
        <div class="brand-section">
          <div class="brand-icon-wrap">
            <q-icon name="admin_panel_settings" size="2rem" color="white" />
          </div>
          <div class="brand-title">System Authentication</div>
          <div class="brand-sub">
            เลือกระดับสิทธิ์ผู้ใช้งาน 3 ระดับ หรือกรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
          </div>
        </div>

        <!-- Quick login -->
        <div class="card-divider">
          <span class="card-divider-text">เข้าสู่ระบบด่วน (1-Click Login)</span>
        </div>

        <div class="role-grid">
          <button
            v-for="role in quickRoles"
            :key="role.key"
            type="button"
            class="role-card"
            :class="`role-card--${role.key}`"
            @click="quickLogin(role)"
          >
            <div class="role-card-top">
              <div class="role-icon-box" :class="`role-icon-box--${role.key}`">
                <q-icon :name="role.icon" size="20px" />
              </div>
              <q-badge rounded class="role-badge" :class="`role-badge--${role.key}`">
                {{ role.badge }}
              </q-badge>
            </div>
            <div class="role-title">{{ role.title }}</div>
            <div class="role-desc">{{ role.description }}</div>
          </button>
        </div>

        <!-- Divider -->
        <div class="card-divider">
          <span class="card-divider-text">หรือเข้าสู่ระบบด้วยชื่อผู้ใช้งาน</span>
        </div>

        <!-- Form -->
        <q-form @submit.prevent="onSubmit" class="login-form">
          <div class="field-wrap">
            <label class="field-label">ชื่อผู้ใช้งาน (Username)</label>
            <q-input
              v-model="loginname"
              type="text"
              outlined
              dense
              placeholder="admin / finance / director"
              class="styled-input"
              lazy-rules
              :rules="[(val) => !!val || 'กรุณากรอกชื่อผู้ใช้งาน']"
            >
              <template v-slot:prepend>
                <q-icon name="person_outline" color="primary" size="20px" />
              </template>
            </q-input>
          </div>

          <div class="field-wrap">
            <label class="field-label">รหัสผ่าน (Password)</label>
            <q-input
              ref="passwordInputRef"
              v-model="password"
              :type="isPwd ? 'password' : 'text'"
              outlined
              dense
              placeholder="••••••••"
              class="styled-input"
              lazy-rules
              :rules="[(val) => !!val || 'กรุณากรอกรหัสผ่าน']"
            >
              <template v-slot:prepend>
                <q-icon name="lock_outline" color="primary" size="20px" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="isPwd ? 'visibility_off' : 'visibility'"
                  color="grey-5"
                  size="20px"
                  class="cursor-pointer"
                  @click="isPwd = !isPwd"
                />
              </template>
            </q-input>
          </div>

          <button
            type="submit"
            class="login-btn"
            :class="{ 'login-btn--loading': loading }"
            :disabled="loading"
          >
            <span v-if="!loading" class="login-btn-inner">
              <q-icon name="lock" size="18px" />
              เข้าสู่ระบบด้วยบัญชีผู้ใช้
            </span>
            <span v-else class="login-btn-inner">
              <q-circular-progress indeterminate size="18px" color="white" />
              กำลังเข้าสู่ระบบ...
            </span>
          </button>
        </q-form>

        <!-- Permission matrix note -->
        <div class="card-note">
          <div class="card-note-title">
            <q-icon name="info_outline" size="14px" class="q-mr-xs" />
            หมายเหตุสิทธิ์การใช้งานของแต่ละระดับ (Permission Matrix)
          </div>
          <ul class="note-list">
            <li>
              <span class="note-tag note-tag--admin">Admin Wellness</span>
              เข้าถึงทุกเมนู รวมทั้งหน้าตั้งค่าต้นทุนและชุดตรวจสุขภาพ
            </li>
            <li>
              <span class="note-tag note-tag--finance">ศูนย์รายได้</span>
              บันทึกเบิกจ่าย รับเงินโอน และอัปโหลดข้อมูล (ถูกซ่อนหน้าตั้งค่า)
            </li>
            <li>
              <span class="note-tag note-tag--director">ผู้อำนวยการ รพ.</span>
              อ่าน/ดูรายงานได้ทุกส่วน แต่ไม่สามารถแก้ไข และมองไม่เห็นหน้าตั้งค่า
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ===== AUTH RESULT DIALOG ===== -->
    <q-dialog v-model="authDialog">
      <div class="auth-dialog">
        <div
          class="auth-dialog-header"
          :class="authDialogSuccess ? 'auth-dialog-header--success' : 'auth-dialog-header--error'"
        >
          <div class="auth-dialog-header-icon">
            <q-icon
              :name="authDialogSuccess ? 'check_circle' : 'error_outline'"
              size="1.6rem"
              color="white"
            />
          </div>
          <div>
            <div class="auth-dialog-title">
              {{ authDialogSuccess ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ' }}
            </div>
            <div class="auth-dialog-sub">
              {{ authDialogSuccess ? 'กำลังนำท่านเข้าสู่ระบบ...' : 'กรุณาตรวจสอบข้อมูลอีกครั้ง' }}
            </div>
          </div>
        </div>

        <div class="auth-dialog-body">
          <div class="auth-dialog-emoji">
            {{ authDialogSuccess ? '✅' : '🔐' }}
          </div>
          <p class="auth-dialog-msg">{{ authDialogMessage }}</p>
        </div>

        <div
          :key="authDialogMessage"
          class="auth-dialog-progress"
          :class="
            authDialogSuccess ? 'auth-dialog-progress--success' : 'auth-dialog-progress--error'
          "
          :style="{ animationDuration: authDialogSuccess ? '1.8s' : '2.5s' }"
        />
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/boot/axios';
import type { AxiosError } from 'axios';
import type { QInput } from 'quasar';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMING = {
  SUCCESS_REDIRECT: 1800,
  ERROR_CLOSE: 2500,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuickRole {
  key: 'admin' | 'finance' | 'director';
  title: string;
  badge: string;
  description: string;
  icon: string;
  loginname: string;
}

interface LoginResponse {
  message: string;
  user: {
    id: number;
    loginname: string;
    name: string;
    department: string;
    idcard: string;
    role: {
      id: number;
      rolename: string;
    };
  };
  accessToken: string;
  refreshToken: string;
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = useRouter();

// ─── Form State ───────────────────────────────────────────────────────────────
const loginname = ref('');
const password = ref('');
const isPwd = ref(true);
const loading = ref(false);
const passwordInputRef = ref<QInput | null>(null);

// ─── Auth Dialog State ────────────────────────────────────────────────────────
const authDialog = ref(false);
const authDialogSuccess = ref(false);
const authDialogMessage = ref('');

// ─── Quick Roles ──────────────────────────────────────────────────────────────
const quickRoles: QuickRole[] = [
  {
    key: 'admin',
    title: 'Admin Wellness',
    badge: 'Admin',
    description: 'สิทธิ์เต็มระบบ: ตั้งค่าต้นทุน, จัดการทริป, บริหารชุดตรวจ',
    icon: 'shield',
    loginname: 'admin',
  },
  {
    key: 'finance',
    title: 'ศูนย์รายได้ / การเงิน',
    badge: 'ศูนย์รายได้',
    description: 'กรอกข้อมูลเบิกจ่าย, บันทึกการรับเงิน, อัปโหลดตรวจจริง',
    icon: 'paid',
    loginname: 'finance',
  },
  {
    key: 'director',
    title: 'ผู้อำนวยการ รพ.',
    badge: 'ผู้อำนวยการ',
    description: 'ดูรายงานภาพรวมได้อย่างเดียว (มองไม่เห็นหน้าตั้งค่า)',
    icon: 'visibility',
    loginname: 'director',
  },
];

// ─── Quick Login ──────────────────────────────────────────────────────────────
// Fills the username field and moves focus to the password field so the
// user only needs to type the password. Does not auto-submit.
const quickLogin = (role: QuickRole) => {
  loginname.value = role.loginname;
  password.value = '';
  isPwd.value = true;
  void passwordInputRef.value?.focus();
};

// ─── Auth Dialog ──────────────────────────────────────────────────────────────
const openAuthDialog = (success: boolean, message: string) => {
  authDialogSuccess.value = success;
  authDialogMessage.value = message;
  authDialog.value = true;

  setTimeout(
    () => {
      authDialog.value = false;
      if (success) void router.push('/');
    },
    success ? TIMING.SUCCESS_REDIRECT : TIMING.ERROR_CLOSE,
  );
};

// ─── Submit ───────────────────────────────────────────────────────────────────
const onSubmit = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      loginname: loginname.value.trim(),
      passweb: password.value,
    });

    const { id, loginname: uName, name, department, idcard, role } = response.data.user;
    const { accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', String(id));
    localStorage.setItem('username', uName);
    localStorage.setItem('name', name);
    localStorage.setItem('department', department);
    localStorage.setItem('idcard', idcard);
    localStorage.setItem('role', role.rolename);

    openAuthDialog(true, response.data.message || 'เข้าสู่ระบบสำเร็จ');
  } catch (err: unknown) {
    const error = err as AxiosError<{ message: string }>;
    const status = error.response?.status;
    const msg =
      status === 404 || status === 401
        ? (error.response?.data?.message ?? 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง')
        : 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';

    openAuthDialog(false, msg);
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&family=Prompt:wght@500;600;700&display=swap');

// ─── Design Tokens ────────────────────────────────────────────────────────────
$indigo: #3730a3;
$indigo-mid: #4f46e5;
$indigo-light: #818cf8;
$cyan-light: #38bdf8;
$text-main: #1e1b4b;
$text-muted: #9ca3af;

$admin-color: #7e3ff2;
$finance-color: #17a865;
$director-color: #1e6fd9;

// ─── Page ─────────────────────────────────────────────────────────────────────
.login-page {
  font-family: 'Noto Sans Thai', 'Sarabun', sans-serif;
  background: linear-gradient(150deg, #eef2ff 0%, #f5f3ff 50%, #eff6ff 100%);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

// ─── Background Blobs ─────────────────────────────────────────────────────────
.bg-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(60px);
}

.bg-blob-1 {
  width: 420px;
  height: 420px;
  background: rgba(129, 140, 248, 0.18);
  top: -110px;
  left: -110px;
  animation: drift 9s ease-in-out infinite;
}

.bg-blob-2 {
  width: 300px;
  height: 300px;
  background: rgba(56, 189, 248, 0.14);
  bottom: -80px;
  right: -60px;
  animation: drift 11s ease-in-out infinite reverse;
}

.bg-blob-3 {
  width: 200px;
  height: 200px;
  background: rgba(55, 48, 163, 0.1);
  top: 38%;
  left: 62%;
  animation: drift 7s ease-in-out infinite 2s;
}

@keyframes drift {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.06);
  }
}

// ─── Center Wrapper ───────────────────────────────────────────────────────────
.login-center {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 640px;
  animation: fadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────
.login-card {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2rem 2rem 1.75rem;
  box-shadow:
    0 8px 40px rgba(55, 48, 163, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(55, 48, 163, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.7);

  @media (max-width: 480px) {
    border-radius: 20px;
    padding: 1.5rem 1.25rem 1.25rem;
  }
}

// ─── Brand ────────────────────────────────────────────────────────────────────
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 1.5rem;
  text-align: center;
}

.brand-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(135deg, $indigo 0%, $indigo-mid 50%, $cyan-light 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 24px rgba(79, 70, 229, 0.38),
    0 0 0 4px rgba(129, 140, 248, 0.14);
  margin-bottom: 4px;
  animation: iconPop 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both 0.1s;
}

@keyframes iconPop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  80% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.brand-title {
  font-family: 'Prompt', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: $text-main;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 0.78rem;
  color: $text-muted;
  line-height: 1.5;
  max-width: 380px;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
.card-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 1rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(55, 48, 163, 0.12);
  }
}

.card-divider-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: $text-muted;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

// ─── Quick Role Cards ─────────────────────────────────────────────────────────
.role-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 1.5rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.role-card {
  text-align: left;
  border: 1px solid rgba(55, 48, 163, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  cursor: pointer;
  font-family: inherit;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(55, 48, 163, 0.1);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.role-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.role-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-icon-box--admin {
  background: rgba(126, 63, 242, 0.12);
  color: $admin-color;
}

.role-icon-box--finance {
  background: rgba(23, 168, 101, 0.12);
  color: $finance-color;
}

.role-icon-box--director {
  background: rgba(30, 111, 217, 0.12);
  color: $director-color;
}

.role-badge {
  font-weight: 500;
  font-size: 0.66rem;
}

.role-badge--admin {
  background: rgba(126, 63, 242, 0.12);
  color: $admin-color;
}

.role-badge--finance {
  background: rgba(23, 168, 101, 0.12);
  color: $finance-color;
}

.role-badge--director {
  background: rgba(30, 111, 217, 0.12);
  color: $director-color;
}

.role-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: $text-main;
  margin-bottom: 4px;
}

.role-desc {
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.4;
}

// ─── Form ─────────────────────────────────────────────────────────────────────
.login-form {
  display: flex;
  flex-direction: column;
}

.field-wrap {
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}

.styled-input {
  :deep(.q-field__control) {
    border-radius: 12px !important;
    background: rgba(238, 242, 255, 0.7) !important;
    transition: box-shadow 0.2s !important;
  }

  :deep(.q-field--focused .q-field__control) {
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14) !important;
  }
}

// ─── Submit Button ────────────────────────────────────────────────────────────
.login-btn {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, $indigo 0%, $indigo-mid 50%, $cyan-light 100%);
  color: white;
  font-family: 'Noto Sans Thai', 'Prompt', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 20px rgba(79, 70, 229, 0.38);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
  margin-top: 0.5rem;
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(79, 70, 229, 0.48);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &--loading,
  &:disabled {
    opacity: 0.72;
    cursor: not-allowed;
    transform: none;
  }
}

.login-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

// ─── Permission Note ──────────────────────────────────────────────────────────
.card-note {
  margin-top: 1.5rem;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(238, 242, 255, 0.6);
  border: 1px solid rgba(55, 48, 163, 0.08);
}

.card-note-title {
  display: flex;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 8px;
}

.note-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.6;
}

.note-list li {
  margin-bottom: 4px;
}

.note-tag {
  display: inline-block;
  font-weight: 700;
  margin-right: 4px;
}

.note-tag--admin {
  color: $admin-color;
}

.note-tag--finance {
  color: $finance-color;
}

.note-tag--director {
  color: $director-color;
}

// ─── Auth Dialog ──────────────────────────────────────────────────────────────
.auth-dialog {
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  width: 340px;
  max-width: 92vw;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
}

.auth-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.25rem 1.5rem;

  &--success {
    background: linear-gradient(135deg, #14532d, #16a34a);
  }
  &--error {
    background: linear-gradient(135deg, #7f1d1d, #dc2626);
  }
}

.auth-dialog-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-dialog-title {
  font-family: 'Prompt', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.auth-dialog-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 2px;
}

.auth-dialog-body {
  padding: 1.5rem 1.5rem 1.25rem;
  text-align: center;
}

.auth-dialog-emoji {
  font-size: 3rem;
  margin-bottom: 0.75rem;
  display: block;
  animation: authPop 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes authPop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  80% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.auth-dialog-msg {
  font-size: 0.92rem;
  font-weight: 600;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 0;
  line-height: 1.6;
  color: #374151;
  background: #f3f4f6;
}

.auth-dialog-progress {
  height: 4px;
  width: 100%;
  animation: progressShrink linear forwards;

  &--success {
    background: #16a34a;
  }
  &--error {
    background: #dc2626;
  }
}

@keyframes progressShrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>