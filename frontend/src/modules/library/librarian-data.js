export const CATALOG_ITEMS = [
  {
    id: 'bk-1001',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    subject: 'Algorithms',
    location: 'Main Library',
    availability: 'available',
    format: 'Print',
    year: 2022,
    copies: 3,
    barcode: 'LIB-ALG-1001',
  },
  {
    id: 'bk-1002',
    title: 'Database System Concepts',
    author: 'Abraham Silberschatz',
    isbn: '9780073523323',
    subject: 'Databases',
    location: 'Main Library',
    availability: 'checked-out',
    format: 'Print',
    year: 2021,
    copies: 1,
    barcode: 'LIB-DB-1002',
  },
  {
    id: 'bk-1003',
    title: 'Operating System Concepts',
    author: 'Abraham Silberschatz',
    isbn: '9781118063330',
    subject: 'Systems',
    location: 'Reading Room',
    availability: 'available',
    format: 'Print',
    year: 2020,
    copies: 2,
    barcode: 'LIB-OS-1003',
  },
  {
    id: 'bk-1004',
    title: 'Deep Learning with Python',
    author: 'Francois Chollet',
    isbn: '9781617296864',
    subject: 'Machine Learning',
    location: 'Digital Shelf',
    availability: 'available',
    format: 'E-Book',
    year: 2023,
    copies: 999,
    barcode: 'LIB-ML-1004',
  },
  {
    id: 'bk-1005',
    title: 'Human Computer Interaction',
    author: 'Alan Dix',
    isbn: '9781292142137',
    subject: 'HCI',
    location: 'Main Library',
    availability: 'on-hold',
    format: 'Print',
    year: 2019,
    copies: 2,
    barcode: 'LIB-HCI-1005',
  },
  {
    id: 'bk-1006',
    title: 'Research Methods in Computing',
    author: 'John W. Creswell',
    isbn: '9781506386706',
    subject: 'Research',
    location: 'Reading Room',
    availability: 'available',
    format: 'Print',
    year: 2024,
    copies: 4,
    barcode: 'LIB-RES-1006',
  },
]

export const CIRCULATION_LOANS = [
  {
    id: 'loan-001',
    member: 'Muntasir Rahman',
    title: 'Database System Concepts',
    barcode: 'LIB-DB-1002',
    dueDate: '2026-05-26',
    renewals: 1,
    status: 'checked-out',
  },
  {
    id: 'loan-002',
    member: 'Ayesha Farin',
    title: 'Human Computer Interaction',
    barcode: 'LIB-HCI-1005',
    dueDate: '2026-05-21',
    renewals: 2,
    status: 'overdue',
  },
  {
    id: 'loan-003',
    member: 'Samiul Hassan',
    title: 'Operating System Concepts',
    barcode: 'LIB-OS-1003',
    dueDate: '2026-05-30',
    renewals: 0,
    status: 'checked-out',
  },
]

export const DUE_ALERTS = [
  {
    id: 'due-1',
    member: 'Ayesha Farin',
    title: 'Human Computer Interaction',
    dueDate: '2026-05-21',
    daysUntilDue: -2,
    status: 'overdue',
  },
  {
    id: 'due-2',
    member: 'Muntasir Rahman',
    title: 'Database System Concepts',
    dueDate: '2026-05-26',
    daysUntilDue: 3,
    status: 'due-soon',
  },
  {
    id: 'due-3',
    member: 'Samiul Hassan',
    title: 'Operating System Concepts',
    dueDate: '2026-05-30',
    daysUntilDue: 7,
    status: 'scheduled',
  },
]

export const FINES = [
  {
    id: 'fine-1',
    member: 'Ayesha Farin',
    total: 120,
    status: 'unpaid',
    items: [
      { title: 'Human Computer Interaction', daysLate: 2, amount: 120 },
    ],
  },
  {
    id: 'fine-2',
    member: 'Muntasir Rahman',
    total: 40,
    status: 'unpaid',
    items: [
      { title: 'Database System Concepts', daysLate: 1, amount: 40 },
    ],
  },
]

export const HOLD_REQUESTS = [
  {
    id: 'hold-1',
    member: 'Tania Kabir',
    title: 'Introduction to Algorithms',
    placedAt: '2026-05-17',
    position: 1,
    status: 'queued',
  },
  {
    id: 'hold-2',
    member: 'Farhan Chowdhury',
    title: 'Human Computer Interaction',
    placedAt: '2026-05-16',
    position: 2,
    status: 'queued',
  },
]

export const WISHLISTS = [
  {
    id: 'wish-1',
    member: 'Shawon Islam',
    title: 'Deep Learning with Python',
    status: 'watching',
    updatedAt: '2026-05-14',
  },
  {
    id: 'wish-2',
    member: 'Maliha Sultana',
    title: 'Research Methods in Computing',
    status: 'notified',
    updatedAt: '2026-05-12',
  },
]

export const BORROW_HISTORY = [
  {
    id: 'hist-1',
    member: 'Ayesha Farin',
    title: 'Human Computer Interaction',
    checkoutDate: '2026-05-01',
    returnDate: null,
    status: 'overdue',
  },
  {
    id: 'hist-2',
    member: 'Muntasir Rahman',
    title: 'Database System Concepts',
    checkoutDate: '2026-05-06',
    returnDate: null,
    status: 'checked-out',
  },
  {
    id: 'hist-3',
    member: 'Samiul Hassan',
    title: 'Operating System Concepts',
    checkoutDate: '2026-04-10',
    returnDate: '2026-04-21',
    status: 'returned',
  },
]

export const REPORT_CARDS = [
  {
    id: 'report-1',
    title: 'Circulation Summary',
    description: 'Daily and monthly lending volume by location and item type.',
    format: 'PDF / Excel',
  },
  {
    id: 'report-2',
    title: 'Overdue Accounts',
    description: 'Members with active overdue loans and outstanding fines.',
    format: 'CSV',
  },
  {
    id: 'report-3',
    title: 'Popular Titles',
    description: 'Top 25 borrowed items across the last 90 days.',
    format: 'PDF',
  },
  {
    id: 'report-4',
    title: 'Inventory Health',
    description: 'Items with low availability or damaged status.',
    format: 'Excel',
  },
]

export const BULK_IMPORT_LOGS = [
  {
    id: 'imp-1',
    file: 'cse-catalog-2026.csv',
    status: 'complete',
    total: 280,
    added: 264,
    duplicates: 12,
    errors: 4,
  },
  {
    id: 'imp-2',
    file: 'research-archive.marc',
    status: 'pending',
    total: 120,
    added: 0,
    duplicates: 0,
    errors: 0,
  },
]
