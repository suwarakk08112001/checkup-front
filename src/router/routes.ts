import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("@/pages/IndexPage.vue") }
      // { path: 'second', component: () => import('@/pages/SecondPage.vue') }
    ]
  },
  {
    path: "/",
    component: () => import("@/layouts/UserLayout.vue"),
    children: [
      {
        path: "dashboard",
        component: () => import("@/pages/DashboardPage.vue")
      },
      {
        path: "expenses",
        component: () => import("@/pages/ExpensePage.vue")
      }
      // { path: 'second', component: () => import('@/pages/SecondPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("@/pages/ErrorNotFound.vue")
  }
];

export default routes;
