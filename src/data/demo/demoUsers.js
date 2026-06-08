import { ROLES } from '@/shared/constants/roles'

export const demoUsers = {
  [ROLES.TRAINEE]: {
    firstName: 'Minh',
    lastName: 'Nguyen',
    email: 'minh.trainee@slp.vn',
    role: ROLES.TRAINEE,
    avatarUrl: '',
  },
  [ROLES.SME]: {
    firstName: 'Lan',
    lastName: 'Pham',
    email: 'lan.sme@slp.vn',
    role: ROLES.SME,
    avatarUrl: '',
  },
  [ROLES.TRAINER]: {
    firstName: 'An',
    lastName: 'Tran',
    email: 'an.trainer@slp.vn',
    role: ROLES.TRAINER,
    avatarUrl: '',
  },
  [ROLES.TMO]: {
    firstName: 'Ha',
    lastName: 'Le',
    email: 'ha.tmo@slp.vn',
    role: ROLES.TMO,
    avatarUrl: '',
  },
  [ROLES.ADMIN]: {
    firstName: 'Linh',
    lastName: 'Do',
    email: 'linh.admin@slp.vn',
    role: ROLES.ADMIN,
    avatarUrl: '',
  },
}