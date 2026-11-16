import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const SyncService = {
  async saveLocal(key: string, data: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  async loadLocal(key: string) {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn('Storage load error:', e);
      return null;
    }
  },

  async syncJobToCloud(job: any, companyCode: string) {
    try {
      if (!supabase) return;
      const { error } = await supabase.from('jobs').upsert({
        job_code: job.jobCode,
        company_code: companyCode,
        customer_name: job.customerName,
        customer_phone: job.customerPhone,
        district: job.district,
        address: job.address,
        device_type: job.deviceType,
        fault_description: job.faultDescription,
        status: job.status,
        labor_cost: job.laborCost,
        parts_cost: job.partsCost,
        total_amount: job.totalAmount,
        payment_method: job.paymentMethod,
        notes: job.notes
      }, { onConflict: 'job_code' });
      if (error) console.log('Supabase sync warning:', error.message);
    } catch (e) {
      // Çevrimdışıysa sessizce devam eder
    }
  },

  async fetchJobsFromCloud(companyCode: string) {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_code', companyCode);

      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        companyId: d.company_code,
        jobCode: d.job_code,
        customerName: d.customer_name || 'Müşteri',
        customerPhone: d.customer_phone || '',
        district: d.district || '',
        address: d.address || '',
        deviceType: d.device_type || 'Kombi',
        brandModel: d.brand_model || 'Standart',
        faultDescription: d.fault_description || '',
        technicianId: d.technician_id || '',
        status: d.status || 'assigned',
        laborCost: d.labor_cost || 0,
        partsCost: d.parts_cost || 0,
        totalAmount: d.total_amount || 0,
        paymentMethod: d.payment_method,
        notes: d.notes
      }));
    } catch (e) {
      return null;
    }
  }
};
