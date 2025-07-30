# Döviz Çevirici Uygulaması

Modern ve kullanıcı dostu bir React Native döviz çevirici uygulaması.

## 🚀 Özellikler

- **Gerçek Zamanlı Döviz Kurları**: ExchangeRate-API entegrasyonu
- **Test Modu**: Geliştirme için offline test modu
- **Environment Variables**: Güvenli API anahtarı yönetimi
- **Ortam Ayrımı**: Development/Production ortam desteği
- **Modern UI**: React Native Paper ile tasarlanmış arayüz
- **Animasyonlar**: React Native Reanimated ile akıcı animasyonlar
- **Hesap Makinesi**: Entegre hesap makinesi
- **Geçmiş**: Dönüşüm geçmişi ve grafikleri
- **Favoriler**: Sık kullanılan para birimleri
- **Tema Desteği**: Açık/Koyu tema

## 🛠️ Kurulum

### Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn
- Expo CLI
- React Native geliştirme ortamı

### Adımlar

1. **Projeyi klonlayın:**
   ```bash
   git clone <repository-url>
   cd doviz-app
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   # veya
   yarn install
   ```

3. **Environment dosyasını oluşturun:**
   ```bash
   cp .env.example .env
   ```

4. **API anahtarınızı ekleyin:**
   `.env` dosyasını düzenleyin ve `EXPO_PUBLIC_API_KEY` değerini güncelleyin:
   ```env
   EXPO_PUBLIC_API_KEY=your_api_key_here
   ```

5. **Uygulamayı başlatın:**
   ```bash
   npm start
   # veya
   yarn start
   ```

## 🔧 Environment Variables

Uygulama aşağıdaki environment variables'ları kullanır:

### Gerekli Değişkenler

- `EXPO_PUBLIC_API_KEY`: ExchangeRate-API anahtarı
- `EXPO_PUBLIC_BASE_URL`: API base URL'i

### Opsiyonel Değişkenler

- `EXPO_PUBLIC_TEST_MODE`: Test modu (true/false)
- `EXPO_PUBLIC_APP_NAME`: Uygulama adı
- `EXPO_PUBLIC_APP_VERSION`: Uygulama versiyonu
- `EXPO_PUBLIC_DEBUG_MODE`: Debug modu (true/false)

### Environment Dosyaları

- `.env`: Geliştirme ortamı (git'e dahil değil)
- `.env.example`: Örnek dosya (git'e dahil)

## 🚀 Çalıştırma Komutları

### Geliştirme Ortamı
```bash
npm run start:dev        # Development modu
npm run android:dev      # Android development
npm run ios:dev          # iOS development
npm run web:dev          # Web development
```

### Production Ortamı
```bash
npm run start:prod       # Production modu
npm run android:prod     # Android production
npm run ios:prod         # iOS production
npm run web:prod         # Web production
```

## 🔒 Güvenlik

### API Anahtarı Güvenliği

1. **Asla API anahtarınızı kodda sabit olarak yazmayın**
2. **Environment variables kullanın**
3. **`.env` dosyasını git'e eklemeyin**
4. **Production'da farklı API anahtarı kullanın**

### Environment Dosyası Güvenliği

```bash
# .env dosyasını git'e eklemeyin
echo ".env" >> .gitignore
```

## 🧪 Test Modu

Uygulama test modu ile çalışabilir:

```env
EXPO_PUBLIC_TEST_MODE=true
```

Test modunda:
- Gerçek API çağrıları yapılmaz
- Sabit test kurları kullanılır
- Offline çalışabilir
- Geliştirme için idealdir

## 📱 Platform Desteği

- ✅ Android
- ✅ iOS
- ✅ Web (Expo Web)

## 🛠️ Teknolojiler

- **React Native**: Mobil uygulama framework'ü
- **Expo**: Geliştirme ve dağıtım platformu
- **TypeScript**: Tip güvenliği
- **React Native Paper**: UI bileşenleri
- **React Native Reanimated**: Animasyonlar
- **Axios**: HTTP istekleri
- **AsyncStorage**: Yerel veri depolama
- **Moment.js**: Tarih işlemleri

## 📊 API Entegrasyonu

Uygulama [ExchangeRate-API](https://exchangerate-api.com/) kullanır:

- Gerçek zamanlı döviz kurları
- 160+ para birimi desteği
- Güvenilir ve hızlı
- Ücretsiz plan mevcut

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
