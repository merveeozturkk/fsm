"use client";

import React, { useState } from "react";
import { 
  mockCompany, 
  mockTechnicians, 
  initialJobs 
} from "@/lib/mockData";
import { Job, JobStatus, DeviceType, PaymentMethod, Technician } from "@/types";
import { 
  Wrench, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Plus, 
  DollarSign, 
  Users, 
  Smartphone, 
  Monitor, 
  Navigation, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
  Check,
  Building2,
  Calendar
} from "lucide-react";

export default function ServisJetApp() {
  const [activeView, setActiveView] = useState<"patron" | "usta">("patron");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [technicians, setTechnicians] = useState<Technician[]>(mockTechnicians);
  const [selectedTechId, setSelectedTechId] = useState<string>("tech-1"); // Usta modu için seçili usta
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState<boolean>(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);

  // Yeni İş Formu State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerDistrict, setNewCustomerDistrict] = useState("Kadıköy");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>("kombi");
  const [newBrandModel, setNewBrandModel] = useState("");
  const [newFault, setNewFault] = useState("");
  const [newPriority, setNewPriority] = useState<"normal" | "urgent">("normal");
  const [newTechnicianId, setNewTechnicianId] = useState<string>("tech-1");

  // Usta İş Tamamlama State
  const [completionNotes, setCompletionNotes] = useState("");
  const [laborCostInput, setLaborCostInput] = useState("1200");
  const [partsCostInput, setPartsCostInput] = useState("0");
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod>("nakit");

  // Metrikler
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(j => j.status === "completed").length;
  const inProgressJobsCount = jobs.filter(j => j.status === "in_progress" || j.status === "in_transit").length;
  const pendingJobsCount = jobs.filter(j => j.status === "pending").length;
  
  const totalCollectedToday = jobs
    .filter(j => j.paymentStatus === "paid")
    .reduce((sum, j) => sum + j.totalAmount, 0);

  const totalCash = jobs
    .filter(j => j.paymentStatus === "paid" && j.paymentMethod === "nakit")
    .reduce((sum, j) => sum + j.totalAmount, 0);

  const totalHavale = jobs
    .filter(j => j.paymentStatus === "paid" && j.paymentMethod === "havale")
    .reduce((sum, j) => sum + j.totalAmount, 0);

  // Usta durumu güncelleme (Usta Modu)
  const handleUpdateJobStatus = (jobId: string, newStatus: JobStatus) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          status: newStatus,
          startedAt: newStatus === "in_progress" && !job.startedAt ? "Az önce" : job.startedAt,
          completedAt: newStatus === "completed" ? "Az önce" : job.completedAt
        };
      }
      return job;
    }));
  };

  // Ustanın işi bitirip tahsilatı girmesi
  const handleCompleteJobWithPayment = (jobId: string) => {
    const labor = parseFloat(laborCostInput) || 0;
    const parts = parseFloat(partsCostInput) || 0;
    const total = labor + parts;

    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          status: "completed",
          completedAt: "Az önce",
          laborCost: labor,
          partsCost: parts,
          totalAmount: total,
          paymentMethod: paymentMethodInput,
          paymentStatus: "paid",
          technicianNotes: completionNotes || job.technicianNotes
        };
      }
      return job;
    }));

    // Ustanın tamamlanan sayısını artır
    setTechnicians(prev => prev.map(t => {
      if (t.id === selectedTechId) {
        return { ...t, todayCompletedCount: t.todayCompletedCount + 1, status: "active" };
      }
      return t;
    }));

    setSelectedJobForDetail(null);
    setCompletionNotes("");
  };

  // Yeni İş Oluşturma
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone || !newFault) return;

    const assignedTech = technicians.find(t => t.id === newTechnicianId);

    const newJob: Job = {
      id: `job-${Date.now()}`,
      companyId: mockCompany.id,
      jobCode: `SJ-${2040 + jobs.length + 1}`,
      customerId: `cust-${Date.now()}`,
      customer: {
        id: `cust-${Date.now()}`,
        companyId: mockCompany.id,
        name: newCustomerName,
        phone: newCustomerPhone,
        district: newCustomerDistrict,
        address: newCustomerAddress || `${newCustomerDistrict} Merkez`
      },
      technicianId: newTechnicianId,
      technician: assignedTech,
      deviceType: newDeviceType,
      brandModel: newBrandModel || "Standart Model",
      faultDescription: newFault,
      status: newTechnicianId ? "assigned" : "pending",
      priority: newPriority,
      createdAt: "Az önce",
      scheduledTime: "Günün içinde",
      laborCost: 1000,
      partsCost: 0,
      totalAmount: 1000,
      paymentStatus: "pending",
      parts: [],
      photos: []
    };

    setJobs([newJob, ...jobs]);
    setIsNewJobModalOpen(false);

    // Formu temizle
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setNewBrandModel("");
    setNewFault("");
  };

  // Usta için filtreli işler
  const currentTech = technicians.find(t => t.id === selectedTechId) || technicians[0];
  const techJobs = jobs.filter(j => j.technicianId === selectedTechId);
  const activeTechJob = techJobs.find(j => j.status === "in_progress" || j.status === "in_transit" || j.status === "assigned");

  // Patron için filtreli işler
  const filteredJobs = jobs.filter(job => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSearch = 
      job.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer.phone.includes(searchQuery) ||
      job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.faultDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> Beklemede</span>;
      case "assigned":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Users className="w-3.5 h-3.5" /> Usta Atandı</span>;
      case "in_transit":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800"><Truck className="w-3.5 h-3.5" /> Usta Yolda</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Wrench className="w-3.5 h-3.5" /> Adreste / Bakımda</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><AlertCircle className="w-3.5 h-3.5" /> İptal</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* ÜST BİLGİ & MOD DEĞİŞTİRİCİ ÇUBUK */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg tracking-wider text-white shadow-md">
              SJ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">ServisJet</h1>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                  SAHA PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                {mockCompany.name}
              </p>
            </div>
          </div>

          {/* ÇİFT MOD SEÇİCİ (PATRON & USTA MODU) */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveView("patron")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "patron"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Ofis / Patron Paneli</span>
              <span className="sm:hidden">Patron</span>
            </button>
            <button
              onClick={() => setActiveView("usta")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "usta"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Usta Mobil Modu</span>
              <span className="sm:hidden">Usta</span>
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK: PATRON PANELİ VEYA USTA SAHA MODU */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === "patron" ? (
          /* ======================================================== */
          /* 1. PATRON / OFİS YÖNETİM PANELİ                          */
          /* ======================================================== */
          <div className="space-y-6">
            {/* GÜNLÜK METRİK KARTLARI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Bugün Toplam İş</p>
                  <p className="text-2xl font-bold text-slate-900">{totalJobsCount}</p>
                  <p className="text-[11px] text-slate-400">{pendingJobsCount} bekleyen, {inProgressJobsCount} sahada</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Tamamlanan</p>
                  <p className="text-2xl font-bold text-slate-900">{completedJobsCount}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Hedef: %100 kapanış</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Bugünkü Kasa</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCollectedToday.toLocaleString("tr-TR")} ₺</p>
                  <p className="text-[11px] text-slate-400">Nakit: {totalCash.toLocaleString("tr-TR")} ₺ | Havale: {totalHavale.toLocaleString("tr-TR")} ₺</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Sahadaki Ustalar</p>
                  <p className="text-2xl font-bold text-slate-900">{technicians.length} Usta</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Tüm ekipler aktif görevde</p>
                </div>
              </div>
            </div>

            {/* SAHA CANLI DURUMU (USTALAR NEREDE VE NE YAPIYOR?) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Canlı Saha Ekibi Takibi
                  </h2>
                  <p className="text-xs text-slate-500">Teknisyenlerin anlık konumu, aracındaki plaka ve baktığı son iş</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  GPS & Sistem Aktif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {technicians.map(tech => {
                  const currentJob = jobs.find(j => j.technicianId === tech.id && (j.status === "in_progress" || j.status === "in_transit"));
                  return (
                    <div key={tech.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{tech.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            {tech.vehiclePlate || "Şahsi Araç"} • {tech.phone}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          tech.status === "busy" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {tech.status === "busy" ? "İşlemde" : "Müsait"}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                        <p className="text-slate-500">Mevcut Konum:</p>
                        <p className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {tech.currentAddress}
                        </p>
                        {currentJob ? (
                          <div className="mt-2 bg-white p-2 rounded-lg border border-slate-200 text-slate-700">
                            <span className="font-semibold text-blue-600">{currentJob.jobCode}</span>: {currentJob.customer.name} ({currentJob.deviceType.toUpperCase()})
                          </div>
                        ) : (
                          <p className="mt-2 text-slate-400 italic">Şu an atanmış aktif iş yok.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* İŞ EMİRLERİ LİSTESİ & FİLTRELER */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">İş Emirleri & Servis Çağrıları</h2>
                  <p className="text-xs text-slate-500">Müşteri arıza kayıtları, atanan ustalar ve ödeme durumları</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Müşteri, telefon veya arıza ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    onClick={() => setIsNewJobModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni İş Emri Aç
                  </button>
                </div>
              </div>

              {/* DURUM FİLTRE BUTONLARI */}
              <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
                {[
                  { id: "all", label: "Tüm İşler" },
                  { id: "pending", label: "Bekleyenler" },
                  { id: "assigned", label: "Atananlar" },
                  { id: "in_transit", label: "Yoldakiler" },
                  { id: "in_progress", label: "Adreste / İşlemde" },
                  { id: "completed", label: "Tamamlananlar" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      statusFilter === tab.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TABLO */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">İş Kodu & Cihaz</th>
                      <th className="py-3 px-4">Müşteri & İletişim</th>
                      <th className="py-3 px-4">Adres / Bölge</th>
                      <th className="py-3 px-4">Arıza Detayı</th>
                      <th className="py-3 px-4">Atanan Usta</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4">Tutar & Kasa</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Arama kriterlerine uygun iş emri bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{job.jobCode}</span>
                            <div className="text-[11px] font-medium text-slate-500 uppercase">{job.deviceType} • {job.brandModel}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{job.customer.name}</div>
                            <div className="text-slate-500">{job.customer.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">{job.customer.district}</span>
                            <div className="text-slate-400 truncate max-w-[150px]">{job.customer.address}</div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-slate-700 max-w-[200px] truncate" title={job.faultDescription}>
                              {job.faultDescription}
                            </p>
                            {job.priority === "urgent" && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                ACİL ÇAĞRI
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {job.technician ? (
                              <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {job.technician.name}
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium">Henüz Atanmadı</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(job.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{job.totalAmount.toLocaleString("tr-TR")} ₺</div>
                            <div className="text-[10px]">
                              {job.paymentStatus === "paid" ? (
                                <span className="text-emerald-600 font-semibold uppercase">Tahsil Edildi ({job.paymentMethod})</span>
                              ) : (
                                <span className="text-slate-400">Bekliyor</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedJobForDetail(job)}
                              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              Detay / Yönet
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 2. USTA SAHA MOBİL MODU (ELDİVENLE BİLE KULLANILIR)       */
          /* ======================================================== */
          <div className="max-w-md mx-auto space-y-4">
            {/* USTA SEÇİCİ (TEST AMAÇLI FARKLI USTALARLA GÖRME) */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-400">Giriş Yapan Teknisyen:</p>
                <p className="font-bold text-slate-900 text-sm">{currentTech.name}</p>
                <p className="text-[11px] text-slate-500">{currentTech.vehiclePlate} • Bugün {currentTech.todayCompletedCount} İş Kapattı</p>
              </div>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* AKTİF GÖREV BÖLÜMÜ (DEV BUTONLAR) */}
            {activeTechJob ? (
              <div className="bg-white rounded-3xl border-2 border-blue-500 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {activeTechJob.status === "in_transit" ? "Yoldasınız" : activeTechJob.status === "in_progress" ? "Adrestesiniz" : "Yeni Atanan İş"}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{activeTechJob.jobCode}</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">{activeTechJob.customer.name}</h3>
                  <p className="text-sm font-semibold text-blue-600 mt-0.5">{activeTechJob.deviceType.toUpperCase()} - {activeTechJob.brandModel}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-700">{activeTechJob.customer.address} ({activeTechJob.customer.district})</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 font-normal">{activeTechJob.faultDescription}</span>
                  </div>
                </div>

                {/* HIZLI İLETİŞİM BUTONLARI */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${activeTechJob.customer.phone}`}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow transition-all"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    Müşteriyi Ara
                  </a>
                  <a
                    href={`https://wa.me/90${activeTechJob.customer.phone.replace(/[^0-9]/g, "").slice(-10)}?text=Merhaba%20${encodeURIComponent(activeTechJob.customer.name)},%20ServisJet%20teknisyeniniz%20yola%20çıktı,%20yaklaşık%2015%20dakika%20içinde%20adresinizde%20olacağım.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>

                {/* TEK TIKLA HARİTA NAVİGASYONU */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTechJob.customer.address + " " + activeTechJob.customer.district + " Istanbul")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-2xl font-bold text-sm transition-all"
                >
                  <Navigation className="w-5 h-5 text-blue-600" />
                  Google Haritalar'da Başlat
                </a>

                {/* USTA ADIM BUTONLARI (ERGONOMİK, BÜYÜK) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {activeTechJob.status === "assigned" && (
                    <button
                      onClick={() => handleUpdateJobStatus(activeTechJob.id, "in_transit")}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Truck className="w-5 h-5" />
                      Yola Çıktım (Müşteriye Bildir)
                    </button>
                  )}

                  {activeTechJob.status === "in_transit" && (
                    <button
                      onClick={() => handleUpdateJobStatus(activeTechJob.id, "in_progress")}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <MapPin className="w-5 h-5" />
                      Adrese Vardım (İşleme Başla)
                    </button>
                  )}

                  {activeTechJob.status === "in_progress" && (
                    <button
                      onClick={() => {
                        setSelectedJobForDetail(activeTechJob);
                      }}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      İşi Tamamla & Tahsilat Al
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Şu An Bekleyen İşin Yok</h3>
                <p className="text-xs text-slate-500">Ofis yeni bir iş atadığında telefonuna anında bildirim düşecektir.</p>
              </div>
            )}

            {/* BUGÜN TAMAMLANANLAR LİSTESİ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Bugün Tamamladığın Servisler ({techJobs.filter(j => j.status === "completed").length})
              </h4>
              <div className="space-y-2">
                {techJobs.filter(j => j.status === "completed").map(completedJob => (
                  <div key={completedJob.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{completedJob.customer.name}</p>
                      <p className="text-slate-500">{completedJob.deviceType.toUpperCase()} • {completedJob.completedAt}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600">{completedJob.totalAmount} ₺</p>
                      <span className="text-[10px] text-slate-400 uppercase">{completedJob.paymentMethod}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* YENİ İŞ EMRİ AÇMA MODALI */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Yeni Servis Çağrısı Aç</h3>
                <p className="text-xs text-slate-500">Müşteri arızasını girin ve anında sahaya iletin</p>
              </div>
              <button
                onClick={() => setIsNewJobModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Müşteri Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Serdar Vural"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefon Numarası *</label>
                  <input
                    type="tel"
                    required
                    placeholder="05XX XXX XX XX"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">İlçe</label>
                  <select
                    value={newCustomerDistrict}
                    onChange={(e) => setNewCustomerDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Kadıköy">Kadıköy</option>
                    <option value="Üsküdar">Üsküdar</option>
                    <option value="Ataşehir">Ataşehir</option>
                    <option value="Beşiktaş">Beşiktaş</option>
                    <option value="Şişli">Şişli</option>
                    <option value="Maltepe">Maltepe</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cihaz Türü</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value as DeviceType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="kombi">Kombi</option>
                    <option value="klima">Klima</option>
                    <option value="beyaz_esya">Beyaz Eşya</option>
                    <option value="asansor">Asansör</option>
                    <option value="su_aritma">Su Arıtma</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Açık Adres</label>
                <input
                  type="text"
                  placeholder="Mahalle, Cadde, Sokak, Kapı No"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marka & Model</label>
                  <input
                    type="text"
                    placeholder="Örn: Vaillant / Bosch"
                    value={newBrandModel}
                    onChange={(e) => setNewBrandModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Öncelik Durumu</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "normal" | "urgent")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="normal">Normal Servis</option>
                    <option value="urgent">ACİL ÇAĞRI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Arıza & Şikayet Tanımı *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Kombiden ses geliyor, basınç düşüyor..."
                  value={newFault}
                  onChange={(e) => setNewFault(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">İşi Üstlenecek Usta</label>
                <select
                  value={newTechnicianId}
                  onChange={(e) => setNewTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status === "busy" ? "İşlemde" : "Müsait"})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  İş Emrini Sahaya İlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İŞ DETAYI & TAHSİLAT KAPATMA MODALI */}
      {selectedJobForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{selectedJobForDetail.jobCode}</span>
                <h3 className="font-bold text-slate-900 text-lg">{selectedJobForDetail.customer.name}</h3>
              </div>
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p><span className="font-semibold text-slate-600">Cihaz:</span> {selectedJobForDetail.deviceType.toUpperCase()} ({selectedJobForDetail.brandModel})</p>
                <p><span className="font-semibold text-slate-600">Arıza:</span> {selectedJobForDetail.faultDescription}</p>
                <p><span className="font-semibold text-slate-600">Adres:</span> {selectedJobForDetail.customer.address} / {selectedJobForDetail.customer.district}</p>
                <p><span className="font-semibold text-slate-600">Telefon:</span> {selectedJobForDetail.customer.phone}</p>
              </div>

              {selectedJobForDetail.status !== "completed" ? (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-sm">İş Kapatma & Tahsilat Bilgileri</h4>
                  
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Yapılan İşlem & Teknisyen Notu</label>
                    <textarea
                      rows={2}
                      placeholder="Kart tamiri yapıldı, fan motoru yağlandı..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">İşçilik Tutarı (₺)</label>
                      <input
                        type="number"
                        value={laborCostInput}
                        onChange={(e) => setLaborCostInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Parça Tutarı (₺)</label>
                      <input
                        type="number"
                        value={partsCostInput}
                        onChange={(e) => setPartsCostInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tahsilat Yöntemi</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "nakit", label: "Nakit" },
                        { id: "havale", label: "IBAN / Havale" },
                        { id: "pos", label: "Kredi Kartı / POS" },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethodInput(m.id as PaymentMethod)}
                          className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                            paymentMethodInput === m.id
                              ? "bg-emerald-600 text-white border-emerald-600 shadow"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Toplam Tahsil Edilecek:</span>
                    <span className="text-lg font-black text-emerald-700">
                      {((parseFloat(laborCostInput) || 0) + (parseFloat(partsCostInput) || 0)).toLocaleString("tr-TR")} ₺
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteJobWithPayment(selectedJobForDetail.id)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Tahsilatı Onayla & İşi Kapat
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Bu İş Başarıyla Kapatıldı ve Kasaya Eklendi
                  </div>
                  <p><strong>Toplam Tahsilat:</strong> {selectedJobForDetail.totalAmount} ₺ ({selectedJobForDetail.paymentMethod})</p>
                  <p><strong>Usta Notu:</strong> {selectedJobForDetail.technicianNotes || "Not girilmedi"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
