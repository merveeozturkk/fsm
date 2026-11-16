import { Company, Technician, Customer, Job } from '@/types';

export const mockCompany: Company = {
  id: 'comp-1',
  name: 'Ege İklimlendirme & Kombi Servisi',
  slug: 'ege-iklimlendirme',
  phone: '0850 304 20 20',
  city: 'İstanbul',
  sector: 'Kombi & Klima Teknik Servisi',
  subscriptionPlan: 'pro'
};

export const mockTechnicians: Technician[] = [
  {
    id: 'tech-1',
    companyId: 'comp-1',
    name: 'Ahmet Yılmaz (Usta)',
    phone: '0532 555 10 21',
    role: 'technician',
    status: 'busy',
    vehiclePlate: '34 TB 4102',
    currentAddress: 'Kadıköy, Moda Cad.',
    todayCompletedCount: 3
  },
  {
    id: 'tech-2',
    companyId: 'comp-1',
    name: 'Murat Demir (Usta)',
    phone: '0544 222 34 56',
    role: 'technician',
    status: 'active',
    vehiclePlate: '34 AB 7891',
    currentAddress: 'Üsküdar Meydan',
    todayCompletedCount: 2
  },
  {
    id: 'tech-3',
    companyId: 'comp-1',
    name: 'Serkan Öztürk (Klima Uzmanı)',
    phone: '0555 987 65 43',
    role: 'technician',
    status: 'busy',
    vehiclePlate: '34 VR 1120',
    currentAddress: 'Ataşehir, Barbaros Mah.',
    todayCompletedCount: 4
  }
];

export const initialJobs: Job[] = [
  {
    id: 'job-1',
    companyId: 'comp-1',
    jobCode: 'SJ-2041',
    customerId: 'cust-1',
    customer: {
      id: 'cust-1',
      companyId: 'comp-1',
      name: 'Mehmet Kaya',
      phone: '0530 111 22 33',
      district: 'Kadıköy',
      address: 'Caferağa Mah. Sakız Sk. No: 14 D: 3'
    },
    technicianId: 'tech-1',
    technician: mockTechnicians[0],
    deviceType: 'kombi',
    brandModel: 'Vaillant ecoTEC Plus',
    faultDescription: 'F28 Arıza kodu veriyor, petekler ısınmıyor, sıcak su gelmiyor.',
    status: 'in_progress',
    priority: 'urgent',
    createdAt: 'Bugün 09:15',
    scheduledTime: '10:30',
    startedAt: '10:45',
    laborCost: 1200,
    partsCost: 1800,
    totalAmount: 3000,
    paymentMethod: 'nakit',
    paymentStatus: 'pending',
    technicianNotes: 'Ateşleme elektrodu ve gaz valfi kontrol edildi. Valf bobini değişti.',
    parts: [
      { id: 'part-1', name: 'Vaillant Ateşleme Elektrodu', price: 650 },
      { id: 'part-2', name: 'Gaz Valfi Bobini', price: 1150 }
    ],
    photos: []
  },
  {
    id: 'job-2',
    companyId: 'comp-1',
    jobCode: 'SJ-2042',
    customerId: 'cust-2',
    customer: {
      id: 'cust-2',
      companyId: 'comp-1',
      name: 'Ayşe Yıldız',
      phone: '0542 999 88 77',
      district: 'Ataşehir',
      address: 'Barbaros Mah. Mor Zambak Sk. No: 8 D: 12'
    },
    technicianId: 'tech-3',
    technician: mockTechnicians[2],
    deviceType: 'klima',
    brandModel: 'Daikin Inverter 18000 BTU',
    faultDescription: 'İç ünite su damlatıyor ve yeterli soğutmuyor.',
    status: 'in_transit',
    priority: 'normal',
    createdAt: 'Bugün 10:30',
    scheduledTime: '12:00',
    laborCost: 1500,
    partsCost: 0,
    totalAmount: 1500,
    paymentStatus: 'pending',
    parts: [],
    photos: []
  },
  {
    id: 'job-3',
    companyId: 'comp-1',
    jobCode: 'SJ-2043',
    customerId: 'cust-3',
    customer: {
      id: 'cust-3',
      companyId: 'comp-1',
      name: 'Barış Koç',
      phone: '0533 444 55 66',
      district: 'Üsküdar',
      address: 'Mimar Sinan Mah. Hakimiyet-i Milliye Cad. No: 45'
    },
    technicianId: 'tech-2',
    technician: mockTechnicians[1],
    deviceType: 'kombi',
    brandModel: 'E.C.A Proteus Premix',
    faultDescription: 'Yıllık periyodik kombi ve petek bakımı.',
    status: 'completed',
    priority: 'normal',
    createdAt: 'Bugün 08:30',
    scheduledTime: '09:00',
    startedAt: '09:10',
    completedAt: '10:20',
    laborCost: 1800,
    partsCost: 0,
    totalAmount: 1800,
    paymentMethod: 'havale',
    paymentStatus: 'paid',
    technicianNotes: 'Genleşme tankı havası basıldı, filtreler temizlendi, yanma odası vakumlandı.',
    parts: [],
    photos: []
  },
  {
    id: 'job-4',
    companyId: 'comp-1',
    jobCode: 'SJ-2044',
    customerId: 'cust-4',
    customer: {
      id: 'cust-4',
      companyId: 'comp-1',
      name: 'Dr. Selim Erdem',
      phone: '0532 777 66 55',
      district: 'Beşiktaş',
      address: 'Abbasağa Mah. Ihlamur Cad. No: 20 D: 4'
    },
    deviceType: 'kombi',
    brandModel: 'DemirDöküm Nitromix',
    faultDescription: 'Basınç sürekli düşüyor, 1 barın altına inince hata verip duruyor.',
    status: 'pending',
    priority: 'urgent',
    createdAt: 'Bugün 11:15',
    scheduledTime: '13:30',
    laborCost: 1000,
    partsCost: 0,
    totalAmount: 1000,
    paymentStatus: 'pending',
    parts: [],
    photos: []
  }
];
