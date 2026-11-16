import { SyncService } from './src/lib/syncService';
import { supabase } from './src/lib/supabase';
import React, { useState } from 'react';
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
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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

  // UYGULAMA AÇILDIĞINDA KALICI VERİLERİ VE BULUTU YÜKLE
  React.useEffect(() => {
    async function initStorage() {
      const savedUser = await SyncService.loadLocal('@servisjet_current_user');
      const savedUsers = await SyncService.loadLocal('@servisjet_users');
      const savedJobs = await SyncService.loadLocal('@servisjet_jobs');
      const savedTechs = await SyncService.loadLocal('@servisjet_techs');

      if (savedUsers) setUsers(savedUsers);
      if (savedJobs) setJobs(savedJobs);
      if (savedTechs) setTechnicians(savedTechs);
      if (savedUser) {
        setCurrentUser(savedUser);
        setActiveTab(savedUser.role === 'owner' ? 'jobs' : 'task');

        // Buluttan en güncel işleri çek
        const cloudJobs = await SyncService.fetchJobsFromCloud(savedUser.companyId);
        if (cloudJobs && cloudJobs.length > 0) {
          setJobs(cloudJobs);
        }
      }
    }
    initStorage();
  }, []);

  // GERÇEK ZAMANLI (REALTIME) BULUT DİNLEYİCİSİ
  React.useEffect(() => {
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


  // Veri değiştikçe yerel hafızaya otomatik kaydet
  React.useEffect(() => {
    SyncService.saveLocal('@servisjet_users', users);
  }, [users]);

  React.useEffect(() => {
    SyncService.saveLocal('@servisjet_jobs', jobs);
  }, [jobs]);

  React.useEffect(() => {
    SyncService.saveLocal('@servisjet_techs', technicians);
  }, [technicians]);

  React.useEffect(() => {
    if (currentUser) {
      SyncService.saveLocal('@servisjet_current_user', currentUser);
    } else {
      SyncService.saveLocal('@servisjet_current_user', null);
    }
  }, [currentUser]);


  // Auth
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

  // Fotoğraf Çekme Fonksiyonu
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

  // WhatsApp Dijital Servis Fişi & 1 Yıl Garanti Gönderme
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

  // 11 Ay Sonra Yıllık Bakım Teklifi Gönderme (WhatsApp)
  const handleSendMaintenanceOffer = (job: Job) => {
    const cleanPhone = job.customerPhone.replace(/[^0-9]/g, '').slice(-10);
    const msg = 
`Sayın ${job.customerName} merhaba, ${currentUser?.companyName} servisinden yazıyoruz.
${job.deviceType} cihazınızın periyodik bakımının üzerinden 1 yıl geçti.
Verimli ısınma ve elektrik/doğalgaz tasarrufu için yıllık bakım zamanınız gelmiştir.
Bu haftaya özel %20 indirimli bakım randevunuzu oluşturalım mı?`;

    Linking.openURL(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  // Giriş / Kayıt
  const handleLogin = () => {
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
    } else {
      Alert.alert('Hatalı Giriş', 'Telefon numarası veya şifre eşleşmedi.');
    }
  };

  const handleRegister = () => {
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

  const handleCreateJob = () => {
    if (!currentUser) return;
    if (!cName.trim() || !cPhone.trim() || !cFault.trim()) {
      Alert.alert('Eksik Bilgi', 'Müşteri adı, telefon ve arıza açıklaması girilmelidir.');
      return;
    }
    const myTechs = technicians.filter(t => t.companyId === currentUser.companyId);
    const assignedId = selectedTech || (myTechs.length > 0 ? myTechs[0].id : '');
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
    Alert.alert('İş Kaydedildi!', `${newJob.jobCode} nolu servis kaydı oluşturuldu.`);
  };

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

    Alert.alert(
      'Tahsilat Alındı!',
      `${tot.toLocaleString('tr-TR')} ₺ kasaya eklendi.
Müşteriye 1 Yıl Garanti Belgesi ve Servis Fişi göndermek ister misiniz?`,
      [
        { text: 'Kapat', style: 'cancel' },
        { 
          text: '📄 WhatsApp Fişi Gönder', 
          onPress: () => {
            if (updatedJob) handleSendWhatsAppReceipt(updatedJob);
          }
        }
      ]
    );
  };

  const myCompanyJobs = jobs.filter(j => j.companyId === currentUser?.companyId);
  const myCompanyTechs = technicians.filter(t => t.companyId === currentUser?.companyId);
  const completedJobs = myCompanyJobs.filter(j => j.status === 'completed');
  const totalMoney = completedJobs.reduce((s, j) => s + j.totalAmount, 0);
  const totalCash = completedJobs.filter(j => j.paymentMethod === 'nakit').reduce((s, j) => s + j.totalAmount, 0);
  const totalHavale = completedJobs.filter(j => j.paymentMethod === 'havale').reduce((s, j) => s + j.totalAmount, 0);

  const maintenanceDueJobs = myCompanyJobs.filter(j => j.isMaintenanceReminder);

  const myUstaActiveJob = myCompanyJobs.find(j => j.technicianId === currentUser?.id && j.status !== 'completed');
  const myUstaCompletedJobs = myCompanyJobs.filter(j => j.technicianId === currentUser?.id && j.status === 'completed');

  // GİRİŞ / KAYIT EKRANI
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authScroll}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={styles.appIconCircle}>
                <Ionicons name="flash" size={32} color="#0284c7" />
              </View>
              <Text style={styles.authTitle}>ServisJet</Text>
              <Text style={styles.authSub}>Saha Servis & Teknisyen Takibi</Text>
            </View>

            <View style={styles.authTabs}>
              <TouchableOpacity style={[styles.authTab, authView === 'login' && styles.authTabActive]} onPress={() => setAuthView('login')}>
                <Text style={[styles.authTabText, authView === 'login' && styles.authTabTextActive]}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.authTab, authView === 'register' && styles.authTabActive]} onPress={() => setAuthView('register')}>
                <Text style={[styles.authTabText, authView === 'register' && styles.authTabTextActive]}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {authView === 'login' ? (
              <View style={styles.boxCard}>
                <Text style={styles.fieldLabel}>Telefon Numarası</Text>
                <TextInput style={styles.fieldInput} placeholder="05321002030" keyboardType="phone-pad" value={loginPhone} onChangeText={setLoginPhone} />
                <Text style={styles.fieldLabel}>Şifre</Text>
                <TextInput style={styles.fieldInput} placeholder="••••" secureTextEntry value={loginPass} onChangeText={setLoginPass} />
                <TouchableOpacity style={styles.btnBlue} onPress={handleLogin}><Text style={styles.btnBlueText}>Giriş Yap</Text></TouchableOpacity>

                <View style={styles.orBox}><Text style={styles.orText}>VEYA DEMO GİRİŞİ YAP</Text></View>
                <TouchableOpacity style={styles.btnOutline} onPress={() => { setCurrentUser(users[0]); setActiveTab('jobs'); }}>
                  <Text style={styles.btnOutlineText}>🏢 Patron Olarak Gir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={() => { setCurrentUser(users[1]); setActiveTab('task'); }}>
                  <Text style={styles.btnOutlineText}>🔧 Ahmet Usta Olarak Gir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.boxCard}>
                <Text style={styles.fieldLabel}>Kayıt Tipi</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity style={[styles.chip, regRole === 'owner' && styles.chipActive]} onPress={() => setRegRole('owner')}>
                    <Text style={[styles.chipText, regRole === 'owner' && styles.chipTextActive]}>Firma Sahibi (Patron)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, regRole === 'technician' && styles.chipActive]} onPress={() => setRegRole('technician')}>
                    <Text style={[styles.chipText, regRole === 'technician' && styles.chipTextActive]}>Usta / Teknisyen</Text>
                  </TouchableOpacity>
                </View>

                {regRole === 'owner' ? (
                  <>
                    <Text style={styles.fieldLabel}>Servis Firma Adı *</Text>
                    <TextInput style={styles.fieldInput} placeholder="Örn: Kaya Kombi" value={regCompany} onChangeText={setRegCompany} />
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Şirket Davet Kodu * (Patrondan Alınır)</Text>
                    <TextInput style={styles.fieldInput} placeholder="Örn: EGE34" autoCapitalize="characters" value={regInviteCode} onChangeText={setRegInviteCode} />
                    <Text style={styles.fieldLabel}>Araç Plakası</Text>
                    <TextInput style={styles.fieldInput} placeholder="34 AB 123" value={regPlate} onChangeText={setRegPlate} />
                  </>
                )}

                <Text style={styles.fieldLabel}>Ad Soyad *</Text>
                <TextInput style={styles.fieldInput} placeholder="Ad Soyad" value={regName} onChangeText={setRegName} />
                <Text style={styles.fieldLabel}>Telefon *</Text>
                <TextInput style={styles.fieldInput} placeholder="05XX XXX XX XX" keyboardType="phone-pad" value={regPhone} onChangeText={setRegPhone} />
                <Text style={styles.fieldLabel}>Şifre *</Text>
                <TextInput style={styles.fieldInput} placeholder="••••" secureTextEntry value={regPass} onChangeText={setRegPass} />
                <TouchableOpacity style={styles.btnBlue} onPress={handleRegister}><Text style={styles.btnBlueText}>Kayıt Ol ve Başla</Text></TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ANA UYGULAMA (GİRİŞ YAPILMIŞ)
  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar style="dark" />

      {/* ÜST BAR */}
      <View style={styles.topBarClean}>
        <View>
          <Text style={styles.topBarCompany}>{currentUser.companyName}</Text>
          <Text style={styles.topBarRole}>{currentUser.role === 'owner' ? '🏢 Yönetici Paneli' : '🔧 Saha Teknisyeni'}</Text>
        </View>
        
      </View>

      <View style={{ flex: 1 }}>
        {/* PATRON: 1. İŞLER */}
        {currentUser.role === 'owner' && activeTab === 'jobs' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>Günün İş Emirleri ({myCompanyJobs.length})</Text>
              <TouchableOpacity onPress={() => setIsNewJobOpen(true)}><Text style={styles.sectionActionLink}>+ Yeni İş Ekle</Text></TouchableOpacity>
            </View>

            {myCompanyJobs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz açık bir iş emri yok</Text>
                <Text style={styles.emptySubText}>Sağ üstteki "+ İş Aç" butonuna basarak ilk servis kaydınızı açın.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {myCompanyJobs.map(j => {
                  const tech = technicians.find(t => t.id === j.technicianId);
                  return (
                    <View key={j.id} style={styles.cleanJobCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.cleanJobCode}>{j.jobCode}</Text>
                        <Text style={[styles.cleanJobStatus, j.status === 'completed' ? { color: '#059669', backgroundColor: '#ecfdf5' } : { color: '#0284c7', backgroundColor: '#e0f2fe' }]}>
                          {j.status === 'completed' ? 'TAMAMLANDI' : 'DEVAM EDİYOR'}
                        </Text>
                      </View>

                      <Text style={styles.cleanJobCustomer}>{j.customerName}</Text>
                      <Text style={styles.cleanJobSub}>{j.deviceType} • {j.district} ({j.address})</Text>
                      <Text style={styles.cleanJobFault}>⚠️ {j.faultDescription}</Text>

                      {/* FOTOĞRAF KANITI VARSA GÖSTER */}
                      {(j.photoOld || j.photoNew) && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          {j.photoOld && <Image source={{ uri: j.photoOld }} style={styles.proofThumb} />}
                          {j.photoNew && <Image source={{ uri: j.photoNew }} style={styles.proofThumb} />}
                          <Text style={{ fontSize: 11, color: '#059669', alignSelf: 'center', fontWeight: '700' }}>📸 Parça Değişim Kanıtı Eklendi</Text>
                        </View>
                      )}

                      <View style={styles.cleanJobFooter}>
                        <Text style={styles.cleanJobTech}>Usta: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{tech?.name || 'Atanmadı'}</Text></Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {j.status === 'completed' && (
                            <TouchableOpacity style={styles.waReceiptMiniBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                              <Ionicons name="document-text" size={14} color="#059669" />
                              <Text style={styles.waReceiptMiniText}>Fiş Gönder</Text>
                            </TouchableOpacity>
                          )}
                          <Text style={styles.cleanJobPrice}>{j.totalAmount} ₺</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* PATRON: 2. EKİP */}
        {currentUser.role === 'owner' && activeTab === 'team' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>Sahadaki Ustalarım ({myCompanyTechs.length})</Text>
              <TouchableOpacity onPress={() => setIsAddTechOpen(true)}><Text style={styles.sectionActionLink}>+ Usta Ekle</Text></TouchableOpacity>
            </View>

            {myCompanyTechs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Ekibinizde henüz usta yok</Text>
                <Text style={styles.emptySubText}>"+ Usta Ekle" butonuna basarak ilk ustanızı ekleyin.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {myCompanyTechs.map(t => (
                  <View key={t.id} style={styles.cleanTechCard}>
                    <View style={styles.techIconBox}><Ionicons name="construct" size={20} color="#0284c7" /></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cleanTechName}>{t.name}</Text>
                      <Text style={styles.cleanTechSub}>🚗 {t.vehiclePlate} • 📞 {t.phone}</Text>
                    </View>
                    <TouchableOpacity style={styles.callCircleBtn} onPress={() => Linking.openURL(`tel:${t.phone}`)}>
                      <Ionicons name="call" size={18} color="#0284c7" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.bigAddBtn} onPress={() => setIsAddTechOpen(true)}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.bigAddBtnText}>Yeni Usta Ekle</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* PATRON: 3. KASA & YILLIK BAKIM HATIRLATICI */}
        {currentUser.role === 'owner' && activeTab === 'cash' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            {/* 11 AY SONRA BAKIM HATIRLATICI BÖLÜMÜ */}
            {maintenanceDueJobs.length > 0 && (
              <View style={styles.maintenanceCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alarm" size={22} color="#b45309" />
                  <Text style={styles.maintenanceTitle}>Yaklaşan Yıllık Bakımlar ({maintenanceDueJobs.length})</Text>
                </View>
                <Text style={styles.maintenanceDesc}>11 ay önce bakım yapılan müşterilere tek dokunuşla bakım teklifi atarak yeni ciro yaratabilirsiniz.</Text>

                {maintenanceDueJobs.map(mj => (
                  <View key={mj.id} style={styles.maintenanceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: '#0f172a' }}>{mj.customerName}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{mj.deviceType} • {mj.completedDate}</Text>
                    </View>
                    <TouchableOpacity style={styles.waOfferBtn} onPress={() => handleSendMaintenanceOffer(mj)}>
                      <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                      <Text style={styles.waOfferText}>Bakım Teklifi At</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.totalCashCard}>
              <Text style={styles.totalCashLabel}>Bugünkü Toplam Kasa</Text>
              <Text style={styles.totalCashVal}>{totalMoney.toLocaleString('tr-TR')} ₺</Text>
              <Text style={styles.totalCashSub}>{completedJobs.length} servis tamamlandı</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <View style={styles.cashMiniBox}>
                <Text style={styles.cashMiniLabel}>Nakit Alınan</Text>
                <Text style={styles.cashMiniVal}>{totalCash.toLocaleString('tr-TR')} ₺</Text>
              </View>
              <View style={styles.cashMiniBox}>
                <Text style={styles.cashMiniLabel}>Havale / IBAN</Text>
                <Text style={styles.cashMiniVal}>{totalHavale.toLocaleString('tr-TR')} ₺</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitleText, { marginTop: 24, marginBottom: 10 }]}>Biten Tahsilatlar & Servis Fişleri</Text>
            <View style={{ gap: 8 }}>
              {completedJobs.map(j => (
                <View key={j.id} style={styles.cashRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashCustName}>{j.customerName}</Text>
                    <Text style={styles.cashCustSub}>{j.deviceType} • {j.paymentMethod?.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity style={styles.receiptSmallBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                    <Ionicons name="logo-whatsapp" size={14} color="#059669" />
                    <Text style={styles.receiptSmallText}>Fiş Gönder</Text>
                  </TouchableOpacity>
                  <Text style={styles.cashAmountText}>+{j.totalAmount} ₺</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* USTA: 1. GÖREV (FOTOĞRAF VE WHATSAPP SERVİS FİŞİ DESTEKLİ) */}
        {currentUser.role === 'technician' && activeTab === 'task' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            {myUstaActiveJob ? (
              <View style={styles.activeJobBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={styles.activeJobPill}>
                    <Text style={styles.activeJobPillText}>
                      {myUstaActiveJob.status === 'in_transit' ? 'YOLDASINIZ' :
                       myUstaActiveJob.status === 'in_progress' ? 'ADRESTESİNİZ' : 'YENİ GÖREV'}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: '800', color: '#64748b' }}>{myUstaActiveJob.jobCode}</Text>
                </View>

                <Text style={styles.activeCustTitle}>{myUstaActiveJob.customerName}</Text>
                <Text style={styles.activeDeviceTitle}>{myUstaActiveJob.deviceType}</Text>

                <TouchableOpacity
                  style={styles.navBox}
                  onPress={() => {
                    const q = encodeURIComponent(`${myUstaActiveJob.address} ${myUstaActiveJob.district}`);
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                  }}
                >
                  <Ionicons name="location" size={24} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontWeight: '800', color: '#0f172a' }}>{myUstaActiveJob.district}</Text>
                    <Text style={{ color: '#475569', fontSize: 12 }}>{myUstaActiveJob.address}</Text>
                    <Text style={{ color: '#0284c7', fontWeight: '700', fontSize: 11, marginTop: 4 }}>Haritada Yolu Aç ➔</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.faultNotice}>
                  <Ionicons name="alert-circle" size={18} color="#b45309" />
                  <Text style={{ color: '#92400e', fontSize: 12, flex: 1, fontWeight: '600' }}>{myUstaActiveJob.faultDescription}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                  <TouchableOpacity style={styles.btnCall} onPress={() => Linking.openURL(`tel:${myUstaActiveJob.customerPhone}`)}>
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.btnActionText}>Müşteriyi Ara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnWa}
                    onPress={() => {
                      const clean = myUstaActiveJob.customerPhone.replace(/[^0-9]/g, '').slice(-10);
                      const msg = `Merhaba ${myUstaActiveJob.customerName}, teknisyeniniz yola çıktı, 15 dakikaya adresinizdeyim.`;
                      Linking.openURL(`https://wa.me/90${clean}?text=${encodeURI(msg)}`);
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    <Text style={styles.btnActionText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 10 }}>
                  {myUstaActiveJob.status === 'assigned' && (
                    <TouchableOpacity
                      style={[styles.bigStepBtn, { backgroundColor: '#0284c7' }]}
                      onPress={() => setJobs(prev => prev.map(j => j.id === myUstaActiveJob.id ? { ...j, status: 'in_transit' } : j))}
                    >
                      <Ionicons name="car" size={22} color="#fff" /><Text style={styles.bigStepBtnText}>YOLA ÇIKTIM</Text>
                    </TouchableOpacity>
                  )}
                  {myUstaActiveJob.status === 'in_transit' && (
                    <TouchableOpacity
                      style={[styles.bigStepBtn, { backgroundColor: '#7c3aed' }]}
                      onPress={() => setJobs(prev => prev.map(j => j.id === myUstaActiveJob.id ? { ...j, status: 'in_progress' } : j))}
                    >
                      <Ionicons name="pin" size={22} color="#fff" /><Text style={styles.bigStepBtnText}>ADRESE VARDIM</Text>
                    </TouchableOpacity>
                  )}
                  {myUstaActiveJob.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[styles.bigStepBtn, { backgroundColor: '#059669' }]}
                      onPress={() => { setSelectedJobForPay(myUstaActiveJob); setIsPayModalOpen(true); }}
                    >
                      <Ionicons name="checkmark-done" size={24} color="#fff" /><Text style={styles.bigStepBtnText}>İŞİ BİTİR & FİŞ OLUŞTUR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={56} color="#059669" />
                <Text style={styles.emptyTitle}>Şu an atanmış aktif işiniz yok</Text>
                <Text style={styles.emptySubText}>Patron yeni bir arıza atadığında burada göreceksiniz.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* USTA: 2. BİTENLER & SERVİS FİŞİ PAYLAŞ */}
        {currentUser.role === 'technician' && activeTab === 'history' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            <Text style={styles.sectionTitleText}>Bugün Tamamladığınız İşler ({myUstaCompletedJobs.length})</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {myUstaCompletedJobs.map(j => (
                <View key={j.id} style={styles.cleanJobCard}>
                  <Text style={styles.cleanJobCustomer}>{j.customerName}</Text>
                  <Text style={styles.cleanJobSub}>{j.deviceType} • {j.district}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#059669', marginVertical: 4 }}>Tahsil Edilen: {j.totalAmount} ₺ ({j.paymentMethod?.toUpperCase()})</Text>

                  <TouchableOpacity style={styles.receiptBigBtn} onPress={() => handleSendWhatsAppReceipt(j)}>
                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    <Text style={styles.receiptBigBtnText}>Müşteriye 1 Yıl Garanti & Servis Fişi Gönder</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ORTAK: PROFİL */}
        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={styles.tabContentScroll}>
            <View style={styles.profileBox}>
              <View style={styles.profileAvatar}><Ionicons name="person" size={32} color="#0284c7" /></View>
              <Text style={styles.profileName}>{currentUser.name}</Text>
              <Text style={styles.profilePhone}>{currentUser.phone}</Text>
              <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>{currentUser.role === 'owner' ? 'FİRMA YÖNETİCİSİ' : 'TEKNİSYEN'}</Text></View>
            </View>

            <View style={styles.cardSettingsList}>
              <View style={styles.settingRow}><Text style={styles.settingLabel}>Şirket Adı</Text><Text style={styles.settingVal}>{currentUser.companyName}</Text></View>
              <View style={styles.settingRow}><Text style={styles.settingLabel}>Ekip Davet Kodu</Text><Text style={[styles.settingVal, { fontWeight: '900', color: '#0284c7' }]}>{currentUser.companyCode}</Text></View>
              {currentUser.vehiclePlate && (
                <View style={styles.settingRow}><Text style={styles.settingLabel}>Araç Plakası</Text><Text style={styles.settingVal}>{currentUser.vehiclePlate}</Text></View>
              )}
            </View>

            <TouchableOpacity style={styles.logoutFullBtn} onPress={() => {
              Alert.alert('Çıkış', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: () => setCurrentUser(null) }
              ]);
            }}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutFullText}>Oturumu Kapat</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ALT ÇUBUK MENÜ */}
      <View style={styles.bottomTabBar}>
        {currentUser.role === 'owner' ? (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('jobs')}>
              <Ionicons name="clipboard" size={22} color={activeTab === 'jobs' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'jobs' && styles.tabItemTextActive]}>İşler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('team')}>
              <Ionicons name="people" size={22} color={activeTab === 'team' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'team' && styles.tabItemTextActive]}>Ekip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('cash')}>
              <Ionicons name="wallet" size={22} color={activeTab === 'cash' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'cash' && styles.tabItemTextActive]}>Kasa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name="person" size={22} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'profile' && styles.tabItemTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('task')}>
              <Ionicons name="construct" size={22} color={activeTab === 'task' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'task' && styles.tabItemTextActive]}>Görev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('history')}>
              <Ionicons name="checkmark-done-circle" size={22} color={activeTab === 'history' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}>Bitenler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
              <Ionicons name="person" size={22} color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'} />
              <Text style={[styles.tabItemText, activeTab === 'profile' && styles.tabItemTextActive]}>Profil</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* MODAL: YENİ İŞ AÇ (MÜŞTERİ HAFIZASI DESTEKLİ) */}
      <Modal visible={isNewJobOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Yeni Servis Kaydı Aç</Text>
              <TouchableOpacity onPress={() => setIsNewJobOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.fieldLabel}>Telefon Numarası *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="05XX XXX XX XX"
                keyboardType="phone-pad"
                value={cPhone}
                onChangeText={handlePhoneChange}
              />

              {/* MÜŞTERİ HAFIZASI BANNERI */}
              {matchedOldCustomer && (
                <TouchableOpacity style={styles.matchedCustomerBanner} onPress={handleAutoFillOldCustomer}>
                  <Ionicons name="sparkles" size={18} color="#0284c7" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#0284c7', fontSize: 12 }}>Kayıtlı Müşteri Bulundu!</Text>
                    <Text style={{ fontSize: 11, color: '#475569' }}>{matchedOldCustomer.customerName} ({matchedOldCustomer.deviceType} - {matchedOldCustomer.district})</Text>
                    <Text style={{ fontSize: 10, color: '#0284c7', fontWeight: '700', marginTop: 2 }}>Bilgileri Otomatik Doldur ➔</Text>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>Müşteri Ad Soyad *</Text>
              <TextInput style={styles.fieldInput} placeholder="Örn: Ayşe Hanım" value={cName} onChangeText={setCName} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>İlçe</Text>
                  <TextInput style={styles.fieldInput} value={cDistrict} onChangeText={setCDistrict} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Cihaz Tipi</Text>
                  <TextInput style={styles.fieldInput} value={cDevice} onChangeText={setCDevice} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Açık Adres</Text>
              <TextInput style={styles.fieldInput} placeholder="Mahalle, Sokak, No" value={cAddress} onChangeText={setCAddress} />

              <Text style={styles.fieldLabel}>Arıza Tanımı *</Text>
              <TextInput style={[styles.fieldInput, { height: 60 }]} placeholder="Şikayet nedir?" multiline value={cFault} onChangeText={setCFault} />

              <Text style={styles.fieldLabel}>Hangi Ustaya Atansın?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {myCompanyTechs.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.techPill, selectedTech === t.id && styles.techPillActive]}
                    onPress={() => setSelectedTech(t.id)}
                  >
                    <Text style={[styles.techPillText, selectedTech === t.id && styles.techPillTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.btnBlue} onPress={handleCreateJob}><Text style={styles.btnBlueText}>Kaydet ve Sahaya Gönder</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: USTA EKLE */}
      <Modal visible={isAddTechOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Ekibe Yeni Usta Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddTechOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.fieldLabel}>Ustanın Adı Soyadı *</Text>
              <TextInput style={styles.fieldInput} placeholder="Örn: Murat Usta" value={newTechName} onChangeText={setNewTechName} />
              <Text style={styles.fieldLabel}>Ustanın Telefon Numarası *</Text>
              <TextInput style={styles.fieldInput} placeholder="05XX XXX XX XX" keyboardType="phone-pad" value={newTechPhone} onChangeText={setNewTechPhone} />
              <Text style={styles.fieldLabel}>Araç Plakası</Text>
              <TextInput style={styles.fieldInput} placeholder="34 TB 4102" value={newTechPlate} onChangeText={setNewTechPlate} />
              <Text style={styles.fieldLabel}>Giriş Şifresi</Text>
              <TextInput style={styles.fieldInput} value={newTechPass} onChangeText={setNewTechPass} />
              <TouchableOpacity style={styles.btnBlue} onPress={handleAddTech}><Text style={styles.btnBlueText}>Ustayı Ekibe Kaydet</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: TAHSİLAT & FOTOĞRAFLI KANIT */}
      <Modal visible={isPayModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>İşi Kapat & Fiş Oluştur</Text>
              <TouchableOpacity onPress={() => setIsPayModalOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.fieldLabel}>Yapılan İşlem / Not</Text>
              <TextInput style={styles.fieldInput} placeholder="Örn: Ateşleme elektrodu değişti..." value={notesInput} onChangeText={setNotesInput} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>İşçilik (₺)</Text>
                  <TextInput style={styles.fieldInput} keyboardType="numeric" value={laborInput} onChangeText={setLaborInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Parça (₺)</Text>
                  <TextInput style={styles.fieldInput} keyboardType="numeric" value={partsInput} onChangeText={setPartsInput} />
                </View>
              </View>

              {/* 📸 PARÇA VE ARIZA FOTOĞRAFI EKLEME */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Parça Fotoğrafı (Patron & Müşteri Kanıtı)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={styles.cameraBox} onPress={() => handlePickPhoto('old')}>
                  {photoOld ? (
                    <Image source={{ uri: photoOld }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#0284c7" />
                      <Text style={styles.cameraBoxText}>Eski Parça Fotoğrafı</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cameraBox} onPress={() => handlePickPhoto('new')}>
                  {photoNew ? (
                    <Image source={{ uri: photoNew }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#059669" />
                      <Text style={styles.cameraBoxText}>Yeni Parça Fotoğrafı</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Ödeme Yöntemi</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['nakit', 'havale', 'pos', 'garanti'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, payMethod === m && styles.chipActive]}
                    onPress={() => setPayMethod(m)}
                  >
                    <Text style={[styles.chipText, payMethod === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.totalBox}>
                <Text style={{ fontWeight: '700', color: '#065f46' }}>Toplam Alınacak:</Text>
                <Text style={{ fontWeight: '900', fontSize: 18, color: '#065f46' }}>
                  {((parseFloat(laborInput) || 0) + (parseFloat(partsInput) || 0)).toLocaleString('tr-TR')} ₺
                </Text>
              </View>

              <TouchableOpacity style={[styles.btnBlue, { backgroundColor: '#059669' }]} onPress={handleSavePayment}>
                <Text style={styles.btnBlueText}>Tahsilatı Onayla & Garanti Belgesi Ver</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#f8fafc' },
  authScroll: { padding: 24, paddingTop: 40, justifyContent: 'center' },
  appIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  authTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  authSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  authTabs: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 16 },
  authTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  authTabActive: { backgroundColor: '#fff' },
  authTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  authTabTextActive: { color: '#0f172a' },
  boxCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  fieldInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0f172a' },
  btnBlue: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnBlueText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  orBox: { alignItems: 'center', marginVertical: 16 },
  orText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  btnOutline: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnOutlineText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  chip: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, alignItems: 'center' },
  chipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },

  appContainer: { flex: 1, backgroundColor: '#f8fafc' },
  topBarClean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  topBarCompany: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  topBarRole: { fontSize: 12, color: '#64748b', marginTop: 1 },
  quickAddJobBtn: { backgroundColor: '#0284c7', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  quickAddJobText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  tabContentScroll: { padding: 16, paddingBottom: 30 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionActionLink: { fontSize: 13, fontWeight: '700', color: '#0284c7' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  emptySubText: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, lineHeight: 18 },

  cleanJobCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cleanJobCode: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  cleanJobStatus: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cleanJobCustomer: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  cleanJobSub: { fontSize: 12, color: '#475569', marginTop: 2 },
  cleanJobFault: { fontSize: 12, color: '#b45309', marginTop: 4 },
  cleanJobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cleanJobTech: { fontSize: 11, color: '#64748b' },
  cleanJobPrice: { fontSize: 15, fontWeight: '900', color: '#059669' },

  waReceiptMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  waReceiptMiniText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  proofThumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },

  cleanTechCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  techIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  cleanTechName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cleanTechSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  callCircleBtn: { padding: 8, borderRadius: 20, backgroundColor: '#f0f9ff' },
  bigAddBtn: { backgroundColor: '#0284c7', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  bigAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  totalCashCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 20, padding: 20, alignItems: 'center' },
  totalCashLabel: { fontSize: 13, fontWeight: '700', color: '#065f46' },
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

  // Bakım Hatırlatıcı Kartı
  maintenanceCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 16, padding: 14, marginBottom: 16 },
  maintenanceTitle: { fontSize: 14, fontWeight: '900', color: '#92400e' },
  maintenanceDesc: { fontSize: 11, color: '#b45309', marginTop: 2, marginBottom: 10 },
  maintenanceRow: { backgroundColor: '#fff', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  waOfferBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  waOfferText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  matchedCustomerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0f2fe', padding: 10, borderRadius: 10, marginVertical: 6 },

  cameraBox: { flex: 1, height: 75, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cameraBoxText: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 4, textAlign: 'center' },
  previewImage: { width: '100%', height: '100%' },

  profileBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  profileAvatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  profilePhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
  profileBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  profileBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  cardSettingsList: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 14 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  settingVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  logoutFullBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  logoutFullText: { color: '#ef4444', fontSize: 14, fontWeight: '800' },

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

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalHeading: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  techPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  techPillActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  techPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  techPillTextActive: { color: '#fff' },
  totalBox: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }
});
