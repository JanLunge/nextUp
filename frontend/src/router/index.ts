import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/presenter/CreateRoom.vue'),
  },
  {
    path: '/room/:roomId',
    name: 'presenter',
    component: () => import('@/pages/presenter/PresenterView.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/admin',
    name: 'admin',
    component: () => import('@/pages/admin/AdminController.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/admin/spatial',
    name: 'spatialMapping',
    component: () => import('@/pages/admin/SpatialMapping.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/timer',
    name: 'timer',
    component: () => import('@/pages/timer/TimerView.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/join',
    name: 'join',
    component: () => import('@/pages/participant/JoinRoom.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/app',
    name: 'roomView',
    component: () => import('@/pages/participant/RoomView.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/submit',
    name: 'submit',
    component: () => import('@/pages/participant/SubmitForm.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/my-submission',
    name: 'mySubmission',
    component: () => import('@/pages/participant/MySubmission.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/presenter/:participantId',
    name: 'presenterDetail',
    component: () => import('@/pages/participant/PresenterDetail.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/waves',
    name: 'waves',
    component: () => import('@/pages/participant/WavesView.vue'),
    props: true,
  },
  {
    path: '/test/spatial',
    name: 'spatialMock',
    component: () => import('@/pages/test/SpatialMock.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
