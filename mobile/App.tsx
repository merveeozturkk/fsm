import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SyncService } from './src/lib/syncService';
import { supabase } from './src/lib/supabase';
import { requestNotificationPermissions, triggerJobNotification } from './src/lib/notificationService';
import { CatalogItem, DEFAULT_CATALOG, loadCatalog, saveCatalog } from './src/lib/catalogService';

interface User {
  id: string;
  name: string;
  phone: string;
  pass: string;
  role: 'owner' | 'technician';
  companyId: string;
  companyName: string;
  companyCode: string;
  vehiclePlate?: string;
}

interface Technician {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  status: 'busy' | 'available';
  completedCount: number;
}

interface Job {
  id: string;
  companyId: string;
  jobCode: string;
  customerName: string;
  customerPhone: string;
  district: string;
  address: string;
  deviceType: string;
  brandModel: string;
  faultDescription: string;
  technicianId: string;
  status: 'assigned' | 'in_transit' | 'in_progress' | 'completed';
  laborCost: number;
  partsCost: number;
  totalAmount: number;
  paymentMethod?: 'nakit' | 'havale' | 'pos' | 'garanti';
  notes?: string;
  photoOld?: string;
  photoNew?: string;
  completedDate?: string;
  isMaintenanceReminder?: boolean;
}

const initialUsers: User[] = [
  {
    id: 'user-demo-owner',
    name: 'Ali Kaya',
    phone: '05321002030',
    pass: '1234',
    role: 'owner',
    companyId: 'comp-ege',
    companyName: 'Ege İklimlendirme',
    companyCode: 'EGE34'
  },
  {
    id: 'user-demo-tech',
    name: 'Ahmet Yılmaz',
    phone: '05325551021',
    pass: '1234',
    role: 'technician',
    companyId: 'comp-ege',
    companyName: 'Ege İklimlendirme',
    companyCode: 'EGE34',
    vehiclePlate: '34 TB 4102'
  }
];

const initialTechs: Technician[] = [
  {
    id: 'user-demo-tech',
    companyId: 'comp-ege',
    name: 'Ahmet Yılmaz (Usta)',
    phone: '05325551021',
    vehiclePlate: '34 TB 4102',
    status: 'busy',
    completedCount: 2
  },
  {
    id: 'tech-2',
    companyId: 'comp-ege',
    name: 'Murat Demir (Usta)',
    phone: '05442223456',
    vehiclePlate: '34 AB 7891',
    status: 'available',
    completedCount: 1
  }
];

const initialJobs: Job[] = [
  {
    id: 'job-1',
    companyId: 'comp-ege',
    jobCode: 'SJ-101',
    customerName: 'Mehmet Kaya',
    customerPhone: '05301112233',
    district: 'Kadıköy',
    address: 'Moda Cad. No: 14 D: 3',
    deviceType: 'Kombi',
    brandModel: 'Vaillant ecoTEC',
    faultDescription: 'F28 Arızası veriyor, gaz valfi arızalı.',
    technicianId: 'user-demo-tech',
    status: 'in_progress',
    laborCost: 1200,
    partsCost: 800,
    totalAmount: 2000
  },
  {
    id: 'job-old-maintenance',
    companyId: 'comp-ege',
    jobCode: 'SJ-089',
    customerName: 'Selin Doğan',
    customerPhone: '05359998877',
    district: 'Ataşehir',
    address: 'Barbaros Mah. No: 12',
    deviceType: 'Klima',
    brandModel: 'Daikin Inverter',
    faultDescription: 'Yıllık genel klima gazı dolumu ve filtre bakımı.',
    technicianId: 'user-demo-tech',
    status: 'completed',
    laborCost: 1500,
    partsCost: 0,
    totalAmount: 1500,
    paymentMethod: 'havale',
    completedDate: '11 Ay Önce (16 Aralık 2025)',
    isMaintenanceReminder: true
  }
];

export default function App() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechs);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Patron için: jobs | customers | team | profile
  // Usta için: task | history | profile
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'team' | 'task' | 'history' | 'profile'>('jobs');

  // Filtreler
  const [jobFilter, setJobFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Bildirim Toast
  const [inAppToast, setInAppToast] = useState<{ title: string; message: string } | null>(null);

  // Fiyat & Parça Kataloğu
  const [catalog, setCatalog] = useState<CatalogItem[]>(DEFAULT_CATALOG);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'Tümü' | 'Kombi' | 'Klima' | 'Beyaz Eşya' | 'Genel'>('Tümü');
  const [isAddCatalogItemOpen, setIsAddCatalogItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState<'Kombi' | 'Klima' | 'Beyaz Eşya' | 'Genel'>('Kombi');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState('');

  // Usta Parça Seçme Modalı
  const [isPickPartModalOpen, setIsPickPartModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Abonelik & PayTR
  const [subscriptionTier, setSubscriptionTier] = useState<'trial' | 'standard' | 'pro' | 'yearly'>('trial');
  const [trialDaysLeft, setTrialDaysLeft] = useState(12);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subModalStep, setSubModalStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'pro' | 'yearly'>('pro');
  const [cardHolder, setCardHolder] = useState('Ali Kaya');
  const [cardNumber, setCardNumber] = useState('4543 •••• •••• 9821');
  const [cardExp, setCardExp] = useState('11/28');
  const [cardCvv, setCardCvv] = useState('834');
  const [isPaying, setIsPaying] = useState(false);

  // STORAGE & BULUT BAŞLATMA
  useEffect(() => {
    async function initStorage() {
      await requestNotificationPermissions();

      const savedUser = await SyncService.loadLocal('@servisjet_current_user');
      const savedUsers = await SyncService.loadLocal('@servisjet_users');
      const savedJobs = await SyncService.loadLocal('@servisjet_jobs');
      const savedTechs = await SyncService.loadLocal('@servisjet_techs');
      const savedSubTier = await SyncService.loadLocal('@servisjet_sub_tier');

      if (savedUsers) setUsers(savedUsers);
      if (savedJobs) setJobs(savedJobs);
      if (savedTechs) setTechnicians(savedTechs);
      if (savedSubTier) setSubscriptionTier(savedSubTier);

      if (savedUser) {
        setCurrentUser(savedUser);
        setActiveTab(savedUser.role === 'owner' ? 'jobs' : 'task');

        const cat = await loadCatalog(savedUser.companyCode || 'EGE34');
        setCatalog(cat);

        const cloudJobs = await SyncService.fetchJobsFromCloud(savedUser.companyId);
        if (cloudJobs && cloudJobs.length > 0) {
          setJobs(cloudJobs);
        }
      }
    }
    initStorage();
  }, []);

  // GERÇEK ZAMANLI REALTIME
  useEffect(() => {
    if (!currentUser?.companyId || !supabase) return;

    try {
      const channel = supabase
        .channel(`company_${currentUser.companyId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jobs', filter: `company_id=eq.${currentUser.companyId}` },
          async () => {
            const freshJobs = await SyncService.fetchJobsFromCloud(currentUser.companyId);
            if (freshJobs) setJobs(freshJobs);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      // offline
    }
  }, [currentUser?.companyId]);

  useEffect(() => { SyncService.saveLocal('@servisjet_users', users); }, [users]);
  useEffect(() => { SyncService.saveLocal('@servisjet_jobs', jobs); }, [jobs]);
  useEffect(() => { SyncService.saveLocal('@servisjet_techs', technicians); }, [technicians]);
  useEffect(() => {
    if (currentUser) {
      SyncService.saveLocal('@servisjet_current_user', currentUser);
    } else {
      SyncService.saveLocal('@servisjet_current_user', null);
    }
  }, [currentUser]);

  // Auth States
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [regRole, setRegRole] = useState<'owner' | 'technician'>('owner');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');
  const [regPlate, setRegPlate] = useState('');

  // Modallar
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isAddTechOpen, setIsAddTechOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedJobForPay, setSelectedJobForPay] = useState<Job | null>(null);

  // İş Formu
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDistrict, setCDistrict] = useState('Kadıköy');
  const [cAddress, setCAddress] = useState('');
  const [cDevice, setCDevice] = useState('Kombi');
  const [cFault, setCFault] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [matchedOldCustomer, setMatchedOldCustomer] = useState<Job | null>(null);

  // Usta Ekleme
  const [newTechName, setNewTechName] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechPlate, setNewTechPlate] = useState('');
  const [newTechPass, setNewTechPass] = useState('1234');

  // Tahsilat & Fotoğraflar
  const [laborInput, setLaborInput] = useState('1000');
  const [partsInput, setPartsInput] = useState('0');
  const [notesInput, setNotesInput] = useState('');
  const [payMethod, setPayMethod] = useState<'nakit' | 'havale' | 'pos' | 'garanti'>('nakit');
  const [photoOld, setPhotoOld] = useState<string | null>(null);
  const [photoNew, setPhotoNew] = useState<string | null>(null);

  // Telefon girilince müşteri hafızası
  const handlePhoneChange = (text: string) => {
    setCPhone(text);
    const clean = text.trim().replace(/[^0-9]/g, '');
    if (clean.length >= 7) {
      const pastJob = jobs.find(j => j.companyId === currentUser?.companyId && j.customerPhone.replace(/[^0-9]/g, '').slice(-10).includes(clean));
      if (pastJob) {
        setMatchedOldCustomer(pastJob);
      } else {
        setMatchedOldCustomer(null);
      }
    } else {
      setMatchedOldCustomer(null);
    }
  };

  const handleAutoFillOldCustomer = () => {
    if (!matchedOldCustomer) return;
    setCName(matchedOldCustomer.customerName);
    setCDistrict(matchedOldCustomer.district);
    setCAddress(matchedOldCustomer.address);
    setCDevice(matchedOldCustomer.deviceType);
    setMatchedOldCustomer(null);
    Alert.alert('Hafıza Yüklendi', `${matchedOldCustomer.customerName} adres ve cihaz bilgileri otomatik dolduruldu.`);
  };

  // Müşteriler Sekmesinden Hızlı İş Açma
  const handleOpenJobForCustomer = (cust: { name: string; phone: string; district: string; address: string; device: string }) => {
    setCName(cust.name);
    setCPhone(cust.phone);
    setCDistrict(cust.district);
    setCAddress(cust.address);
    setCDevice(cust.device);
    setCFault('');
    setIsNewJobOpen(true);
  };

  // Fotoğraf Çekme
  const handlePickPhoto = async (type: 'old' | 'new') => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Kamera izni verilmeden fotoğraf çekilemez.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'old') setPhotoOld(result.assets[0].uri);
      else setPhotoNew(result.assets[0].uri);
    }
  };

  // WhatsApp Dijital Servis Fişi
  const handleSendWhatsAppReceipt = (job: Job) => {
    const cleanPhone = job.customerPhone.replace(/[^0-9]/g, '').slice(-10);
    const dateStr = new Date().toLocaleDateString('tr-TR');

    const msg = 
`=============================
🛠️ SERVİS FİŞİ & GARANTİ BELGESİ
Firma: ${currentUser?.companyName || 'ServisJet'}
İş Kodu: ${job.jobCode} | Tarih: ${dateStr}
-----------------------------
Sayın ${job.customerName},
Cihaz: ${job.deviceType} (${job.brandModel})
Yapılan İşlem: ${job.notes || job.faultDescription}
İşçilik: ${job.laborCost} ₺ | Parça: ${job.partsCost} ₺
Toplam Tutar: ${job.totalAmount} ₺ (${job.paymentMethod?.toUpperCase()} - Tahsil Edildi)
-----------------------------
🛡️ GARANTİ BELGESİ:
Değişen parçalarımız firmamız tarafından 1 YIL GARANTİLİDİR.
Teknisyen: ${currentUser?.name}
İletişim: ${currentUser?.phone}
=============================
Bizi tercih ettiğiniz için teşekkür ederiz!`;

    Linking.openURL(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  // Giriş
  const handleLogin = async () => {
    const cleanPhone = loginPhone.trim().replace(/[^0-9]/g, '');
    const cleanPass = loginPass.trim();
    if (!cleanPhone || !cleanPass) {
      Alert.alert('Eksik Bilgi', 'Telefon ve şifrenizi girin.');
      return;
    }
    const found = users.find(u => u.phone.replace(/[^0-9]/g, '') === cleanPhone && u.pass === cleanPass);
    if (found) {
      setCurrentUser(found);
      setActiveTab(found.role === 'owner' ? 'jobs' : 'task');
      await requestNotificationPermissions();
      const cat = await loadCatalog(found.companyCode || 'EGE34');
      setCatalog(cat);
    } else {
      Alert.alert('Hatalı Giriş', 'Telefon numarası veya şifre eşleşmedi.');
    }
  };

  // Kayıt
  const handleRegister = async () => {
    const cleanPhone = regPhone.trim().replace(/[^0-9]/g, '');
    const cleanPass = regPass.trim();
    if (!regName.trim() || !cleanPhone || !cleanPass) {
      Alert.alert('Eksik Bilgi', 'Ad, telefon ve şifre zorunludur.');
      return;
    }
    if (users.some(u => u.phone.replace(/[^0-9]/g, '') === cleanPhone)) {
      Alert.alert('Uyarı', 'Bu telefon numarası zaten kayıtlı.');
      return;
    }

    if (regRole === 'owner') {
      if (!regCompany.trim()) {
        Alert.alert('Eksik Bilgi', 'Firma adı gereklidir.');
        return;
      }
      const newCompId = `comp-${Date.now()}`;
      const code = regCompany.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: regName.trim(),
        phone: cleanPhone,
        pass: cleanPass,
        role: 'owner',
        companyId: newCompId,
        companyName: regCompany.trim(),
        companyCode: code
      };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setActiveTab('jobs');
      await requestNotificationPermissions();
      Alert.alert('Şirketiniz Kuruldu!', `Ekip Davet Kodunuz: ${code}`);
    } else {
      const inviteCodeUpper = regInviteCode.trim().toUpperCase();
      const matchedOwner = users.find(u => u.role === 'owner' && u.companyCode === inviteCodeUpper);
      if (!matchedOwner && inviteCodeUpper !== 'EGE34') {
        Alert.alert('Geçersiz Kod', 'Girdiğiniz davet koduna ait firma bulunamadı.');
        return;
      }
      const compId = matchedOwner ? matchedOwner.companyId : 'comp-ege';
      const compName = matchedOwner ? matchedOwner.companyName : 'Ege İklimlendirme';
      const newTechId = `tech-${Date.now()}`;
      const newUser: User = {
        id: newTechId,
        name: regName.trim(),
        phone: cleanPhone,
        pass: cleanPass,
        role: 'technician',
        companyId: compId,
        companyName: compName,
        companyCode: inviteCodeUpper,
        vehiclePlate: regPlate.trim() || 'Şahsi Araç'
      };
      const newTechObj: Technician = {
        id: newTechId,
        companyId: compId,
        name: regName.trim(),
        phone: cleanPhone,
        vehiclePlate: regPlate.trim() || 'Şahsi Araç',
        status: 'available',
        completedCount: 0
      };
      setUsers([...users, newUser]);
      setTechnicians([...technicians, newTechObj]);
      setCurrentUser(newUser);
      setActiveTab('task');
      await requestNotificationPermissions();
      Alert.alert('Hoş Geldiniz!', `${compName} ekibine dahil oldunuz.`);
    }
  };

  // Usta Ekleme
  const handleAddTech = () => {
    if (!currentUser || currentUser.role !== 'owner') return;
    if (!newTechName.trim() || !newTechPhone.trim()) {
      Alert.alert('Eksik Bilgi', 'Usta adı ve telefonu gereklidir.');
      return;
    }
    const techId = `tech-${Date.now()}`;
    const cleanPhone = newTechPhone.trim().replace(/[^0-9]/g, '');
    const newTechObj: Technician = {
      id: techId,
      companyId: currentUser.companyId,
      name: newTechName.trim(),
      phone: cleanPhone,
      vehiclePlate: newTechPlate.trim() || 'Şahsi Araç',
      status: 'available',
      completedCount: 0
    };
    const newTechUser: User = {
      id: techId,
      name: newTechName.trim(),
      phone: cleanPhone,
      pass: newTechPass || '1234',
      role: 'technician',
      companyId: currentUser.companyId,
      companyName: currentUser.companyName,
      companyCode: currentUser.companyCode,
      vehiclePlate: newTechPlate.trim() || 'Şahsi Araç'
    };
    setTechnicians([...technicians, newTechObj]);
    setUsers([...users, newTechUser]);
    setIsAddTechOpen(false);
    setNewTechName('');
    setNewTechPhone('');
    setNewTechPlate('');
    Alert.alert('Usta Eklendi', `${newTechObj.name} kaydedildi.`);
  };

  // Yeni İş Açma
  const handleCreateJob = async () => {
    if (!currentUser) return;
    if (!cName.trim() || !cPhone.trim() || !cFault.trim()) {
      Alert.alert('Eksik Bilgi', 'Müşteri adı, telefon ve arıza detayını giriniz.');
      return;
    }
    const myTechs = technicians.filter(t => t.companyId === currentUser.companyId);
    const assignedId = selectedTech || (myTechs.length > 0 ? myTechs[0].id : '');
    const assignedTechObj = technicians.find(t => t.id === assignedId);
    const assignedTechName = assignedTechObj ? assignedTechObj.name : 'Usta';

    const newJob: Job = {
      id: `job-${Date.now()}`,
      companyId: currentUser.companyId,
      jobCode: `SJ-${100 + jobs.length + 1}`,
      customerName: cName.trim(),
      customerPhone: cPhone.trim(),
      district: cDistrict.trim() || 'Merkez',
      address: cAddress.trim() || `${cDistrict} Merkez`,
      deviceType: cDevice,
      brandModel: 'Standart',
      faultDescription: cFault.trim(),
      technicianId: assignedId,
      status: 'assigned',
      laborCost: 1000,
      partsCost: 0,
      totalAmount: 1000
    };

    setJobs([newJob, ...jobs]);
    setIsNewJobOpen(false);
    setCName('');
    setCPhone('');
    setCAddress('');
    setCFault('');

    await triggerJobNotification(assignedTechName, newJob.customerName, newJob.deviceType, newJob.district);

    setInAppToast({
      title: 'İş Oluşturuldu 🔔',
      message: `${newJob.customerName} (${newJob.district}) ${assignedTechName} ustaya atandı.`
    });
    setTimeout(() => setInAppToast(null), 3500);
  };

  // Tahsilat Kaydetme
  const handleSavePayment = () => {
    if (!selectedJobForPay) return;
    const l = parseFloat(laborInput) || 0;
    const p = parseFloat(partsInput) || 0;
    const tot = l + p;

    let updatedJob: Job | null = null;

    setJobs(prev => prev.map(j => {
      if (j.id === selectedJobForPay.id) {
        updatedJob = {
          ...j,
          status: 'completed',
          laborCost: l,
          partsCost: p,
          totalAmount: tot,
          paymentMethod: payMethod,
          notes: notesInput || 'Parça değişti, bakım yapıldı',
          photoOld: photoOld || undefined,
          photoNew: photoNew || undefined,
          completedDate: 'Bugün'
        };
        return updatedJob;
      }
      return j;
    }));

    setIsPayModalOpen(false);
    setPhotoOld(null);
    setPhotoNew(null);
    setNotesInput('');

    if (updatedJob) {
      SyncService.syncJobToCloud(updatedJob, currentUser?.companyCode || 'EGE34');
      const jToShare = updatedJob;
      setTimeout(() => {
        Alert.alert(
          'İş Tamamlandı! 🎉',
          `Toplam ${tot} ₺ (${payMethod.toUpperCase()}) tahsil edildi.\nMüşteriye garantili dijital servis fişi göndermek ister misiniz?`,
          [
            { text: 'Kapat', style: 'cancel' },
            {
              text: '💬 WhatsApp Fişi Gönder',
              onPress: () => handleSendWhatsAppReceipt(jToShare)
            }
          ]
        );
      }, 350);
    }
  };

  // Katalogdan Parça Seçme
  const handleSelectCatalogItemForJob = (item: CatalogItem) => {
    const currentNotes = notesInput.trim();
    const updatedNotes = currentNotes ? `${currentNotes}, ${item.name}` : item.name;
    setNotesInput(updatedNotes);

    const currentParts = parseFloat(partsInput) || 0;
    const newParts = currentParts + item.price;
    setPartsInput(newParts.toString());

    setIsPickPartModalOpen(false);
    Alert.alert('Parça Eklendi', `${item.name} (+${item.price} ₺) eklendi.`);
  };

  // Katalog Ekleme
  const handleAddCatalogItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      Alert.alert('Eksik Bilgi', 'Parça adı ve satış fiyatı girilmelidir.');
      return;
    }
    const item: CatalogItem = {
      id: `cat-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCat,
      price: parseFloat(newItemPrice) || 0,
      costPrice: parseFloat(newItemCost) || 0
    };
    const updated = [item, ...catalog];
    setCatalog(updated);
    if (currentUser?.companyCode) {
      await saveCatalog(currentUser.companyCode, updated);
    }
    setIsAddCatalogItemOpen(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemCost('');
  };

  const handleDeleteCatalogItem = async (id: string) => {
    const updated = catalog.filter(c => c.id !== id);
    setCatalog(updated);
    if (currentUser?.companyCode) {
      await saveCatalog(currentUser.companyCode, updated);
    }
  };

  // PayTR Ödeme Simülasyonu
  const handleProcessPayment = () => {
    if (!cardHolder.trim() || !cardNumber.trim() || !cardExp.trim() || !cardCvv.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm kart alanlarını doldurunuz.');
      return;
    }
    setIsPaying(true);
    setTimeout(async () => {
      setIsPaying(false);
      setSubscriptionTier(selectedPlan);
      await SyncService.saveLocal('@servisjet_sub_tier', selectedPlan);
      setSubModalStep('success');
    }, 1800);
  };

  // Çıkış
  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { setCurrentUser(null); setAuthView('login'); } }
    ]);
  };

  // ===================== AUTH EKRANI =====================
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.authHeader}>
              <View style={styles.appleLogoWrap}>
                <Ionicons name="flame" size={32} color="#0284c7" />
              </View>
              <Text style={styles.appleBrand}>Servis<Text style={{ color: '#0284c7' }}>Jet</Text></Text>
              <Text style={styles.appleSub}>Teknik Servis & Saha Yönetimi</Text>
            </View>

            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, authView === 'login' && styles.segmentBtnActive]}
                onPress={() => setAuthView('login')}
              >
                <Text style={[styles.segmentText, authView === 'login' && styles.segmentTextActive]}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, authView === 'register' && styles.segmentBtnActive]}
                onPress={() => setAuthView('register')}
              >
                <Text style={[styles.segmentText, authView === 'register' && styles.segmentTextActive]}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {authView === 'login' ? (
              <View style={styles.appleCard}>
                <Text style={styles.inputLabel}>Telefon Numarası</Text>
                <TextInput
                  style={styles.iosInput}
                  placeholder="0532 000 00 00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                />

                <Text style={styles.inputLabel}>Şifre</Text>
                <TextInput
                  style={styles.iosInput}
                  placeholder="••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={loginPass}
                  onChangeText={setLoginPass}
                />

                <TouchableOpacity style={styles.applePrimaryBtn} onPress={handleLogin}>
                  <Text style={styles.applePrimaryBtnText}>Giriş Yap</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>

                <View style={styles.iosDemoCard}>
                  <Text style={styles.iosDemoTitle}>Hızlı Demo Girişleri (Şifre: 1234):</Text>
                  <TouchableOpacity onPress={() => { setLoginPhone('05321002030'); setLoginPass('1234'); }}>
                    <Text style={styles.iosDemoRow}>👔 Patron: 0532 100 20 30</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setLoginPhone('05325551021'); setLoginPass('1234'); }}>
                    <Text style={styles.iosDemoRow}>🔧 Usta: 0532 555 10 21</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.appleCard}>
                <Text style={styles.inputLabel}>Hesap Türü</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[styles.roleSelectPill, regRole === 'owner' && styles.roleSelectPillActive]}
                    onPress={() => setRegRole('owner')}
                  >
                    <Ionicons name="briefcase" size={16} color={regRole === 'owner' ? '#0284c7' : '#64748b'} />
                    <Text style={[styles.roleSelectText, regRole === 'owner' && styles.roleSelectTextActive]}>Firma Sahibi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleSelectPill, regRole === 'technician' && styles.roleSelectPillActive]}
                    onPress={() => setRegRole('technician')}
                  >
                    <Ionicons name="construct" size={16} color={regRole === 'technician' ? '#0284c7' : '#64748b'} />
                    <Text style={[styles.roleSelectText, regRole === 'technician' && styles.roleSelectTextActive]}>Saha Ustası</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Ad Soyad</Text>
                <TextInput style={styles.iosInput} placeholder="Ahmet Yılmaz" placeholderTextColor="#94a3b8" value={regName} onChangeText={setRegName} />

                <Text style={styles.inputLabel}>Telefon</Text>
                <TextInput style={styles.iosInput} placeholder="05XX XXX XX XX" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={regPhone} onChangeText={setRegPhone} />

                <Text style={styles.inputLabel}>Giriş Şifresi</Text>
                <TextInput style={styles.iosInput} placeholder="••••" placeholderTextColor="#94a3b8" secureTextEntry value={regPass} onChangeText={setRegPass} />

                {regRole === 'owner' ? (
                  <>
                    <Text style={styles.inputLabel}>Firma Adı</Text>
                    <TextInput style={styles.iosInput} placeholder="Örn: Ege Kombi Servisi" placeholderTextColor="#94a3b8" value={regCompany} onChangeText={setRegCompany} />
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Ekip Davet Kodu</Text>
                    <TextInput style={styles.iosInput} placeholder="EGE34" placeholderTextColor="#94a3b8" autoCapitalize="characters" value={regInviteCode} onChangeText={setRegInviteCode} />
                    <Text style={styles.inputLabel}>Servis Aracı Plakası</Text>
                    <TextInput style={styles.iosInput} placeholder="34 TB 4102" placeholderTextColor="#94a3b8" value={regPlate} onChangeText={setRegPlate} />
                  </>
                )}

                <TouchableOpacity style={styles.applePrimaryBtn} onPress={handleRegister}>
                  <Text style={styles.applePrimaryBtnText}>Hesap Oluştur</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ===================== ANA UYGULAMA EKRANLARI =====================
  const isOwner = currentUser.role === 'owner';
  const myCompanyJobs = jobs.filter(j => j.companyId === currentUser.companyId);
  const myTechJobs = jobs.filter(j => j.technicianId === currentUser.id);
  const myCompanyTechs = technicians.filter(t => t.companyId === currentUser.companyId);

  // Filtrelenmiş İşler
  const filteredJobs = myCompanyJobs.filter(j => {
    if (jobFilter === 'active') return j.status !== 'completed';
    if (jobFilter === 'completed') return j.status === 'completed';
    return true;
  });

  const activeJobsCount = myCompanyJobs.filter(j => j.status !== 'completed').length;
  const completedJobsCount = myCompanyJobs.filter(j => j.status === 'completed').length;

  // Benzersiz Müşteriler Listesi
  const uniqueCustomersMap = new Map();
  myCompanyJobs.forEach(j => {
    const cleanP = j.customerPhone.replace(/[^0-9]/g, '').slice(-10);
    if (!uniqueCustomersMap.has(cleanP)) {
      uniqueCustomersMap.set(cleanP, {
        name: j.customerName,
        phone: j.customerPhone,
        district: j.district,
        address: j.address,
        device: j.deviceType,
        brandModel: j.brandModel,
        lastJob: j
      });
    }
  });
  const customerList = Array.from(uniqueCustomersMap.values());
  const filteredCustomerList = customerList.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.district.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.device.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Usta Aktif Görevi
  const activeTechJob = myTechJobs.find(j => j.status === 'assigned' || j.status === 'in_transit' || j.status === 'in_progress');
  const finishedTechJobs = myTechJobs.filter(j => j.status === 'completed');

  // Kasa Hesapları
  const totalRevenue = myCompanyJobs.filter(j => j.status === 'completed').reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const cashRevenue = myCompanyJobs.filter(j => j.status === 'completed' && j.paymentMethod === 'nakit').reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const ibanRevenue = myCompanyJobs.filter(j => j.status === 'completed' && j.paymentMethod === 'havale').reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* TOAST BİLDİRİMİ */}
      {inAppToast && (
        <View style={styles.toastWrap}>
          <Ionicons name="notifications" size={18} color="#0284c7" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.toastTitle}>{inAppToast.title}</Text>
            <Text style={styles.toastMessage}>{inAppToast.message}</Text>
          </View>
        </View>
      )}

      {/* ===================== PATRON: İŞLER SEKMESİ ===================== */}
      {isOwner && activeTab === 'jobs' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <View style={styles.appleHeaderRow}>
              <View>
                <Text style={styles.iosLargeTitle}>İşler</Text>
                <Text style={styles.iosSubtitle}>{currentUser.companyName} • {activeJobsCount} aktif çağrı</Text>
              </View>
              <TouchableOpacity style={styles.appleAddHeaderBtn} onPress={() => setIsNewJobOpen(true)}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.appleAddHeaderText}>Yeni İş</Text>
              </TouchableOpacity>
            </View>

            {/* Apple Segmented Filter Pilleri */}
            <View style={styles.iosFilterBar}>
              <TouchableOpacity
                style={[styles.iosFilterPill, jobFilter === 'all' && styles.iosFilterPillActive]}
                onPress={() => setJobFilter('all')}
              >
                <Text style={[styles.iosFilterPillText, jobFilter === 'all' && styles.iosFilterPillTextActive]}>
                  Tümü ({myCompanyJobs.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iosFilterPill, jobFilter === 'active' && styles.iosFilterPillActive]}
                onPress={() => setJobFilter('active')}
              >
                <Text style={[styles.iosFilterPillText, jobFilter === 'active' && styles.iosFilterPillTextActive]}>
                  İşlemde ({activeJobsCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iosFilterPill, jobFilter === 'completed' && styles.iosFilterPillActive]}
                onPress={() => setJobFilter('completed')}
              >
                <Text style={[styles.iosFilterPillText, jobFilter === 'completed' && styles.iosFilterPillTextActive]}>
                  Bitenler ({completedJobsCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Temiz ve Yuvarlak Kartlar */}
            <View style={{ gap: 12 }}>
              {filteredJobs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyCardTitle}>Bu filtrede iş kaydı yok</Text>
                </View>
              ) : (
                filteredJobs.map(job => {
                  const assignedTech = technicians.find(t => t.id === job.technicianId);
                  const isDone = job.status === 'completed';

                  return (
                    <View key={job.id} style={styles.iosJobCard}>
                      <View style={styles.iosJobCardTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.deviceBadge, job.deviceType === 'Klima' ? styles.badgeKlima : styles.badgeKombi]}>
                            <Text style={[styles.deviceBadgeText, job.deviceType === 'Klima' ? styles.deviceKlimaText : styles.deviceKombiText]}>
                              {job.deviceType}
                            </Text>
                          </View>
                          <Text style={styles.iosJobCode}>{job.jobCode}</Text>
                        </View>
                        <View style={[styles.statusTag, isDone ? styles.statusTagDone : styles.statusTagActive]}>
                          <Text style={[styles.statusTagText, isDone ? styles.statusTagTextDone : styles.statusTagTextActive]}>
                            {isDone ? 'Tamamlandı' : 'Saha İşlemi'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.iosCustName}>{job.customerName}</Text>

                      <View style={styles.iosLocationRow}>
                        <Ionicons name="location-sharp" size={14} color="#64748b" />
                        <Text style={styles.iosLocationText}>{job.district} • {job.address}</Text>
                      </View>

                      <Text style={styles.iosFaultText}>{job.faultDescription}</Text>

                      <View style={styles.iosCardFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-circle-outline" size={16} color="#64748b" />
                          <Text style={styles.iosTechLabel}>{assignedTech ? assignedTech.name : 'Atanmadı'}</Text>
                        </View>

                        {isDone ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.iosPriceText}>{job.totalAmount} ₺</Text>
                            <TouchableOpacity style={styles.iosReceiptBtn} onPress={() => handleSendWhatsAppReceipt(job)}>
                              <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                              <Text style={styles.iosReceiptBtnText}>Fiş</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.iosCallBtnMini}
                            onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}
                          >
                            <Ionicons name="call" size={12} color="#0284c7" />
                            <Text style={styles.iosCallBtnMiniText}>Müşteri Ara</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ===================== PATRON: MÜŞTERİLER SEKMESİ (YENİ AKILLI REHBER) ===================== */}
      {isOwner && activeTab === 'customers' && (
        <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.appleHeaderRow}>
            <View>
              <Text style={styles.iosLargeTitle}>Müşteriler</Text>
              <Text style={styles.iosSubtitle}>{customerList.length} kayıtlı müşteri & cihaz karnesi</Text>
            </View>
            <TouchableOpacity style={styles.appleAddHeaderBtn} onPress={() => setIsNewJobOpen(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.appleAddHeaderText}>Yeni Müşteri</Text>
            </TouchableOpacity>
          </View>

          {/* Müşteri Arama Çubuğu */}
          <View style={styles.iosSearchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.iosSearchInput}
              placeholder="İsim, telefon veya ilçe ara..."
              placeholderTextColor="#94a3b8"
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />
            {customerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Müşteri Kartları */}
          <View style={{ gap: 12, marginTop: 12 }}>
            {filteredCustomerList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyCardTitle}>Aranan kriterde müşteri bulunamadı</Text>
              </View>
            ) : (
              filteredCustomerList.map((cust, idx) => (
                <View key={idx} style={styles.iosCustomerCard}>
                  <View style={styles.iosCustTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.iosCustAvatar}>
                        <Text style={styles.iosCustAvatarText}>{cust.name.substring(0, 1)}</Text>
                      </View>
                      <View>
                        <Text style={styles.iosCustCardName}>{cust.name}</Text>
                        <Text style={styles.iosCustCardPhone}>{cust.phone}</Text>
                      </View>
                    </View>
                    <View style={[styles.deviceBadge, cust.device === 'Klima' ? styles.badgeKlima : styles.badgeKombi]}>
                      <Text style={[styles.deviceBadgeText, cust.device === 'Klima' ? styles.deviceKlimaText : styles.deviceKombiText]}>
                        {cust.device}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.iosCustAddressBox}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.iosCustAddressText}>{cust.district} • {cust.address}</Text>
                  </View>

                  {/* Son Servis Geçmişi Özeti */}
                  {cust.lastJob && (
                    <View style={styles.iosCustHistorySnippet}>
                      <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
                      <Text style={styles.iosCustHistoryText}>
                        Son İşlem: {cust.lastJob.notes || cust.lastJob.faultDescription} ({cust.lastJob.totalAmount} ₺)
                      </Text>
                    </View>
                  )}

                  {/* 3'lü Hızlı Aksiyon Barı */}
                  <View style={styles.iosCustActionsRow}>
                    <TouchableOpacity
                      style={styles.iosCustActionBtn}
                      onPress={() => Linking.openURL(`tel:${cust.phone}`)}
                    >
                      <Ionicons name="call" size={14} color="#0f172a" />
                      <Text style={styles.iosCustActionText}>Ara</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iosCustActionBtn}
                      onPress={() => Linking.openURL(`https://wa.me/90${cust.phone.replace(/[^0-9]/g, '').slice(-10)}`)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
                      <Text style={[styles.iosCustActionText, { color: '#16a34a' }]}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iosCustActionBtn, styles.iosCustActionBtnPrimary]}
                      onPress={() => handleOpenJobForCustomer(cust)}
                    >
                      <Ionicons name="add-circle" size={14} color="#0284c7" />
                      <Text style={[styles.iosCustActionText, { color: '#0284c7', fontWeight: '800' }]}>Yeni İş Aç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ===================== PATRON: EKİP SEKMESİ ===================== */}
      {isOwner && activeTab === 'team' && (
        <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.appleHeaderRow}>
            <View>
              <Text style={styles.iosLargeTitle}>Ekip</Text>
              <Text style={styles.iosSubtitle}>{myCompanyTechs.length} kayıtlı teknisyen</Text>
            </View>
            <TouchableOpacity style={styles.appleAddHeaderBtn} onPress={() => setIsAddTechOpen(true)}>
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.appleAddHeaderText}>Usta Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Ekip Davet Kodu Kartı */}
          <View style={styles.iosInviteCard}>
            <View>
              <Text style={styles.iosInviteLabel}>EKİP DAVET KODU</Text>
              <Text style={styles.iosInviteCode}>{currentUser.companyCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.iosShareCodeBtn}
              onPress={() => {
                const shareMsg = `ServisJet ustalık uygulamasına katılmak için ekip davet kodumuz: ${currentUser.companyCode}`;
                Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`);
              }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={styles.iosShareCodeText}>Kodu Paylaş</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10, marginTop: 12 }}>
            {myCompanyTechs.map(tech => (
              <View key={tech.id} style={styles.iosTechItemCard}>
                <View style={styles.iosTechAvatar}>
                  <Text style={styles.iosTechAvatarText}>{tech.name.substring(0, 1)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.iosTechName}>{tech.name}</Text>
                  <Text style={styles.iosTechSub}>{tech.vehiclePlate} • {tech.phone}</Text>
                </View>
                <TouchableOpacity style={styles.iosCallIconBtn} onPress={() => Linking.openURL(`tel:${tech.phone}`)}>
                  <Ionicons name="call" size={18} color="#0284c7" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ===================== USTA: AKTİF GÖREV VE ROTA ===================== */}
      {!isOwner && activeTab === 'task' && (
        <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.appleHeaderRow}>
            <View>
              <Text style={styles.iosLargeTitle}>Görevim</Text>
              <Text style={styles.iosSubtitle}>{currentUser.name} • Saha İşlemi</Text>
            </View>
          </View>

          {activeTechJob ? (
            <View style={styles.iosHeroTaskCard}>
              <View style={styles.iosHeroTop}>
                <View style={styles.iosHeroBadge}>
                  <Text style={styles.iosHeroBadgeText}>AKTİF SAHA GÖREVİ</Text>
                </View>
                <Text style={styles.iosHeroCode}>{activeTechJob.jobCode}</Text>
              </View>

              <Text style={styles.iosHeroCust}>{activeTechJob.customerName}</Text>
              <Text style={styles.iosHeroDevice}>{activeTechJob.deviceType} ({activeTechJob.brandModel})</Text>

              {/* Haritada Aç Kartı */}
              <TouchableOpacity
                style={styles.iosMapBanner}
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(activeTechJob.address + ' ' + activeTechJob.district)}`)}
              >
                <Ionicons name="navigate-circle" size={28} color="#0284c7" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.iosMapDistrict}>{activeTechJob.district}</Text>
                  <Text style={styles.iosMapAddress}>{activeTechJob.address}</Text>
                </View>
                <Text style={styles.iosMapLink}>Harita ➔</Text>
              </TouchableOpacity>

              <View style={styles.iosFaultBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
                <Text style={styles.iosFaultBoxText}>{activeTechJob.faultDescription}</Text>
              </View>

              {/* Hızlı Aksiyon Barı */}
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
                <TouchableOpacity
                  style={styles.iosActionBtnCall}
                  onPress={() => Linking.openURL(`tel:${activeTechJob.customerPhone}`)}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.iosActionBtnText}>Ara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iosActionBtnWa}
                  onPress={() => Linking.openURL(`https://wa.me/90${activeTechJob.customerPhone.replace(/[^0-9]/g, '').slice(-10)}`)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={styles.iosActionBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* Adım Adım İlerleme Butonu */}
              {activeTechJob.status === 'assigned' && (
                <TouchableOpacity
                  style={[styles.iosBigStepBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => {
                    setJobs(jobs.map(j => j.id === activeTechJob.id ? { ...j, status: 'in_transit' } : j));
                  }}
                >
                  <Ionicons name="car" size={20} color="#fff" />
                  <Text style={styles.iosBigStepBtnText}>Yola Çıktım ➔</Text>
                </TouchableOpacity>
              )}

              {activeTechJob.status === 'in_transit' && (
                <TouchableOpacity
                  style={[styles.iosBigStepBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => {
                    setJobs(jobs.map(j => j.id === activeTechJob.id ? { ...j, status: 'in_progress' } : j));
                  }}
                >
                  <Ionicons name="build" size={20} color="#fff" />
                  <Text style={styles.iosBigStepBtnText}>Adresteyim & Başladım ➔</Text>
                </TouchableOpacity>
              )}

              {activeTechJob.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.iosBigStepBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => {
                    setSelectedJobForPay(activeTechJob);
                    setIsPayModalOpen(true);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.iosBigStepBtnText}>İşi Tamamla & Fiş Kes ➔</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={48} color="#16a34a" />
              <Text style={styles.emptyCardTitle}>Şu an atanmış aktif iş yok</Text>
              <Text style={styles.emptyCardSub}>Patron yeni iş atadığında telefonunuza anında bildirim gelecek.</Text>
            </View>
          )}

          {finishedTechJobs.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.iosSectionTitle}>Bugün Biten İşlerim ({finishedTechJobs.length})</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {finishedTechJobs.map(j => (
                  <View key={j.id} style={styles.iosCashRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.iosCashCust}>{j.customerName}</Text>
                      <Text style={styles.iosCashSub}>{j.deviceType} • {j.notes || j.faultDescription}</Text>
                    </View>
                    <TouchableOpacity style={styles.iosReceiptBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                      <Ionicons name="logo-whatsapp" size={12} color="#16a34a" />
                      <Text style={styles.iosReceiptBtnText}>Fiş Gönder</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ===================== USTA: BİTENLER SEKMESİ ===================== */}
      {!isOwner && activeTab === 'history' && (
        <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.appleHeaderRow}>
            <View>
              <Text style={styles.iosLargeTitle}>Bitenler</Text>
              <Text style={styles.iosSubtitle}>{finishedTechJobs.length} servis tamamlandı</Text>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 12 }}>
            {finishedTechJobs.map(j => (
              <View key={j.id} style={styles.iosJobCard}>
                <View style={styles.iosJobCardTop}>
                  <Text style={styles.iosJobCode}>{j.jobCode}</Text>
                  <Text style={styles.iosPriceText}>{j.totalAmount} ₺</Text>
                </View>
                <Text style={styles.iosCustName}>{j.customerName}</Text>
                <Text style={styles.iosLocationText}>{j.deviceType} • {j.district}</Text>
                <TouchableOpacity style={styles.applePrimaryBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={styles.applePrimaryBtnText}>1 Yıl Garantili Fiş Gönder</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ===================== PROFİL SEKMESİ (KASA & FİNANS DAHİL) ===================== */}
      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.appleHeaderRow}>
            <View>
              <Text style={styles.iosLargeTitle}>Profil & İşletme</Text>
              <Text style={styles.iosSubtitle}>{currentUser.companyName}</Text>
            </View>
          </View>

          {/* Profil Kartı */}
          <View style={styles.iosProfileCard}>
            <View style={styles.iosProfileAvatarWrap}>
              <Text style={styles.iosProfileAvatarInitial}>{currentUser.name.substring(0, 1)}</Text>
            </View>
            <Text style={styles.iosProfileName}>{currentUser.name}</Text>
            <Text style={styles.iosProfileRole}>{isOwner ? 'Firma Sahibi (Patron)' : 'Saha Ustası'} • {currentUser.phone}</Text>
          </View>

          {/* KASA & FİNANS KARTI (PATRON İÇİN PROFİL İÇİNDE) */}
          {isOwner && (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.iosWalletCard}>
                <Text style={styles.iosWalletLabel}>TOPLAM KASA GELİRİ</Text>
                <Text style={styles.iosWalletVal}>{totalRevenue.toLocaleString('tr-TR')} ₺</Text>
                <View style={styles.iosWalletBreakdown}>
                  <View style={styles.iosWalletBreakItem}>
                    <Text style={styles.iosBreakLabel}>💵 Nakit</Text>
                    <Text style={styles.iosBreakVal}>{cashRevenue.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                  <View style={styles.iosWalletBreakDivider} />
                  <View style={styles.iosWalletBreakItem}>
                    <Text style={styles.iosBreakLabel}>🏦 Havale/EFT</Text>
                    <Text style={styles.iosBreakVal}>{ibanRevenue.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.iosSectionTitle, { marginTop: 16, marginBottom: 8 }]}>Son Tahsilatlar</Text>
              <View style={{ gap: 8 }}>
                {myCompanyJobs.filter(j => j.status === 'completed').slice(0, 4).map(j => (
                  <View key={j.id} style={styles.iosCashRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.iosCashCust}>{j.customerName}</Text>
                      <Text style={styles.iosCashSub}>{j.deviceType} • {j.paymentMethod?.toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.iosCashPrice}>+{j.totalAmount} ₺</Text>
                      <TouchableOpacity style={styles.iosReceiptBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                        <Ionicons name="logo-whatsapp" size={11} color="#16a34a" />
                        <Text style={styles.iosReceiptBtnText}>Fiş Gönder</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Apple Menü Grubu */}
          <View style={styles.iosMenuGroup}>
            {isOwner && (
              <>
                <TouchableOpacity
                  style={styles.iosMenuItem}
                  onPress={() => { setSubModalStep('plans'); setIsSubscriptionModalOpen(true); }}
                >
                  <View style={[styles.iosMenuIconWrap, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="diamond" size={18} color="#d97706" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.iosMenuTitle}>Abonelik & Lisans</Text>
                    <Text style={styles.iosMenuSub}>
                      {subscriptionTier === 'trial' ? `14 Günlük Deneme (${trialDaysLeft} gün kaldı)` : `${subscriptionTier.toUpperCase()} Paketi (Aktif)`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iosMenuItem}
                  onPress={() => setIsCatalogModalOpen(true)}
                >
                  <View style={[styles.iosMenuIconWrap, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="pricetags" size={18} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.iosMenuTitle}>Fiyat & Parça Kataloğu</Text>
                    <Text style={styles.iosMenuSub}>{catalog.length} sabit tarife parça/işlem</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </>
            )}

            <View style={styles.iosMenuItem}>
              <View style={[styles.iosMenuIconWrap, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="business" size={18} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.iosMenuTitle}>Firma</Text>
                <Text style={styles.iosMenuSub}>{currentUser.companyName} (Kod: {currentUser.companyCode})</Text>
              </View>
            </View>

            {currentUser.vehiclePlate && (
              <View style={styles.iosMenuItem}>
                <View style={[styles.iosMenuIconWrap, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="car" size={18} color="#475569" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.iosMenuTitle}>Araç Plakası</Text>
                  <Text style={styles.iosMenuSub}>{currentUser.vehiclePlate}</Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.iosLogoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.iosLogoutText}>Hesaptan Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ===================== APPLE ALT GEZİNME ÇUBUĞU (TAB BAR) ===================== */}
      <View style={styles.appleTabBar}>
        {isOwner ? (
          <>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('jobs')}>
              <Ionicons name={activeTab === 'jobs' ? 'list' : 'list-outline'} size={24} color={activeTab === 'jobs' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'jobs' && styles.appleTabTextActive]}>İşler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('customers')}>
              <Ionicons name={activeTab === 'customers' ? 'people' : 'people-outline'} size={24} color={activeTab === 'customers' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'customers' && styles.appleTabTextActive]}>Müşteriler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('team')}>
              <Ionicons name={activeTab === 'team' ? 'construct' : 'construct-outline'} size={24} color={activeTab === 'team' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'team' && styles.appleTabTextActive]}>Ekip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={24} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'profile' && styles.appleTabTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('task')}>
              <Ionicons name={activeTab === 'task' ? 'construct' : 'construct-outline'} size={24} color={activeTab === 'task' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'task' && styles.appleTabTextActive]}>Görev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('history')}>
              <Ionicons name={activeTab === 'history' ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} size={24} color={activeTab === 'history' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'history' && styles.appleTabTextActive]}>Bitenler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appleTabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={24} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.appleTabText, activeTab === 'profile' && styles.appleTabTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ===================== MODAL: YENİ İŞ KAYDI ===================== */}
      <Modal visible={isNewJobOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.iosModalSheet}>
            <View style={styles.iosModalTop}>
              <Text style={styles.iosModalTitle}>Yeni Servis Çağrısı</Text>
              <TouchableOpacity onPress={() => setIsNewJobOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Müşteri Telefonu</Text>
              <TextInput
                style={styles.iosInput}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={cPhone}
                onChangeText={handlePhoneChange}
              />

              {matchedOldCustomer && (
                <TouchableOpacity style={styles.iosMemoryPill} onPress={handleAutoFillOldCustomer}>
                  <Ionicons name="flash" size={16} color="#0284c7" />
                  <Text style={styles.iosMemoryText}>{matchedOldCustomer.customerName} ({matchedOldCustomer.district}) - Tıkla ve Doldur</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.inputLabel}>Müşteri Ad Soyad</Text>
              <TextInput style={styles.iosInput} placeholder="Örn: Selim Bey" placeholderTextColor="#94a3b8" value={cName} onChangeText={setCName} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cihaz</Text>
                  <TextInput style={styles.iosInput} placeholder="Kombi, Klima..." placeholderTextColor="#94a3b8" value={cDevice} onChangeText={setCDevice} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>İlçe</Text>
                  <TextInput style={styles.iosInput} placeholder="Kadıköy..." placeholderTextColor="#94a3b8" value={cDistrict} onChangeText={setCDistrict} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Açık Adres</Text>
              <TextInput style={styles.iosInput} placeholder="Mahalle, Sokak, No..." placeholderTextColor="#94a3b8" value={cAddress} onChangeText={setCAddress} />

              <Text style={styles.inputLabel}>Arıza Şikayeti</Text>
              <TextInput
                style={[styles.iosInput, { height: 60 }]}
                placeholder="Sıcak su akmıyor, hata kodu..."
                placeholderTextColor="#94a3b8"
                multiline
                value={cFault}
                onChangeText={setCFault}
              />

              <Text style={styles.inputLabel}>Atanacak Usta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {myCompanyTechs.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.iosTechSelectPill, selectedTech === t.id && styles.iosTechSelectPillActive]}
                    onPress={() => setSelectedTech(t.id)}
                  >
                    <Text style={[styles.iosTechSelectText, selectedTech === t.id && styles.iosTechSelectTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.applePrimaryBtn} onPress={handleCreateJob}>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.applePrimaryBtnText}>Kaydet & Ustaya Bildir</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: USTA EKLE ===================== */}
      <Modal visible={isAddTechOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.iosModalSheet}>
            <View style={styles.iosModalTop}>
              <Text style={styles.iosModalTitle}>Ekibe Usta Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddTechOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Usta Ad Soyad</Text>
            <TextInput style={styles.iosInput} placeholder="Örn: Mehmet Usta" placeholderTextColor="#94a3b8" value={newTechName} onChangeText={setNewTechName} />

            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput style={styles.iosInput} placeholder="05XX XXX XX XX" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={newTechPhone} onChangeText={setNewTechPhone} />

            <Text style={styles.inputLabel}>Araç Plakası</Text>
            <TextInput style={styles.iosInput} placeholder="34 TB 4102" placeholderTextColor="#94a3b8" value={newTechPlate} onChangeText={setNewTechPlate} />

            <Text style={styles.inputLabel}>Giriş Şifresi</Text>
            <TextInput style={styles.iosInput} placeholder="1234" placeholderTextColor="#94a3b8" value={newTechPass} onChangeText={setNewTechPass} />

            <TouchableOpacity style={styles.applePrimaryBtn} onPress={handleAddTech}>
              <Text style={styles.applePrimaryBtnText}>Ustayı Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: İŞİ BİTİR & TAHSİLAT ===================== */}
      <Modal visible={isPayModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={[styles.iosModalSheet, { maxHeight: '92%' }]}>
            <View style={styles.iosModalTop}>
              <Text style={styles.iosModalTitle}>İşi Tamamla & Tahsilat</Text>
              <TouchableOpacity onPress={() => setIsPayModalOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.iosPickCatalogTrigger}
                onPress={() => setIsPickPartModalOpen(true)}
              >
                <Ionicons name="pricetag" size={16} color="#0284c7" />
                <Text style={styles.iosPickCatalogTriggerText}>📦 Fiyat Kataloğundan Parça Seç</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Değişen Parça / Yapılan İşlem</Text>
              <TextInput style={styles.iosInput} placeholder="Örn: Fan Motoru Değişti" placeholderTextColor="#94a3b8" value={notesInput} onChangeText={setNotesInput} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>İşçilik (TL)</Text>
                  <TextInput style={styles.iosInput} keyboardType="numeric" value={laborInput} onChangeText={setLaborInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Parça Ücreti (TL)</Text>
                  <TextInput style={styles.iosInput} keyboardType="numeric" value={partsInput} onChangeText={setPartsInput} />
                </View>
              </View>

              <Text style={styles.inputLabel}>📷 Değişen Parça Fotoğrafı (Opsiyonel)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity style={styles.iosPhotoBox} onPress={() => handlePickPhoto('old')}>
                  {photoOld ? <Image source={{ uri: photoOld }} style={styles.iosPhotoPreview} /> : <Text style={styles.iosPhotoText}>Eski Parça</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.iosPhotoBox} onPress={() => handlePickPhoto('new')}>
                  {photoNew ? <Image source={{ uri: photoNew }} style={styles.iosPhotoPreview} /> : <Text style={styles.iosPhotoText}>Yeni Parça</Text>}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                {(['nakit', 'havale', 'pos'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.iosPayMethodPill, payMethod === m && styles.iosPayMethodPillActive]}
                    onPress={() => setPayMethod(m)}
                  >
                    <Text style={[styles.iosPayMethodText, payMethod === m && styles.iosPayMethodTextActive]}>
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.iosTotalAmountBox}>
                <Text style={{ fontWeight: '700', color: '#065f46', fontSize: 13 }}>Toplam Tahsilat:</Text>
                <Text style={{ fontWeight: '900', color: '#065f46', fontSize: 24 }}>
                  {((parseFloat(laborInput) || 0) + (parseFloat(partsInput) || 0)).toLocaleString('tr-TR')} ₺
                </Text>
              </View>

              <TouchableOpacity style={[styles.applePrimaryBtn, { backgroundColor: '#16a34a' }]} onPress={handleSavePayment}>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.applePrimaryBtnText}>Tahsilatı Onayla & İşi Bitir</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: KATALOGDAN PARÇA SEÇ ===================== */}
      <Modal visible={isPickPartModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.iosModalSheet, { maxHeight: '85%' }]}>
            <View style={styles.iosModalTop}>
              <Text style={styles.iosModalTitle}>Katalogdan Parça Seç</Text>
              <TouchableOpacity onPress={() => setIsPickPartModalOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.iosInput, { marginBottom: 12 }]}
              placeholder="🔍 Parça veya işlem ara (Fan, Bakım)..."
              placeholderTextColor="#94a3b8"
              value={catalogSearch}
              onChangeText={setCatalogSearch}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {catalog
                .filter(item => item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || item.category.toLowerCase().includes(catalogSearch.toLowerCase()))
                .map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.iosCatalogPickRow}
                    onPress={() => handleSelectCatalogItemForJob(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.iosCatalogPickName}>{item.name}</Text>
                      <Text style={styles.iosCatalogPickCat}>{item.category}</Text>
                    </View>
                    <View style={styles.iosCatalogPickBadge}>
                      <Text style={styles.iosCatalogPickPrice}>{item.price} ₺</Text>
                      <Ionicons name="add" size={16} color="#0284c7" />
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL: FİYAT KATALOĞU YÖNETİMİ ===================== */}
      <Modal visible={isCatalogModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.iosModalSheet, { maxHeight: '90%' }]}>
            <View style={styles.iosModalTop}>
              <View>
                <Text style={styles.iosModalTitle}>Fiyat Kataloğu</Text>
                <Text style={styles.iosModalSub}>Saha ustaları için sabit fiyat listesi</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCatalogModalOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {(['Tümü', 'Kombi', 'Klima', 'Beyaz Eşya', 'Genel'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.iosFilterPill, catalogFilter === cat && styles.iosFilterPillActive]}
                  onPress={() => setCatalogFilter(cat)}
                >
                  <Text style={[styles.iosFilterPillText, catalogFilter === cat && styles.iosFilterPillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={{ gap: 8 }}>
                {catalog
                  .filter(c => catalogFilter === 'Tümü' || c.category === catalogFilter)
                  .map(c => (
                    <View key={c.id} style={styles.iosCatalogManageItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iosCatalogPickName}>{c.name}</Text>
                        <Text style={styles.iosCatalogPickCat}>{c.category} {c.costPrice ? `• Maliyet: ${c.costPrice} ₺` : ''}</Text>
                      </View>
                      <Text style={styles.iosCatalogPickPrice}>{c.price} ₺</Text>
                      <TouchableOpacity onPress={() => handleDeleteCatalogItem(c.id)} style={{ marginLeft: 10 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applePrimaryBtn} onPress={() => setIsAddCatalogItemOpen(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.applePrimaryBtnText}>Yeni Parça / Fiyat Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL: YENİ KATALOG PARÇASI ===================== */}
      <Modal visible={isAddCatalogItemOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.iosModalSheet}>
            <View style={styles.iosModalTop}>
              <Text style={styles.iosModalTitle}>Yeni Parça Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddCatalogItemOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Parça / İşlem Adı</Text>
            <TextInput style={styles.iosInput} placeholder="Örn: Genleşme Tankı Değişimi" placeholderTextColor="#94a3b8" value={newItemName} onChangeText={setNewItemName} />

            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {(['Kombi', 'Klima', 'Beyaz Eşya', 'Genel'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.iosPayMethodPill, newItemCat === cat && styles.iosPayMethodPillActive]}
                  onPress={() => setNewItemCat(cat)}
                >
                  <Text style={[styles.iosPayMethodText, newItemCat === cat && styles.iosPayMethodTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Satış Fiyatı (TL)</Text>
                <TextInput style={styles.iosInput} placeholder="2400" placeholderTextColor="#94a3b8" keyboardType="numeric" value={newItemPrice} onChangeText={setNewItemPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Maliyet (TL)</Text>
                <TextInput style={styles.iosInput} placeholder="900" placeholderTextColor="#94a3b8" keyboardType="numeric" value={newItemCost} onChangeText={setNewItemCost} />
              </View>
            </View>

            <TouchableOpacity style={styles.applePrimaryBtn} onPress={handleAddCatalogItem}>
              <Text style={styles.applePrimaryBtnText}>Kataloğa Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: ABONELİK & ÖDEME ===================== */}
      <Modal visible={isSubscriptionModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={[styles.iosModalSheet, { maxHeight: '92%' }]}>
            <View style={styles.iosModalTop}>
              <View>
                <Text style={styles.iosModalTitle}>
                  {subModalStep === 'plans' ? 'Abonelik Paketleri' : subModalStep === 'checkout' ? '🔒 Güvenli Ödeme' : '🎉 Tebrikler!'}
                </Text>
                <Text style={styles.iosModalSub}>ServisJet Lisans Yönetimi</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSubscriptionModalOpen(false)} style={styles.iosCloseCircle}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {subModalStep === 'plans' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.iosPlanCard, selectedPlan === 'standard' && styles.iosPlanCardActive]}
                  onPress={() => setSelectedPlan('standard')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.iosPlanName}>Standart Plan</Text>
                    <Text style={styles.iosPlanPrice}>490 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal' }}>/ay</Text></Text>
                  </View>
                  <Text style={styles.iosPlanSub}>1 Usta • Sınırsız Servis Fişi • WhatsApp Paylaşımı</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iosPlanCard, selectedPlan === 'pro' && styles.iosPlanCardActive]}
                  onPress={() => setSelectedPlan('pro')}
                >
                  <View style={styles.iosPopPill}>
                    <Text style={styles.iosPopPillText}>ÖNERİLEN</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={styles.iosPlanName}>Pro Saha Paketi</Text>
                    <Text style={[styles.iosPlanPrice, { color: '#0284c7' }]}>890 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal' }}>/ay</Text></Text>
                  </View>
                  <Text style={styles.iosPlanSub}>5 Usta • Parça Kataloğu • Kasa Raporları • Öncelikli Destek</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iosPlanCard, selectedPlan === 'yearly' && styles.iosPlanCardActive]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={styles.iosPlanName}>Yıllık Kurumsal</Text>
                      <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>2 AY HEDİYE</Text>
                    </View>
                    <Text style={styles.iosPlanPrice}>8.900 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal' }}>/yıl</Text></Text>
                  </View>
                  <Text style={styles.iosPlanSub}>Sınırsız Usta • Özel Şirket Logosu • VIP 7/24 Destek</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.applePrimaryBtn} onPress={() => setSubModalStep('checkout')}>
                  <Text style={styles.applePrimaryBtnText}>Ödemeye Geç ➔</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {subModalStep === 'checkout' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.iosCreditCardVisual}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Ionicons name="card" size={24} color="#bae6fd" />
                    <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700' }}>PayTR 3D Secure</Text>
                  </View>
                  <Text style={styles.iosCardNumber}>{cardNumber}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.iosCardHolder}>{cardHolder.toUpperCase()}</Text>
                    <Text style={styles.iosCardHolder}>{cardExp}</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Kart Sahibi</Text>
                <TextInput style={styles.iosInput} value={cardHolder} onChangeText={setCardHolder} />

                <Text style={styles.inputLabel}>Kart Numarası</Text>
                <TextInput style={styles.iosInput} keyboardType="numeric" value={cardNumber} onChangeText={setCardNumber} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>SKT (AA/YY)</Text>
                    <TextInput style={styles.iosInput} value={cardExp} onChangeText={setCardExp} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CVV</Text>
                    <TextInput style={styles.iosInput} secureTextEntry keyboardType="numeric" value={cardCvv} onChangeText={setCardCvv} />
                  </View>
                </View>

                <TouchableOpacity style={[styles.applePrimaryBtn, { backgroundColor: '#16a34a', marginTop: 14 }]} onPress={handleProcessPayment} disabled={isPaying}>
                  {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.applePrimaryBtnText}>🔒 Güvenli Öde (3D Secure)</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}

            {subModalStep === 'success' && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="checkmark-circle" size={60} color="#16a34a" />
                <Text style={[styles.iosLargeTitle, { marginTop: 12, fontSize: 22 }]}>Ödeme Başarılı!</Text>
                <Text style={styles.emptyCardSub}>{currentUser.companyName} için {selectedPlan.toUpperCase()} paketi aktif edildi.</Text>
                <TouchableOpacity style={[styles.applePrimaryBtn, { width: '100%', marginTop: 20 }]} onPress={() => setIsSubscriptionModalOpen(false)}>
                  <Text style={styles.applePrimaryBtnText}>Kullanmaya Başla</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ===================== APPLE SF-STYLE ARAYÜZ STİLLERİ =====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollArea: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 110 },

  // Toast
  toastWrap: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 9999, backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  toastTitle: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  toastMessage: { color: '#64748b', fontSize: 11, marginTop: 2 },

  // Apple Büyük Başlık Satırı
  appleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  iosLargeTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  iosSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  appleAddHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#0284c7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
  appleAddHeaderText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Segmented Filtre Barı
  iosFilterBar: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 16 },
  iosFilterPill: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  iosFilterPillActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  iosFilterPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  iosFilterPillTextActive: { color: '#0f172a', fontWeight: '800' },

  // Arama Kutusu (Müşteriler için)
  iosSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  iosSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a' },

  // Müşteri Kartları
  iosCustomerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  iosCustTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iosCustAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },
  iosCustAvatarText: { fontSize: 18, fontWeight: '900', color: '#0284c7' },
  iosCustCardName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  iosCustCardPhone: { fontSize: 12, color: '#64748b', marginTop: 1 },
  iosCustAddressBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  iosCustAddressText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  iosCustHistorySnippet: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', padding: 8, borderRadius: 10, marginTop: 8 },
  iosCustHistoryText: { fontSize: 11, color: '#166534', fontWeight: '600', flex: 1 },
  iosCustActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  iosCustActionBtn: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 8, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  iosCustActionBtnPrimary: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
  iosCustActionText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  // Apple İş Kartı
  iosJobCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  iosJobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  deviceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeKombi: { backgroundColor: '#e0f2fe' },
  badgeKlima: { backgroundColor: '#f3e8ff' },
  deviceBadgeText: { fontSize: 11, fontWeight: '800' },
  deviceKombiText: { color: '#0284c7' },
  deviceKlimaText: { color: '#9333ea' },
  iosJobCode: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusTagActive: { backgroundColor: '#fffbeb' },
  statusTagDone: { backgroundColor: '#ecfdf5' },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  statusTagTextActive: { color: '#b45309' },
  statusTagTextDone: { color: '#15803d' },

  iosCustName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  iosLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  iosLocationText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  iosFaultText: { fontSize: 13, color: '#334155', marginTop: 8, lineHeight: 18 },

  iosCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  iosTechLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  iosPriceText: { fontSize: 15, fontWeight: '900', color: '#16a34a' },
  iosReceiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0' },
  iosReceiptBtnText: { color: '#16a34a', fontSize: 11, fontWeight: '800' },
  iosCallBtnMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  iosCallBtnMiniText: { color: '#0284c7', fontSize: 11, fontWeight: '700' },

  // Ekip
  iosInviteCard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iosInviteLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  iosInviteCode: { fontSize: 26, fontWeight: '900', color: '#38bdf8', letterSpacing: 2, marginTop: 2 },
  iosShareCodeBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  iosShareCodeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  iosTechItemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  iosTechAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  iosTechAvatarText: { fontSize: 16, fontWeight: '900', color: '#0284c7' },
  iosTechName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  iosTechSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  iosCallIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },

  // Kasa / Finans
  iosWalletCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  iosWalletLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  iosWalletVal: { fontSize: 34, fontWeight: '900', color: '#fff', marginVertical: 6 },
  iosWalletBreakdown: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#334155' },
  iosWalletBreakItem: { flex: 1, alignItems: 'center' },
  iosWalletBreakDivider: { width: 1, height: '100%', backgroundColor: '#334155' },
  iosBreakLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  iosBreakVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
  iosSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  iosCashRow: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  iosCashCust: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  iosCashSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  iosCashPrice: { fontSize: 15, fontWeight: '900', color: '#16a34a' },

  // Usta Hero Card
  iosHeroTaskCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: '#e0f2fe' },
  iosHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iosHeroBadge: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  iosHeroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  iosHeroCode: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  iosHeroCust: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  iosHeroDevice: { fontSize: 14, fontWeight: '700', color: '#0284c7', marginTop: 2 },

  iosMapBanner: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  iosMapDistrict: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  iosMapAddress: { fontSize: 11, color: '#64748b', marginTop: 1 },
  iosMapLink: { fontSize: 11, fontWeight: '800', color: '#0284c7' },

  iosFaultBox: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iosFaultBoxText: { fontSize: 12, color: '#b45309', flex: 1, fontWeight: '500' },

  iosActionBtnCall: { flex: 1, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  iosActionBtnWa: { flex: 1, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  iosActionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  iosBigStepBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  iosBigStepBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Profil
  iosProfileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  iosProfileAvatarWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iosProfileAvatarInitial: { fontSize: 26, fontWeight: '900', color: '#fff' },
  iosProfileName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  iosProfileRole: { fontSize: 12, color: '#64748b', marginTop: 2 },

  iosMenuGroup: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  iosMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  iosMenuIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  iosMenuTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  iosMenuSub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  iosLogoutBtn: { backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  iosLogoutText: { color: '#ef4444', fontSize: 14, fontWeight: '800' },

  // Alt Tab Bar
  appleTabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10, position: 'absolute', bottom: 0, left: 0, right: 0 },
  appleTabItem: { flex: 1, alignItems: 'center', gap: 3 },
  appleTabText: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  appleTabTextActive: { color: '#0284c7', fontWeight: '800' },

  // Modallar
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosModalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: '90%' },
  iosModalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iosModalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  iosModalSub: { fontSize: 11, color: '#64748b' },
  iosCloseCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 10 },
  iosInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a' },
  applePrimaryBtn: { backgroundColor: '#0284c7', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18 },
  applePrimaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  iosMemoryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 10, marginVertical: 6 },
  iosMemoryText: { color: '#0284c7', fontSize: 11, fontWeight: '700' },

  iosTechSelectPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 6 },
  iosTechSelectPillActive: { backgroundColor: '#0284c7' },
  iosTechSelectText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  iosTechSelectTextActive: { color: '#fff' },

  iosPickCatalogTrigger: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  iosPickCatalogTriggerText: { color: '#0284c7', fontWeight: '800', fontSize: 13 },

  iosPhotoBox: { flex: 1, height: 75, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iosPhotoText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  iosPhotoPreview: { width: '100%', height: '100%' },

  iosPayMethodPill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  iosPayMethodPillActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  iosPayMethodText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  iosPayMethodTextActive: { color: '#fff' },

  iosTotalAmountBox: { backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },

  // Katalog Seçim Listesi
  iosCatalogPickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  iosCatalogPickName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  iosCatalogPickCat: { fontSize: 11, color: '#64748b', marginTop: 2 },
  iosCatalogPickBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  iosCatalogPickPrice: { fontSize: 13, fontWeight: '900', color: '#0284c7' },
  iosCatalogManageItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },

  // Abonelik Paket Kartları
  iosPlanCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 10 },
  iosPlanCardActive: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  iosPopPill: { alignSelf: 'flex-start', backgroundColor: '#0284c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  iosPopPillText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  iosPlanName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  iosPlanPrice: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  iosPlanSub: { fontSize: 11, color: '#64748b', marginTop: 4 },

  iosCreditCardVisual: { backgroundColor: '#0f172a', borderRadius: 18, padding: 18, marginBottom: 14 },
  iosCardNumber: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginVertical: 14 },
  iosCardHolder: { color: '#e2e8f0', fontSize: 11, fontWeight: '700' },

  // Auth Stilleri
  authContainer: { flex: 1, backgroundColor: '#f8fafc' },
  authScroll: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  authHeader: { alignItems: 'center', marginBottom: 28 },
  appleLogoWrap: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  appleBrand: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  appleSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 18 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  segmentTextActive: { color: '#0f172a', fontWeight: '800' },
  appleCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  roleSelectPill: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 4 },
  roleSelectPillActive: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  roleSelectText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  roleSelectTextActive: { color: '#0284c7' },
  iosDemoCard: { marginTop: 18, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  iosDemoTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 6 },
  iosDemoRow: { fontSize: 12, color: '#0284c7', fontWeight: '700', marginVertical: 2 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 20 },
  emptyCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptyCardSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }
});
