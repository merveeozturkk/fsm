import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-16 px-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 mb-2">ServisJet Gizlilik Politikası</h1>
        <p className="text-sm text-slate-500 mb-8">Son Güncelleme: 19 Kasım 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Genel Bilgilendirme</h2>
            <p>
              ServisJet (&quot;Uygulama&quot;), teknik servis işletmelerinin (kombi, klima, beyaz eşya vb.) saha operasyonlarını, 
              iş emirlerini ve müşteri servis fişlerini dijital ortamda yönetmesini sağlayan bir iş yönetim yazılımıdır. 
              Kullanıcılarımızın ve müşterilerinin kişisel verilerinin gizliliği ve güvenliği 6698 sayılı KVKK ve ilgili mevzuat uyarınca en üst düzeyde korunmaktadır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Toplanan Veriler ve Kullanım Amaçları</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hesap ve Firma Bilgileri:</strong> İsim, telefon numarası, firma unvanı ve araç plakası (teknisyen eşleştirme ve hesap güvenliği için).</li>
              <li><strong>Servis ve Müşteri Kayıtları:</strong> Müşteri adı, telefon numarası, adres, cihaz türü ve yapılan arıza işlemi (servis fişi ve garanti takibi için).</li>
              <li><strong>Fotoğraf ve Kamera Erişimi:</strong> Değiştirilen arızalı ve yeni yedek parçaların servis fişine kanıt olarak eklenmesi için (yalnızca kullanıcı onayıyla açılır).</li>
              <li><strong>Konum Bilgisi:</strong> Servis adresine navigasyon başlatabilmek ve yol tarifi alabilmek için (arka planda izinsiz takip yapılmaz).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Verilerin Paylaşımı ve Güvenliği</h2>
            <p>
              Toplanan veriler hiçbir üçüncü şahsa veya reklam şirketine satılmaz veya pazarlama amacıyla paylaşılmaz. 
              Veriler, modern şifreleme protokolleri (SSL/TLS ve 256-bit şifreleme) ile güvenli bulut sunucularında saklanmaktadır.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Veri ve Hesap Silme Hakkı (Apple Guideline 5.1.1 Uyumlu)</h2>
            <p>
              Kullanıcılar, ServisJet mobil uygulamasının <strong>Profil &gt; Hesabımı ve Verilerimi Sil</strong> bölümünden 
              istedikleri an hesaplarını, müşteri kayıtlarını ve geçmiş fişlerini kalıcı olarak sistemden silebilirler. 
              Ayrıca <strong>destek@servisjet.com</strong> adresine e-posta göndererek de veri silme talebinde bulunabilirler.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. İletişim</h2>
            <p>
              Gizlilik politikamız ile ilgili her türlü soru, görüş ve talepleriniz için bizimle 
              <strong> destek@servisjet.com</strong> adresi üzerinden iletişime geçebilirsiniz.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
