import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-16 px-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 mb-2">ServisJet Kullanım Koşulları</h1>
        <p className="text-sm text-slate-500 mb-8">Son Güncelleme: 19 Kasım 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Koşulların Kabulü</h2>
            <p>
              ServisJet mobil uygulamasını veya web portalını kullanarak, bu belgede belirtilen tüm koşulları kabul etmiş sayılırsınız. 
              Uygulama, teknik servis hizmeti veren işletmelerin operasyonlarını kolaylaştırmak üzere tasarlanmıştır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Hesap Güvenliği</h2>
            <p>
              Kullanıcılar, hesap oluştururken verdikleri bilgilerin doğruluğundan ve şifrelerinin güvenliğinden sorumludur. 
              Firma adına atanan ekip davet kodlarının yetkisiz kişilerle paylaşılmaması kullanıcının sorumluluğundadır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Servis Fişleri ve Garanti Sorumluluğu</h2>
            <p>
              ServisJet, oluşturulan dijital servis fişleri ve garanti belgeleri için teknolojik altyapı sağlar. 
              Müşteriye verilen hizmetin fiziki kalitesi, parça temini ve garanti taahhütlerinin yerine getirilmesi 
              tamamen hizmeti veren işletmenin ve teknisyenin sorumluluğundadır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Fikri Mülkiyet</h2>
            <p>
              ServisJet yazılımı, tasarımı, logosu ve kaynak kodları üzerindeki tüm fikri mülkiyet hakları saklıdır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. İletişim ve Destek</h2>
            <p>
              Kullanım koşulları veya destek talepleriniz için: <strong>destek@servisjet.com</strong>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
