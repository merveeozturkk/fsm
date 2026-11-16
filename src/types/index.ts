export type UserRole = 'owner' | 'manager' | 'technician';

export type JobStatus = 
  | 'pending'       // Beklemede (Usta atanmamış)
  | 'assigned'      // Usta Atandı
  | 'in_transit'    // Usta Yolda
  | 'in_progress'   // Adreste / İşlem Sürüyor
  | 'completed'     // Tamamlandı
  | 'cancelled';    // İptal Edildi

export type DeviceType = 
  | 'kombi'
  | 'klima'
  | 'beyaz_esya'
  | 'asansor'
  | 'su_aritma'
  | 'diger';

export type PaymentMethod = 'nakit' | 'havale' | 'pos' | 'garanti_kapsami';

export interface Company {
  id: string;
  name: string;
  slug: string;
  phone: string;
  city: string;
  sector: string;
  subscriptionPlan: 'free_trial' | 'starter' | 'pro';
}

export interface Technician {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'busy' | 'offline';
  vehiclePlate?: string;
  currentAddress?: string;
  todayCompletedCount: number;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  district: string;
  address: string;
}

export interface JobPart {
  id: string;
  name: string;
  price: number;
}

export interface Job {
  id: string;
  companyId: string;
  jobCode: string;
  customerId: string;
  customer: Customer;
  technicianId?: string;
  technician?: Technician;
  deviceType: DeviceType;
  brandModel?: string;
  faultDescription: string;
  status: JobStatus;
  priority: 'normal' | 'urgent';
  createdAt: string;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
  laborCost: number;
  partsCost: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  technicianNotes?: string;
  parts: JobPart[];
  photos: string[];
}
