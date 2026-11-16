import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CatalogItem {
  id: string;
  name: string;
  category: 'Kombi' | 'Klima' | 'Beyaz Eşya' | 'Genel';
  price: number;
  costPrice?: number;
}

export const DEFAULT_CATALOG: CatalogItem[] = [
  { id: 'cat-1', name: 'Kombi Yıllık Periyodik Bakım', category: 'Kombi', price: 1200, costPrice: 200 },
  { id: 'cat-2', name: 'Fan Motoru Değişimi', category: 'Kombi', price: 2800, costPrice: 1100 },
  { id: 'cat-3', name: 'Gaz Valfi Değişimi', category: 'Kombi', price: 2400, costPrice: 950 },
  { id: 'cat-4', name: 'Sirkülasyon Pompası Değişimi', category: 'Kombi', price: 3600, costPrice: 1600 },
  { id: 'cat-5', name: 'NTC Sıcaklık Sensörü Değişimi', category: 'Kombi', price: 650, costPrice: 150 },
  { id: 'cat-6', name: 'Genleşme Tankı Havası / Değişim', category: 'Kombi', price: 1500, costPrice: 500 },
  { id: 'cat-7', name: 'Elektronik Anakart Tamiri', category: 'Kombi', price: 2900, costPrice: 800 },
  { id: 'cat-8', name: 'Klima Gaz Dolumu (R410A / R32)', category: 'Klima', price: 1900, costPrice: 550 },
  { id: 'cat-9', name: 'Klima İç Ünite İlaçlı Bakım', category: 'Klima', price: 1100, costPrice: 150 },
  { id: 'cat-10', name: 'Kapasitör Değişimi', category: 'Klima', price: 950, costPrice: 200 },
  { id: 'cat-11', name: 'Çamaşır Makinesi Pompa Motoru', category: 'Beyaz Eşya', price: 1600, costPrice: 450 },
  { id: 'cat-12', name: 'Buzdolabı Motor (Kompresör) Değişimi', category: 'Beyaz Eşya', price: 4200, costPrice: 2100 },
  { id: 'cat-13', name: 'Genel Arıza Tespit & Servis Ücreti', category: 'Genel', price: 500, costPrice: 50 },
];

const CATALOG_KEY_PREFIX = '@servisjet_catalog_';

export async function loadCatalog(companyCode: string): Promise<CatalogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CATALOG_KEY_PREFIX}${companyCode}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error loading catalog:', e);
  }
  return DEFAULT_CATALOG;
}

export async function saveCatalog(companyCode: string, items: CatalogItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CATALOG_KEY_PREFIX}${companyCode}`, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving catalog:', e);
  }
}
