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
  const [activeTab, setActiveTab] = useState<'jobs' | 'team' | 'cash' | 'task' | 'history' | 'profile'>('jobs');

  // Bildirim ve Toast Durumu
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

  // Usta için Katalogdan Parça Seçme Modalı
  const [isPickPartModalOpen, setIsPickPartModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // 14 Günlük Deneme ve Abonelik / Ödeme Durumu
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
      // Bildirim izinlerini iste
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

  // GERÇEK ZAMANLI (REALTIME) BULUT DİNLİYİCİSİ
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
      // Çevrimdışıysa devam et
    }
  }, [currentUser?.companyId]);

  // Yerel hafızaya kaydetmeler
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

  // Auth State
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

  // Telefon Girilince Eski Müşteri Hafızası Kontrolü
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
    Alert.alert('Bilgiler Dolduruldu', `${matchedOldCustomer.customerName} adres ve cihaz bilgileri otomatik yüklendi.`);
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
      if (type === 'old') {
        setPhotoOld(result.assets[0].uri);
      } else {
        setPhotoNew(result.assets[0].uri);
      }
    }
  };

  // WhatsApp Servis Fişi
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

  // WhatsApp Bakım Hatırlatma
  const handleSendMaintenanceOffer = (job: Job) => {
    const cleanPhone = job.customerPhone.replace(/[^0-9]/g, '').slice(-10);
    const msg = 
`Sayın ${job.customerName} merhaba, ${currentUser?.companyName} servisinden yazıyoruz.
${job.deviceType} cihazınızın periyodik bakımının üzerinden 1 yıl geçti.
Verimli ısınma ve doğalgaz tasarrufu için yıllık bakım zamanınız gelmiştir.

Bu haftaya özel indirimli bakım randevunuzu oluşturalım mı?`;

    Linking.openURL(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  // Giriş / Kayıt
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
    Alert.alert('Usta Eklendi', `${newTechObj.name} kaydedildi. Giriş Şifresi: ${newTechPass}`);
  };

  // Yeni İş Oluşturma (Push Bildirimi Tetiklenir!)
  const handleCreateJob = async () => {
    if (!currentUser) return;
    if (!cName.trim() || !cPhone.trim() || !cFault.trim()) {
      Alert.alert('Eksik Bilgi', 'Müşteri adı, telefon ve arıza açıklaması girilmelidir.');
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

    // ANLIK PUSH BİLDİRİMİ TETİKLE!
    await triggerJobNotification(assignedTechName, newJob.customerName, newJob.deviceType, newJob.district);

    // Uygulama içi Toast göster
    setInAppToast({
      title: '🔔 Bildirim Gönderildi!',
      message: `${assignedTechName} ustaya ${newJob.customerName} (${newJob.district}) işi iletildi.`
    });
    setTimeout(() => setInAppToast(null), 4000);

    Alert.alert('İş Kaydedildi!', `${newJob.jobCode} nolu servis kaydı oluşturuldu ve ${assignedTechName} ustaya anlık bildirim fırlatıldı.`);
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
          'İş Başarıyla Tamamlandı!',
          `Toplam ${tot} ₺ (${payMethod.toUpperCase()}) tahsil edildi.\nMüşteriye 1 Yıl Garantili Dijital Fişi WhatsApp ile göndermek ister misiniz?`,
          [
            { text: 'Daha Sonra', style: 'cancel' },
            {
              text: '💬 WhatsApp Fişi Gönder',
              onPress: () => handleSendWhatsAppReceipt(jToShare)
            }
          ]
        );
      }, 400);
    }
  };

  // KATALOG YÖNETİMİ
  const handleAddCatalogItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      Alert.alert('Eksik Bilgi', 'Parça/hizmet adı ve fiyatı zorunludur.');
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
    Alert.alert('Kataloğa Eklendi', `${item.name} (${item.price} ₺) listenize kaydedildi.`);
  };

  const handleDeleteCatalogItem = async (id: string) => {
    const updated = catalog.filter(c => c.id !== id);
    setCatalog(updated);
    if (currentUser?.companyCode) {
      await saveCatalog(currentUser.companyCode, updated);
    }
  };

  // USTANIN KATALOGDAN PARÇA SEÇMESİ
  const handleSelectCatalogItemForJob = (item: CatalogItem) => {
    // Parça adını nota ekle
    const currentNotes = notesInput.trim();
    const updatedNotes = currentNotes ? `${currentNotes}, ${item.name}` : item.name;
    setNotesInput(updatedNotes);

    // Parça ücretini topla
    const currentParts = parseFloat(partsInput) || 0;
    const newParts = currentParts + item.price;
    setPartsInput(newParts.toString());

    setIsPickPartModalOpen(false);
    Alert.alert('Parça Eklendi! 📦', `${item.name} (+${item.price} ₺) servis fişine eklendi.`);
  };

  // ABONELİK / ÖDEME İŞLEMİ (PAYTR/İYZİCO SİMÜLASYONU)
  const handleProcessPayment = () => {
    if (!cardHolder.trim() || !cardNumber.trim() || !cardExp.trim() || !cardCvv.trim()) {
      Alert.alert('Eksik Kart Bilgisi', 'Lütfen tüm kart alanlarını doldurunuz.');
      return;
    }
    setIsPaying(true);

    // 3D Secure Doğrulama Simülasyonu
    setTimeout(async () => {
      setIsPaying(false);
      setSubscriptionTier(selectedPlan);
      await SyncService.saveLocal('@servisjet_sub_tier', selectedPlan);
      setSubModalStep('success');
    }, 2000);
  };

  // ÇIKIŞ YAP
  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          setCurrentUser(null);
          setAuthView('login');
        }
      }
    ]);
  };

  // GİRİŞ / KAYIT EKRANI
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authScroll}>
            <View style={styles.authHeader}>
              <View style={styles.logoBadge}>
                <Ionicons name="construct" size={28} color="#fff" />
              </View>
              <Text style={styles.authBrand}>Servis<Text style={{ color: '#0284c7' }}>Jet</Text></Text>
              <Text style={styles.authSub}>Kombi, Klima & Teknik Servis Yönetim Sistemi</Text>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, authView === 'login' && styles.toggleBtnActive]}
                onPress={() => setAuthView('login')}
              >
                <Text style={[styles.toggleText, authView === 'login' && styles.toggleTextActive]}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, authView === 'register' && styles.toggleBtnActive]}
                onPress={() => setAuthView('register')}
              >
                <Text style={[styles.toggleText, authView === 'register' && styles.toggleTextActive]}>Hesap Aç</Text>
              </TouchableOpacity>
            </View>

            {authView === 'login' ? (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>Telefon Numaranız</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0532 000 00 00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                />

                <Text style={styles.inputLabel}>Giriş Şifresi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={loginPass}
                  onChangeText={setLoginPass}
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
                  <Text style={styles.primaryBtnText}>Uygulamaya Gir</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>

                <View style={styles.demoBox}>
                  <Text style={styles.demoTitle}>Hızlı Test Girişleri (Şifre: 1234):</Text>
                  <TouchableOpacity onPress={() => { setLoginPhone('05321002030'); setLoginPass('1234'); }}>
                    <Text style={styles.demoLink}>👔 Patron: 0532 100 20 30</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setLoginPhone('05325551021'); setLoginPass('1234'); }}>
                    <Text style={styles.demoLink}>🔧 Usta: 0532 555 10 21</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>Rolünüzü Seçin</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, regRole === 'owner' && styles.roleBtnActive]}
                    onPress={() => setRegRole('owner')}
                  >
                    <Ionicons name="briefcase-outline" size={18} color={regRole === 'owner' ? '#0284c7' : '#64748b'} />
                    <Text style={[styles.roleText, regRole === 'owner' && styles.roleTextActive]}>Patron (Firma Sahibi)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, regRole === 'technician' && styles.roleBtnActive]}
                    onPress={() => setRegRole('technician')}
                  >
                    <Ionicons name="construct-outline" size={18} color={regRole === 'technician' ? '#0284c7' : '#64748b'} />
                    <Text style={[styles.roleText, regRole === 'technician' && styles.roleTextActive]}>Teknisyen (Saha Ustası)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Adınız Soyadınız</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ahmet Usta"
                  placeholderTextColor="#94a3b8"
                  value={regName}
                  onChangeText={setRegName}
                />

                <Text style={styles.inputLabel}>Telefon Numaranız</Text>
                <TextInput
                  style={styles.input}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={regPhone}
                  onChangeText={setRegPhone}
                />

                <Text style={styles.inputLabel}>Şifreniz</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4 Haneli Şifre"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={regPass}
                  onChangeText={setRegPass}
                />

                {regRole === 'owner' ? (
                  <>
                    <Text style={styles.inputLabel}>Firma / Servis Adınız</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Örn: Ege Kombi & Klima"
                      placeholderTextColor="#94a3b8"
                      value={regCompany}
                      onChangeText={setRegCompany}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Patronun Ekip Davet Kodu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Örn: EGE34"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      value={regInviteCode}
                      onChangeText={setRegInviteCode}
                    />
                    <Text style={styles.inputLabel}>Servis Aracı Plakası (Opsiyonel)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="34 TB 4102"
                      placeholderTextColor="#94a3b8"
                      value={regPlate}
                      onChangeText={setRegPlate}
                    />
                  </>
                )}

                <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
                  <Text style={styles.primaryBtnText}>Hesap Oluştur ve Başla</Text>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // PATRON VEYA TEKNİSYEN EKRANI
  const isOwner = currentUser.role === 'owner';
  const myCompanyJobs = jobs.filter(j => j.companyId === currentUser.companyId);
  const myTechJobs = jobs.filter(j => j.technicianId === currentUser.id);
  const myCompanyTechs = technicians.filter(t => t.companyId === currentUser.companyId);

  // Kasa Hesapları
  const completedJobs = myCompanyJobs.filter(j => j.status === 'completed');
  const totalRevenue = completedJobs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const cashRevenue = completedJobs.filter(j => j.paymentMethod === 'nakit').reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const ibanRevenue = completedJobs.filter(j => j.paymentMethod === 'havale').reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

  // Aktif Görev (Usta İçin)
  const activeTechJob = myTechJobs.find(j => j.status === 'assigned' || j.status === 'in_transit' || j.status === 'in_progress');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ANLIK TOAST BİLDİRİMİ */}
      {inAppToast && (
        <View style={styles.toastContainer}>
          <Ionicons name="notifications" size={20} color="#fff" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.toastTitle}>{inAppToast.title}</Text>
            <Text style={styles.toastDesc}>{inAppToast.message}</Text>
          </View>
        </View>
      )}

      {/* SADE VE TEMİZ ÜST BAŞLIK */}
      <View style={styles.topBarClean}>
        <View>
          <Text style={styles.firmTitle}>{currentUser.companyName}</Text>
          <Text style={styles.firmUserSub}>{currentUser.name} • {isOwner ? 'Patron Paneli' : 'Saha Teknisyeni'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity
            style={styles.headerKatalogBtn}
            onPress={() => setIsCatalogModalOpen(true)}
          >
            <Ionicons name="pricetag-outline" size={14} color="#0284c7" />
            <Text style={styles.headerKatalogText}>Fiyat Kataloğu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 14 GÜNLÜK DENEME VE ABONELİK BANNERI (PATRON İÇİN) */}
      {isOwner && (
        <View style={styles.trialContainer}>
          {subscriptionTier === 'trial' ? (
            <TouchableOpacity style={styles.trialBanner} onPress={() => { setSubModalStep('plans'); setIsSubscriptionModalOpen(true); }}>
              <View style={styles.trialTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time" size={16} color="#d97706" />
                  <Text style={styles.trialText}> 14 Günlük Deneme Sürümü: <Text style={{ fontWeight: '800', color: '#b45309' }}>{trialDaysLeft} Gün Kaldı</Text></Text>
                </View>
                <View style={styles.upgradeBadge}>
                  <Text style={styles.upgradeBadgeText}>Paketi Yükselt 🚀</Text>
                </View>
              </View>
              <View style={styles.trialBarBg}>
                <View style={[styles.trialBarFill, { width: `${(trialDaysLeft / 14) * 100}%` }]} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.activePlanBanner} onPress={() => { setSubModalStep('plans'); setIsSubscriptionModalOpen(true); }}>
              <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
              <Text style={styles.activePlanText}>
                Lisans Durumu: <Text style={{ fontWeight: '800', color: '#15803d' }}>{subscriptionTier.toUpperCase()} Saha Paketi (Aktif)</Text>
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#16a34a" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SEKMELER */}
      <View style={{ flex: 1 }}>
        {/* ===================== PATRON: İŞLER SEKMESİ ===================== */}
        {isOwner && activeTab === 'jobs' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {/* 11 AY BAKIM HATIRLATMA BİLGİ KARTI */}
            {myCompanyJobs.some(j => j.isMaintenanceReminder) && (
              <View style={styles.maintenanceCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={18} color="#b45309" />
                  <Text style={styles.maintenanceTitle}>11 Ay Önceki Müşteriler (Bakım Vakti)</Text>
                </View>
                <Text style={styles.maintenanceDesc}>Aşağıdaki müşterilerin son servisinin üzerinden 11 ay geçti. Tek tıkla yıllık periyodik bakım teklifi atın:</Text>
                {myCompanyJobs.filter(j => j.isMaintenanceReminder).map(j => (
                  <View key={j.id} style={styles.maintenanceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: '#0f172a' }}>{j.customerName}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{j.deviceType} • {j.district}</Text>
                    </View>
                    <TouchableOpacity style={styles.waOfferBtn} onPress={() => handleSendMaintenanceOffer(j)}>
                      <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                      <Text style={styles.waOfferText}>Bakım Teklifi Gönder</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servis Çağrıları & İşler ({myCompanyJobs.length})</Text>
              <TouchableOpacity style={styles.actionPillBtn} onPress={() => setIsNewJobOpen(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.actionPillText}>Yeni İş Aç</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {myCompanyJobs.map(job => {
                const assigned = technicians.find(t => t.id === job.technicianId);
                return (
                  <View key={job.id} style={styles.cleanJobCard}>
                    <View style={styles.cleanJobHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cleanJobCode}>{job.jobCode}</Text>
                        <View style={[styles.badgePill, job.status === 'completed' ? styles.badgeSuccess : styles.badgeProgress]}>
                          <Text style={[styles.badgeText, job.status === 'completed' ? styles.badgeTextSuccess : styles.badgeTextProgress]}>
                            {job.status === 'completed' ? 'Tamamlandı' : 'Saha İşlemi'}
                          </Text>
                        </View>
                      </View>
                      {job.status === 'completed' && (
                        <TouchableOpacity style={styles.waReceiptMiniBtn} onPress={() => handleSendWhatsAppReceipt(job)}>
                          <Ionicons name="logo-whatsapp" size={12} color="#059669" />
                          <Text style={styles.waReceiptMiniText}>Servis Fişi</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.cleanJobCust}>{job.customerName} • {job.customerPhone}</Text>
                    <Text style={styles.cleanJobDesc}>{job.deviceType} - {job.faultDescription} ({job.district})</Text>

                    {/* Fotoğraflar Varsa Minik Önizleme */}
                    {(job.photoOld || job.photoNew) && (
                      <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                        {job.photoOld && <Image source={{ uri: job.photoOld }} style={styles.proofThumb} />}
                        {job.photoNew && <Image source={{ uri: job.photoNew }} style={styles.proofThumb} />}
                      </View>
                    )}

                    <View style={styles.cleanJobFooter}>
                      <Text style={styles.cleanJobTech}>Usta: {assigned ? assigned.name : 'Atanmadı'}</Text>
                      {job.status === 'completed' && (
                        <Text style={styles.cleanJobPrice}>{job.totalAmount} ₺ ({job.paymentMethod?.toUpperCase()})</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ===================== PATRON: EKİP SEKMESİ ===================== */}
        {isOwner && activeTab === 'team' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteLabel}>Ekip Davet Kodunuz</Text>
              <Text style={styles.inviteCode}>{currentUser.companyCode}</Text>
              <Text style={styles.inviteSub}>Ustalarınız uygulamayı indirip bu kodla kaydolduklarında otomatik ekibinize dahil olur.</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saha Ustaları ({myCompanyTechs.length})</Text>
            </View>

            <View style={{ gap: 10 }}>
              {myCompanyTechs.map(tech => (
                <View key={tech.id} style={styles.cleanTechCard}>
                  <View style={styles.techIconBox}>
                    <Ionicons name="person" size={20} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cleanTechName}>{tech.name}</Text>
                    <Text style={styles.cleanTechSub}>Araç: {tech.vehiclePlate} • {tech.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callCircleBtn}
                    onPress={() => Linking.openURL(`tel:${tech.phone}`)}
                  >
                    <Ionicons name="call" size={16} color="#0284c7" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.bigAddBtn} onPress={() => setIsAddTechOpen(true)}>
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.bigAddBtnText}>+ Usta Ekle</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ===================== PATRON: KASA SEKMESİ ===================== */}
        {isOwner && activeTab === 'cash' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <View style={styles.totalCashCard}>
              <Text style={styles.totalCashLabel}>TOPLAM KASA GELİRİ</Text>
              <Text style={styles.totalCashVal}>{totalRevenue.toLocaleString('tr-TR')} ₺</Text>
              <Text style={styles.totalCashSub}>{completedJobs.length} Servis Başarıyla Tamamlandı</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 14 }}>
              <View style={styles.cashMiniBox}>
                <Text style={styles.cashMiniLabel}>💵 Nakit Tahsilat</Text>
                <Text style={styles.cashMiniVal}>{cashRevenue.toLocaleString('tr-TR')} ₺</Text>
              </View>
              <View style={styles.cashMiniBox}>
                <Text style={styles.cashMiniLabel}>🏦 Havale / EFT</Text>
                <Text style={styles.cashMiniVal}>{ibanRevenue.toLocaleString('tr-TR')} ₺</Text>
              </View>
            </View>

            {/* Hızlı Fiyat Kataloğu Butonu */}
            <TouchableOpacity style={styles.katalogQuickBanner} onPress={() => setIsCatalogModalOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.katalogIconCircle}>
                  <Ionicons name="pricetag" size={18} color="#0284c7" />
                </View>
                <View>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>Fiyat & Yedek Parça Kataloğu</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{catalog.length} adet standart parça/işlem tanımlı</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginVertical: 10 }]}>Son Tahsilatlar</Text>
            <View style={{ gap: 8 }}>
              {completedJobs.map(j => (
                <View key={j.id} style={styles.cashRowCard}>
                  <View>
                    <Text style={styles.cashCustName}>{j.customerName}</Text>
                    <Text style={styles.cashCustSub}>{j.deviceType} • {j.paymentMethod?.toUpperCase()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.cashAmountText}>+{j.totalAmount} ₺</Text>
                    <TouchableOpacity style={styles.receiptSmallBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                      <Ionicons name="logo-whatsapp" size={10} color="#059669" />
                      <Text style={styles.receiptSmallText}>Fiş Gönder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ===================== USTA: AKTİF GÖREV SEKMESİ ===================== */}
        {!isOwner && activeTab === 'task' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {activeTechJob ? (
              <View style={styles.activeJobBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={styles.activeJobPill}>
                    <Text style={styles.activeJobPillText}>AKTİF SAHA GÖREVİ</Text>
                  </View>
                  <Text style={{ fontWeight: '800', color: '#64748b', fontSize: 12 }}>{activeTechJob.jobCode}</Text>
                </View>

                <Text style={styles.activeCustTitle}>{activeTechJob.customerName}</Text>
                <Text style={styles.activeDeviceTitle}>{activeTechJob.deviceType} ({activeTechJob.brandModel})</Text>

                <TouchableOpacity
                  style={styles.navBox}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(activeTechJob.address + ' ' + activeTechJob.district)}`)}
                >
                  <Ionicons name="navigate" size={18} color="#0284c7" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 13 }}>{activeTechJob.district}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{activeTechJob.address}</Text>
                  </View>
                  <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>Haritada Aç</Text>
                </TouchableOpacity>

                <View style={styles.faultNotice}>
                  <Ionicons name="warning-outline" size={16} color="#b45309" />
                  <Text style={{ color: '#b45309', fontSize: 12, flex: 1 }}>{activeTechJob.faultDescription}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
                  <TouchableOpacity
                    style={styles.btnCall}
                    onPress={() => Linking.openURL(`tel:${activeTechJob.customerPhone}`)}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.btnActionText}>Müşteriyi Ara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnWa}
                    onPress={() => Linking.openURL(`https://wa.me/90${activeTechJob.customerPhone.replace(/[^0-9]/g, '').slice(-10)}`)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                    <Text style={styles.btnActionText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                {/* İş Durumu İlerleme Butonları */}
                {activeTechJob.status === 'assigned' && (
                  <TouchableOpacity
                    style={[styles.bigStepBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={() => {
                      setJobs(jobs.map(j => j.id === activeTechJob.id ? { ...j, status: 'in_transit' } : j));
                    }}
                  >
                    <Ionicons name="car" size={20} color="#fff" />
                    <Text style={styles.bigStepBtnText}>Yola Çıktım</Text>
                  </TouchableOpacity>
                )}

                {activeTechJob.status === 'in_transit' && (
                  <TouchableOpacity
                    style={[styles.bigStepBtn, { backgroundColor: '#0284c7' }]}
                    onPress={() => {
                      setJobs(jobs.map(j => j.id === activeTechJob.id ? { ...j, status: 'in_progress' } : j));
                    }}
                  >
                    <Ionicons name="build" size={20} color="#fff" />
                    <Text style={styles.bigStepBtnText}>Adrese Vardım, Cihaza Başladım</Text>
                  </TouchableOpacity>
                )}

                {activeTechJob.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.bigStepBtn, { backgroundColor: '#16a34a' }]}
                    onPress={() => {
                      setSelectedJobForPay(activeTechJob);
                      setIsPayModalOpen(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.bigStepBtnText}>İşi Tamamla & Tahsilat Al</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="checkbox-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Şu an atanmış aktif görev yok</Text>
                <Text style={styles.emptySub}>Patron yeni servis atadığında anında bildirim alacaksınız.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ===================== USTA: BİTENLER SEKMESİ ===================== */}
        {!isOwner && activeTab === 'history' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>Tamamladığım İşler ({myTechJobs.filter(j => j.status === 'completed').length})</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {myTechJobs.filter(j => j.status === 'completed').map(j => (
                <View key={j.id} style={styles.cleanJobCard}>
                  <View style={styles.cleanJobHeader}>
                    <Text style={styles.cleanJobCode}>{j.jobCode}</Text>
                    <Text style={styles.cleanJobPrice}>{j.totalAmount} ₺</Text>
                  </View>
                  <Text style={styles.cleanJobCust}>{j.customerName}</Text>
                  <Text style={styles.cleanJobDesc}>{j.deviceType} • {j.notes || j.faultDescription}</Text>
                  <TouchableOpacity style={styles.receiptBigBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                    <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                    <Text style={styles.receiptBigBtnText}>Servis Fişi & 1 Yıl Garanti Gönder</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ===================== PROFİL VE AYARLAR SEKMESİ ===================== */}
        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <View style={styles.profileBox}>
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={32} color="#0284c7" />
              </View>
              <Text style={styles.profileName}>{currentUser.name}</Text>
              <Text style={styles.profilePhone}>{currentUser.phone}</Text>
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>{isOwner ? 'Firma Sahibi (Patron)' : 'Saha Ustası'}</Text>
              </View>
            </View>

            {/* PATRON İÇİN ABONELİK VE KATALOG HIZLI YÖNETİMİ */}
            {isOwner && (
              <View style={{ gap: 10, marginBottom: 16 }}>
                <TouchableOpacity style={styles.profileActionCard} onPress={() => { setSubModalStep('plans'); setIsSubscriptionModalOpen(true); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.profileIconWrap, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="diamond" size={20} color="#d97706" />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '800', color: '#0f172a' }}>Abonelik & Paket Durumu</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        {subscriptionTier === 'trial' ? `14 Günlük Deneme (${trialDaysLeft} gün kaldı)` : `${subscriptionTier.toUpperCase()} Paketi`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileActionCard} onPress={() => setIsCatalogModalOpen(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.profileIconWrap, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="pricetags" size={20} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '800', color: '#0f172a' }}>Fiyat & Yedek Parça Kataloğu</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{catalog.length} Standart Parça / Hizmet</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardSettingsList}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Firma Adı</Text>
                <Text style={styles.settingVal}>{currentUser.companyName}</Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Şirket Kodu</Text>
                <Text style={styles.settingVal}>{currentUser.companyCode}</Text>
              </View>
              {currentUser.vehiclePlate && (
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Araç Plakası</Text>
                  <Text style={styles.settingVal}>{currentUser.vehiclePlate}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.logoutFullBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.logoutFullText}>Hesaptan Çıkış Yap</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ===================== BOTTOM NAVIGATION BAR ===================== */}
      <View style={styles.bottomTabBar}>
        {isOwner ? (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('jobs')}>
              <Ionicons name={activeTab === 'jobs' ? 'list' : 'list-outline'} size={22} color={activeTab === 'jobs' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'jobs' && styles.tabItemTextActive]}>İşler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('team')}>
              <Ionicons name={activeTab === 'team' ? 'people' : 'people-outline'} size={22} color={activeTab === 'team' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'team' && styles.tabItemTextActive]}>Ekip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('cash')}>
              <Ionicons name={activeTab === 'cash' ? 'wallet' : 'wallet-outline'} size={22} color={activeTab === 'cash' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'cash' && styles.tabItemTextActive]}>Kasa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={22} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'profile' && styles.tabItemTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('task')}>
              <Ionicons name={activeTab === 'task' ? 'construct' : 'construct-outline'} size={22} color={activeTab === 'task' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'task' && styles.tabItemTextActive]}>Görev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('history')}>
              <Ionicons name={activeTab === 'history' ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} size={22} color={activeTab === 'history' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}>Bitenler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={22} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'profile' && styles.tabItemTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ===================== MODAL: YENİ İŞ KAYDI ===================== */}
      <Modal visible={isNewJobOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Yeni Servis Çağrısı Aç</Text>
              <TouchableOpacity onPress={() => setIsNewJobOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Müşteri Telefonu</Text>
              <TextInput
                style={styles.input}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={cPhone}
                onChangeText={handlePhoneChange}
              />

              {matchedOldCustomer && (
                <TouchableOpacity style={styles.matchedCustomerBanner} onPress={handleAutoFillOldCustomer}>
                  <Ionicons name="flash" size={16} color="#0284c7" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#0284c7', fontSize: 12 }}>Eski Müşteri Hafızası Bulundu!</Text>
                    <Text style={{ fontSize: 11, color: '#0369a1' }}>{matchedOldCustomer.customerName} ({matchedOldCustomer.district}) - Tıkla ve Doldur</Text>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.inputLabel}>Müşteri Adı Soyadı</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Selim Bey"
                placeholderTextColor="#94a3b8"
                value={cName}
                onChangeText={setCName}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cihaz Türü</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kombi, Klima..."
                    placeholderTextColor="#94a3b8"
                    value={cDevice}
                    onChangeText={setCDevice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>İlçe / Bölge</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kadıköy..."
                    placeholderTextColor="#94a3b8"
                    value={cDistrict}
                    onChangeText={setCDistrict}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Açık Adres</Text>
              <TextInput
                style={styles.input}
                placeholder="Mahalle, Sokak, No, Daire..."
                placeholderTextColor="#94a3b8"
                value={cAddress}
                onChangeText={setCAddress}
              />

              <Text style={styles.inputLabel}>Arıza / Şikayet Detayı</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Sıcak su vermiyor, petekler ısınmıyor..."
                placeholderTextColor="#94a3b8"
                multiline
                value={cFault}
                onChangeText={setCFault}
              />

              <Text style={styles.inputLabel}>Atanacak Usta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {myCompanyTechs.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.techPill, selectedTech === t.id && styles.techPillActive]}
                    onPress={() => setSelectedTech(t.id)}
                  >
                    <Text style={[styles.techPillText, selectedTech === t.id && styles.techPillTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateJob}>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>İşi Kaydet ve Ustaya Bildir</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: YENİ USTA EKLE ===================== */}
      <Modal visible={isAddTechOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Ekibe Yeni Usta Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddTechOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Usta Adı Soyadı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Mehmet Usta"
              placeholderTextColor="#94a3b8"
              value={newTechName}
              onChangeText={setNewTechName}
            />
            <Text style={styles.inputLabel}>Telefon Numarası</Text>
            <TextInput
              style={styles.input}
              placeholder="05XX XXX XX XX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newTechPhone}
              onChangeText={setNewTechPhone}
            />
            <Text style={styles.inputLabel}>Araç Plakası</Text>
            <TextInput
              style={styles.input}
              placeholder="34 TB 4102"
              placeholderTextColor="#94a3b8"
              value={newTechPlate}
              onChangeText={setNewTechPlate}
            />
            <Text style={styles.inputLabel}>Giriş Şifresi (Varsayılan: 1234)</Text>
            <TextInput
              style={styles.input}
              placeholder="1234"
              placeholderTextColor="#94a3b8"
              value={newTechPass}
              onChangeText={setNewTechPass}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddTech}>
              <Text style={styles.primaryBtnText}>Ustayı Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: İŞİ BİTİR & TAHSİLAT & PARÇA (USTA) ===================== */}
      <Modal visible={isPayModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>İşi Tamamla & Tahsilat</Text>
              <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* KATALOGDAN PARÇA EKLEME BUTONU */}
              <TouchableOpacity
                style={styles.catalogPickTriggerBtn}
                onPress={() => setIsPickPartModalOpen(true)}
              >
                <Ionicons name="pricetag" size={16} color="#0284c7" />
                <Text style={styles.catalogPickTriggerText}>📦 Fiyat Kataloğundan Parça / İşlem Ekle</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Değişen Parça / Yapılan İşlem</Text>
              <TextInput
                style={[styles.input, { height: 50 }]}
                placeholder="Örn: Fan Motoru Değişimi, Genel Temizlik..."
                placeholderTextColor="#94a3b8"
                value={notesInput}
                onChangeText={setNotesInput}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>İşçilik (TL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={laborInput}
                    onChangeText={setLaborInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Parça Ücreti (TL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={partsInput}
                    onChangeText={setPartsInput}
                  />
                </View>
              </View>

              {/* Eski / Yeni Parça Kamera Kanıtı */}
              <Text style={styles.inputLabel}>📷 Değişen Parça Kanıtı (Garantili Servis)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity style={styles.cameraBox} onPress={() => handlePickPhoto('old')}>
                  {photoOld ? (
                    <Image source={{ uri: photoOld }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={20} color="#64748b" />
                      <Text style={styles.cameraBoxText}>Eski / Arızalı Parça</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cameraBox} onPress={() => handlePickPhoto('new')}>
                  {photoNew ? (
                    <Image source={{ uri: photoNew }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={20} color="#0284c7" />
                      <Text style={styles.cameraBoxText}>Yeni Takılan Parça</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                {(['nakit', 'havale', 'pos'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.payMethodBtn, payMethod === m && styles.payMethodBtnActive]}
                    onPress={() => setPayMethod(m)}
                  >
                    <Text style={[styles.payMethodText, payMethod === m && styles.payMethodTextActive]}>
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.totalBox}>
                <Text style={{ fontWeight: '800', color: '#065f46' }}>Toplam Tahsil Edilecek:</Text>
                <Text style={{ fontWeight: '900', color: '#065f46', fontSize: 20 }}>
                  {((parseFloat(laborInput) || 0) + (parseFloat(partsInput) || 0)).toLocaleString('tr-TR')} ₺
                </Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]} onPress={handleSavePayment}>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Tahsilatı Onayla & İşi Bitir</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: USTA İÇİN KATALOGDAN PARÇA SEÇ ===================== */}
      <Modal visible={isPickPartModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Katalogdan Parça / Hizmet Seç</Text>
              <TouchableOpacity onPress={() => setIsPickPartModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="🔍 Parça veya işlem adı ara (örn: Fan, Bakım)..."
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
                    style={styles.catalogPickItem}
                    onPress={() => handleSelectCatalogItemForJob(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catalogPickName}>{item.name}</Text>
                      <Text style={styles.catalogPickCat}>{item.category}</Text>
                    </View>
                    <View style={styles.catalogPickPriceBadge}>
                      <Text style={styles.catalogPickPriceText}>{item.price} ₺</Text>
                      <Ionicons name="add-circle" size={16} color="#0284c7" />
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL: PATRON FİYAT KATALOĞU YÖNETİMİ ===================== */}
      <Modal visible={isCatalogModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalTop}>
              <View>
                <Text style={styles.modalHeading}>Fiyat & Parça Kataloğu</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Saha ustalarınızın kullanacağı standart fiyat listesi</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCatalogModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Kategori Filtresi */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(['Tümü', 'Kombi', 'Klima', 'Beyaz Eşya', 'Genel'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catFilterPill, catalogFilter === cat && styles.catFilterPillActive]}
                  onPress={() => setCatalogFilter(cat)}
                >
                  <Text style={[styles.catFilterText, catalogFilter === cat && styles.catFilterTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              <View style={{ gap: 8 }}>
                {catalog
                  .filter(c => catalogFilter === 'Tümü' || c.category === catalogFilter)
                  .map(c => (
                    <View key={c.id} style={styles.catalogManageRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogItemName}>{c.name}</Text>
                        <Text style={styles.catalogItemSub}>{c.category} {c.costPrice ? `• Parça Maliyeti: ${c.costPrice} ₺` : ''}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                        <Text style={styles.catalogItemPrice}>{c.price} ₺</Text>
                        <Text style={styles.catalogItemTarife}>Sabit Fiyat</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteCatalogItem(c.id)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.bigAddBtn} onPress={() => setIsAddCatalogItemOpen(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.bigAddBtnText}>+ Yeni Parça / Fiyat Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL: YENİ KATALOG PARÇASI EKLE ===================== */}
      <Modal visible={isAddCatalogItemOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Kataloğa Parça / İşlem Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddCatalogItemOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Parça veya İşlem Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Genleşme Tankı Değişimi"
              placeholderTextColor="#94a3b8"
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {(['Kombi', 'Klima', 'Beyaz Eşya', 'Genel'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.payMethodBtn, newItemCat === cat && styles.payMethodBtnActive]}
                  onPress={() => setNewItemCat(cat)}
                >
                  <Text style={[styles.payMethodText, newItemCat === cat && styles.payMethodTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Müşteri Satış Fiyatı (TL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2400"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Şirket Maliyeti (TL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="900"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newItemCost}
                  onChangeText={setNewItemCost}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCatalogItem}>
              <Text style={styles.primaryBtnText}>Kataloğa Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL: ABONELİK & PAYTR/İYZİCO ÖDEME ===================== */}
      <Modal visible={isSubscriptionModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
            <View style={styles.modalTop}>
              <View>
                <Text style={styles.modalHeading}>
                  {subModalStep === 'plans' ? 'Abonelik Paketleri' : subModalStep === 'checkout' ? '🔒 Güvenli Ödeme (PayTR / İyzico)' : '🎉 Tebrikler!'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>ServisJet Pro Saha Lisansı</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSubscriptionModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {subModalStep === 'plans' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Plan 1: Standart */}
                <TouchableOpacity
                  style={[styles.planCard, selectedPlan === 'standard' && styles.planCardActive]}
                  onPress={() => setSelectedPlan('standard')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.planTitle}>Standart Plan</Text>
                    <Text style={styles.planPrice}>490 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#64748b' }}>/ay</Text></Text>
                  </View>
                  <Text style={styles.planSub}>1 Usta • Sınırsız Servis Fişi • WhatsApp Paylaşımı</Text>
                </TouchableOpacity>

                {/* Plan 2: Pro Saha (Önerilen) */}
                <TouchableOpacity
                  style={[styles.planCard, styles.planCardPro, selectedPlan === 'pro' && styles.planCardActive]}
                  onPress={() => setSelectedPlan('pro')}
                >
                  <View style={styles.proPill}>
                    <Text style={styles.proPillText}>EN ÇOK TERCİH EDİLEN</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={styles.planTitle}>Pro Saha Paketi</Text>
                    <Text style={[styles.planPrice, { color: '#0284c7' }]}>890 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#64748b' }}>/ay</Text></Text>
                  </View>
                  <Text style={styles.planSub}>5 Usta • Yedek Parça Kataloğu • 11 Ay Bakım Hatırlatıcı • Muhasebe & Kasa Raporları</Text>
                </TouchableOpacity>

                {/* Plan 3: Yıllık */}
                <TouchableOpacity
                  style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={styles.planTitle}>Yıllık Kurumsal</Text>
                      <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>2 AY ÜCRETSİZ</Text>
                    </View>
                    <Text style={styles.planPrice}>8.900 ₺ <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#64748b' }}>/yıl</Text></Text>
                  </View>
                  <Text style={styles.planSub}>Sınırsız Usta • Öncelikli 7/24 Telefon Destek • Özel Şirket Logosu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setSubModalStep('checkout')}>
                  <Text style={styles.primaryBtnText}>
                    {selectedPlan === 'pro' ? 'Pro Pakete Geç (890 ₺/ay)' : selectedPlan === 'yearly' ? 'Yıllık Pakete Geç (8.900 ₺)' : 'Standart Pakete Geç (490 ₺)'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </ScrollView>
            )}

            {subModalStep === 'checkout' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Canlı Kredi Kartı Görseli */}
                <View style={styles.creditCardVisual}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Ionicons name="card" size={28} color="#e0f2fe" />
                    <Text style={styles.cardVisualBrand}>PayTR 3D Secure</Text>
                  </View>
                  <Text style={styles.cardVisualNumber}>{cardNumber || '•••• •••• •••• ••••'}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                    <View>
                      <Text style={styles.cardVisualLabel}>KART SAHİBİ</Text>
                      <Text style={styles.cardVisualHolder}>{cardHolder.toUpperCase() || 'AD SOYAD'}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardVisualLabel}>SON KULLANMA</Text>
                      <Text style={styles.cardVisualExp}>{cardExp || 'AA/YY'}</Text>
                    </View>
                  </View>
                </View>

                {/* Kart Bilgileri Formu */}
                <Text style={styles.inputLabel}>Kart Üzerindeki İsim</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ali Kaya"
                  placeholderTextColor="#94a3b8"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                />

                <Text style={styles.inputLabel}>Kart Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4543 0000 0000 0000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>SKT (AA/YY)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="11/28"
                      placeholderTextColor="#94a3b8"
                      value={cardExp}
                      onChangeText={setCardExp}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CVC / CVV</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="834"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      keyboardType="numeric"
                      value={cardCvv}
                      onChangeText={setCardCvv}
                    />
                  </View>
                </View>

                <View style={styles.securityRow}>
                  <Ionicons name="lock-closed" size={14} color="#16a34a" />
                  <Text style={styles.securityText}>256-Bit SSL ile şifrelenmiş güvenli ödeme altyapısı.</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#16a34a', marginTop: 14 }]}
                  onPress={handleProcessPayment}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>
                        {selectedPlan === 'pro' ? '890 ₺ Güvenli Öde' : selectedPlan === 'yearly' ? '8.900 ₺ Güvenli Öde' : '490 ₺ Güvenli Öde'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setSubModalStep('plans')}>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>Paketleri Değiştir</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {subModalStep === 'success' && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark-sharp" size={40} color="#fff" />
                </View>
                <Text style={styles.successTitle}>Ödeme Başarılı!</Text>
                <Text style={styles.successSub}>
                  {currentUser.companyName} firmanız için {selectedPlan.toUpperCase()} Saha Paketi üyeliğiniz aktif edildi.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { width: '100%', marginTop: 24 }]}
                  onPress={() => setIsSubscriptionModalOpen(false)}
                >
                  <Text style={styles.primaryBtnText}>Kullanmaya Başla</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  authContainer: { flex: 1, backgroundColor: '#f8fafc' },
  authScroll: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  authHeader: { alignItems: 'center', marginBottom: 28 },
  logoBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  authBrand: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  authSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },

  toggleRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  toggleTextActive: { color: '#0f172a' },

  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 4 },
  roleBtnActive: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  roleText: { fontSize: 11, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  roleTextActive: { color: '#0284c7' },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  primaryBtn: { backgroundColor: '#0284c7', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 18 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  demoBox: { marginTop: 20, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd' },
  demoTitle: { fontSize: 11, fontWeight: '800', color: '#0369a1', marginBottom: 6 },
  demoLink: { fontSize: 12, color: '#0284c7', fontWeight: '700', marginVertical: 2 },

  // Toast
  toastContainer: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 9999, backgroundColor: '#0f172a', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  toastTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  toastDesc: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  // Üst Başlık
  topBarClean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  firmTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  firmUserSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  headerKatalogBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  headerKatalogText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },

  // Deneme / Abonelik Bannerı
  trialContainer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff' },
  trialBanner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 12, padding: 10 },
  trialTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trialText: { fontSize: 12, color: '#92400e' },
  upgradeBadge: { backgroundColor: '#d97706', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  upgradeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  trialBarBg: { height: 4, backgroundColor: '#fde68a', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  trialBarFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 2 },

  activePlanBanner: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activePlanText: { fontSize: 11, color: '#065f46' },

  tabContent: { padding: 16, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  actionPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  actionPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Kartlar
  cleanJobCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  cleanJobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cleanJobCode: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeSuccess: { backgroundColor: '#ecfdf5' },
  badgeProgress: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextProgress: { color: '#d97706' },

  cleanJobCust: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cleanJobDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cleanJobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 8 },
  cleanJobTech: { fontSize: 11, color: '#64748b' },
  cleanJobPrice: { fontSize: 14, fontWeight: '900', color: '#059669' },

  waReceiptMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  waReceiptMiniText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  proofThumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },

  // Ekip
  inviteCodeBox: { backgroundColor: '#0f172a', borderRadius: 16, padding: 18, marginBottom: 16 },
  inviteLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  inviteCode: { color: '#38bdf8', fontSize: 28, fontWeight: '900', letterSpacing: 2, marginVertical: 4 },
  inviteSub: { color: '#cbd5e1', fontSize: 11 },

  cleanTechCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  techIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  cleanTechName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cleanTechSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  callCircleBtn: { padding: 8, borderRadius: 20, backgroundColor: '#f0f9ff' },
  bigAddBtn: { backgroundColor: '#0284c7', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  bigAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Kasa
  totalCashCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 20, padding: 20, alignItems: 'center' },
  totalCashLabel: { fontSize: 12, fontWeight: '700', color: '#065f46' },
  totalCashVal: { fontSize: 32, fontWeight: '900', color: '#065f46', marginVertical: 4 },
  totalCashSub: { fontSize: 12, color: '#047857' },
  cashMiniBox: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cashMiniLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cashMiniVal: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  cashRowCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  cashCustName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  cashCustSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cashAmountText: { fontSize: 15, fontWeight: '900', color: '#059669' },
  receiptSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  receiptSmallText: { fontSize: 10, fontWeight: '800', color: '#059669' },

  // Bakım Hatırlatma
  maintenanceCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 16, padding: 14, marginBottom: 16 },
  maintenanceTitle: { fontSize: 13, fontWeight: '900', color: '#92400e' },
  maintenanceDesc: { fontSize: 11, color: '#b45309', marginTop: 2, marginBottom: 10 },
  maintenanceRow: { backgroundColor: '#fff', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  waOfferBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  waOfferText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  matchedCustomerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0f2fe', padding: 10, borderRadius: 10, marginVertical: 6 },
  cameraBox: { flex: 1, height: 75, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cameraBoxText: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 4, textAlign: 'center' },
  previewImage: { width: '100%', height: '100%' },

  // Profil
  profileBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  profileAvatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  profilePhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
  profileBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  profileBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  profileActionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  profileIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardSettingsList: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 14 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  settingVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  logoutFullBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  logoutFullText: { color: '#ef4444', fontSize: 14, fontWeight: '800' },

  // Bottom Tab
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabItemText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  tabItemTextActive: { color: '#0284c7' },

  // Usta Görev
  activeJobBox: { backgroundColor: '#fff', borderRadius: 20, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  activeJobPill: { backgroundColor: '#0284c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeJobPillText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  activeCustTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  activeDeviceTitle: { fontSize: 13, fontWeight: '700', color: '#0284c7', marginTop: 2, marginBottom: 12 },
  navBox: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  faultNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', padding: 10, borderRadius: 10, marginBottom: 12 },
  btnCall: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  btnWa: { flex: 1, backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  btnActionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bigStepBtn: { paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  bigStepBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  receiptBigBtn: { backgroundColor: '#16a34a', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  receiptBigBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },

  // Modallar
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalHeading: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  techPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', marginRight: 6 },
  techPillActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  techPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  techPillTextActive: { color: '#fff' },
  totalBox: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  payMethodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  payMethodBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  payMethodText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  payMethodTextActive: { color: '#fff' },

  // Katalog UI Stilleri
  katalogQuickBanner: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  katalogIconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  catalogPickTriggerBtn: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  catalogPickTriggerText: { color: '#0284c7', fontWeight: '800', fontSize: 13 },
  catFilterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 6 },
  catFilterPillActive: { backgroundColor: '#0284c7' },
  catFilterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  catFilterTextActive: { color: '#fff' },
  catalogManageRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  catalogItemName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  catalogItemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  catalogItemPrice: { fontSize: 14, fontWeight: '900', color: '#0284c7' },
  catalogItemTarife: { fontSize: 9, color: '#64748b' },
  catalogPickItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  catalogPickName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  catalogPickCat: { fontSize: 10, color: '#64748b', marginTop: 2 },
  catalogPickPriceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  catalogPickPriceText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },

  // Abonelik & Ödeme UI Stilleri
  planCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12 },
  planCardActive: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  planCardPro: { borderColor: '#38bdf8' },
  proPill: { alignSelf: 'flex-start', backgroundColor: '#0284c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  proPillText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  planTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  planPrice: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  planSub: { fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 16 },

  creditCardVisual: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardVisualBrand: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },
  cardVisualNumber: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginVertical: 18 },
  cardVisualLabel: { color: '#64748b', fontSize: 9, fontWeight: '700' },
  cardVisualHolder: { color: '#e2e8f0', fontSize: 12, fontWeight: '800', marginTop: 2 },
  cardVisualExp: { color: '#e2e8f0', fontSize: 12, fontWeight: '800', marginTop: 2 },

  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' },
  securityText: { fontSize: 11, color: '#64748b' },
  successCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  successSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }
});
