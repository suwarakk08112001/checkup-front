<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="header-gradient">
      <q-toolbar class="q-py-sm header-toolbar">
        <div class="header-icon-box q-mr-sm">
          <q-icon name="local_hospital" size="24px" />
        </div>

        <div class="column header-text">
          <div class="row items-center q-gutter-x-xs">
            <div class="text-weight-bold header-title">โรงพยาบาลปะเหลียน</div>
            <q-badge rounded class="header-badge">
              PLH Wellness Center
            </q-badge>
          </div>
          <div class="header-subtitle">
            ระบบบริหารจัดการต้นทุนและรายได้การออกหน่วยตรวจสุขภาพเคลื่อนที่
            (Mobile Checkup)
          </div>
        </div>

        <q-space />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
//
</script>

<style scoped>
.header-gradient {
  background: linear-gradient(90deg, #006ea6 0%, #0077b7 50%, #0085cb 100%);
}

.header-toolbar {
  min-height: 64px;
  flex-wrap: nowrap;
}

.header-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.header-text {
  min-width: 0;
  flex-shrink: 1;
}

.header-title {
  font-size: 1.1rem;
  line-height: 1.3;
  white-space: nowrap;
}

.header-badge {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 500;
  padding: 3px 9px;
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.header-subtitle {
  opacity: 0.9;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}

/* Tablet */
@media (max-width: 768px) {
  .header-icon-box {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 8px;
  }

  .header-title {
    font-size: 0.95rem;
  }

  .header-badge {
    font-size: 0.65rem;
    padding: 2px 7px;
  }

  .header-subtitle {
    font-size: 0.65rem;
  }
}

/* Mobile: show everything, just compact and wrap */
@media (max-width: 599px) {
  .header-toolbar {
    min-height: 56px;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .header-icon-box {
    width: 30px;
    height: 30px;
    min-width: 30px;
    border-radius: 7px;
  }

  .header-title {
    font-size: 0.8rem;
    white-space: normal;
  }

  .header-badge {
    font-size: 0.6rem;
    padding: 1px 6px;
  }

  .row.items-center.q-gutter-x-xs {
    flex-wrap: wrap;
    row-gap: 2px;
  }

  .header-subtitle {
    font-size: 0.6rem;
  }
}
</style>
