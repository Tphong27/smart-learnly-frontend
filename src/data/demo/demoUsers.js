import { ROLES } from '@/shared/constants/roles'

export const demoUsers = {
  [ROLES.TRAINEE]: {
    id: 'trainee-minh',
    firstName: 'Minh',
    lastName: 'Nguyen',
    displayName: 'Minh Nguyen',
    email: 'minh.trainee@slp.vn',
    role: ROLES.TRAINEE,
    avatarUrl: '',
  },
  [ROLES.SME]: {
    id: 'sme-lan',
    firstName: 'Lan',
    lastName: 'Pham',
    displayName: 'Lan Pham',
    email: 'lan.sme@slp.vn',
    role: ROLES.SME,
    avatarUrl: '',
  },
  [ROLES.TRAINER]: {
    id: 'trainer-an',
    firstName: 'An',
    lastName: 'Tran',
    displayName: 'An Tran',
    email: 'an.trainer@slp.vn',
    role: ROLES.TRAINER,
    avatarUrl: '',
  },
  [ROLES.TMO]: {
    id: 'tmo-ha',
    firstName: 'Ha',
    lastName: 'Le',
    displayName: 'Ha Le',
    email: 'ha.tmo@slp.vn',
    role: ROLES.TMO,
    avatarUrl: '',
  },
  [ROLES.ADMIN]: {
    id: 'admin-linh',
    firstName: 'Linh',
    lastName: 'Do',
    displayName: 'Linh Do',
    email: 'linh.admin@slp.vn',
    role: ROLES.ADMIN,
    avatarUrl: '',
  },
}

export const demoTrainees = [
  {
    id: 'trainee-minh',
    displayName: 'Minh Nguyen',
    email: 'minh.trainee@slp.vn',
    role: ROLES.TRAINEE,
    avatarUrl: '',
  },
  {
    id: 'trainee-huyen',
    displayName: 'Huyen Tran',
    email: 'huyen.trainee@slp.vn',
    role: ROLES.TRAINEE,
    avatarUrl: '',
  },
  {
    id: 'trainee-bao',
    displayName: 'Bao Le',
    email: 'bao.trainee@slp.vn',
    role: ROLES.TRAINEE,
    avatarUrl: '',
  },
]
