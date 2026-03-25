function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

const translations = {}; 
let allGalleriesData = null; 
const pageCache = {}; 

// === YENİ EKLEMELER: Galeri sayfalandırma için ===
let globalPropertyImages = [];
let globalImageIndex = 0;
const IMAGES_PER_LOAD = 8; // Her seferinde 8 resim yükle
// === YENİ EKLEMELER SONU ===

// === YENİ EKLEMELER: Restorasyon galerisi için ===
const RESTORATION_IMAGES_PER_LOAD = 4; // Restorasyonda 4'er 4'er yükle
const restorationBeforePaths = [
  "assets/restorasyon-1-befor.webp",
  "assets/restorasyon-2-before.webp",
  "assets/restorasyon-3-before.webp",
  "assets/restorasyon-4-before.webp",
  "assets/restorasyon-5-before.webp",
  "assets/restorasyon-6-before.webp",
  "assets/restorasyon-7-before.webp",
  "assets/restorasyon-8-before.webp",
  "assets/restorasyon-9-before.webp",
  "assets/restorasyon-10-before.webp",
  "assets/restorasyon-11-before.webp",
  "assets/restorasyon-12-before.webp",
  "assets/restorasyon-13-before.webp"
];
const restorationAfterPaths = [
  "assets/restorasyon-1-after.webp",
  "assets/restorasyon-2-after.webp",
  "assets/restorasyon-3-after.webp",
  "assets/restorasyon-4-after.webp",
  "assets/restorasyon-5-after.webp",
  "assets/restorasyon-6-after.webp",
  "assets/restorasyon-7-after.webp",
  "assets/restorasyon-8-after.webp",
  "assets/restorasyon-9-after.webp",
  "assets/restorasyon-10-after.webp",
  "assets/restorasyon-11-after.webp",
  "assets/restorasyon-12-after.webp",
  "assets/restorasyon-13-after.webp"
];
let globalRestorationBeforeIndex = 0;
let globalRestorationAfterIndex = 0;
// === YENİ EKLEMELER SONU ===

async function openHouseDetail(letter) {
  
  if (!allGalleriesData) {
    try {
      const response = await fetch('data/galleries.json?v=1.1'); 
      if (!response.ok) {
        throw new Error('Galeri verisi data/galleries.json yüklenemedi');
      }
      allGalleriesData = await response.json(); 
    } catch (error) {
      console.error(error);
      return; 
    }
  }

  const detail = document.getElementById("house-detail");
  const content = document.getElementById("house-detail-content");
  
  // Orijinal veriyi (fallback için) al
  const h = allGalleriesData[letter]; 
  if (!h) {
      console.error(`'${letter}' için ev detayı bulunamadı.`);
      return;
  }
  
  // Geçerli dili ve dil verisini al
  const currentLang = localStorage.getItem('lang') || 'tr';
  const langData = translations[currentLang] || {}; 

  // Dil dosyalarından aranacak anahtarları oluştur
  const titleKey = `prop_${letter}_title`;
  const locationKey = `prop_${letter}_location`;
  const areaKey = `prop_${letter}_area`;
  const roomsKey = `prop_${letter}_rooms`;
  const descKey = `prop_${letter}_desc`;
  const priceKey = `prop_${letter}_price`;

  // Fiyatı dil dosyasından al (bulamazsa galleries.json'dan al)
  const priceText = langData[priceKey] || h.price;
  let priceHTML = '';

  if (letter.startsWith('OTEL')) {
      // Otel fiyatı özel link içeriyor
      priceHTML = `<p><strong>${langData.js_fiyat || 'Fiyat'}:</strong> <a href="https://bwizmirhotel.com/" target="_blank" rel="noopener noreferrer" style="color: var(--gold-light); text-decoration: underline;">${priceText}</a></p>`;
  } else {
      // Normal mülk fiyatı
      priceHTML = `<p><strong>${langData.js_fiyat || 'Fiyat'}:</strong> ${priceText}</p>`;
  }
  
// === DEĞİŞİKLİK BAŞLANGICI: Global değişkenleri ayarla ===
  globalPropertyImages = h.images || [];
  globalImageIndex = 0;
  // === DEĞİŞİKLİK SONU ===

  // === DEĞİŞİKLİK BAŞLANGICI: HTML içeriğini güncelle ===
  // Galeri kısmı (detail-gallery) artık boş geliyor ve JS ile doldurulacak.
  content.innerHTML = `
    <h2>${langData[titleKey] || h.title}</h2>
    
    <div class="house-info">
      <p><strong>${langData.js_konum || 'Konum'}:</strong> ${langData[locationKey] || h.location}</p>
      <p><strong>${langData.js_alan || 'Alan'}:</strong> ${langData[areaKey] || h.area}</p>
      <p><strong>${langData.js_oda_sayisi || 'Oda Sayısı'}:</strong> ${langData[roomsKey] || h.rooms}</p>
      ${priceHTML}
      <p>${langData[descKey] || h.desc}</p>
    </div>

    <div class="detail-gallery" id="detail-gallery-container">
      </div>
    
    <div id="gallery-loader-container" style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
      </div>
  `;
  
  // İlk resim grubunu yükle
  loadMorePropertyImages();
  // === DEĞİŞİKLİK SONU ===
  
  detail.style.display = "block";
  document.body.style.overflow = "hidden"; 
}

function closeHouseDetail() {
  const detail = document.getElementById("house-detail");
  if (detail) {
    detail.style.display = "none";
  }
  document.body.style.overflow = "auto"; 
}

// === YENİ FONKSİYON 1: Mülk Galerisi (Satılık/Otel) ===
function loadMorePropertyImages() {
  const galleryContainer = document.getElementById('detail-gallery-container');
  const loaderContainer = document.getElementById('gallery-loader-container');

  if (!galleryContainer || !loaderContainer) {
    console.error("Galeri konteynerleri bulunamadı.");
    return;
  }

  // Yüklenecek resim dilimini al
  const imagesToLoad = globalPropertyImages.slice(globalImageIndex, globalImageIndex + IMAGES_PER_LOAD);

  if (imagesToLoad.length === 0 && globalImageIndex === 0) {
     galleryContainer.innerHTML = "<p>Bu galeri için resim bulunamadı.</p>";
     loaderContainer.innerHTML = "";
     return;
  }

  // Resimler için HTML oluştur
  const imagesHTML = imagesToLoad.map(img => 
    `<img loading="lazy" src="${img}" alt="Galeri Resmi" onerror="this.remove()">`
  ).join("");

  // Resimleri galeriye ekle
  galleryContainer.insertAdjacentHTML('beforeend', imagesHTML);

  // İndeksi güncelle
  globalImageIndex += IMAGES_PER_LOAD;

  // Butonu temizle
  loaderContainer.innerHTML = '';

  // Hâlâ yüklenecek resim varsa, butonu tekrar ekle
  if (globalImageIndex < globalPropertyImages.length) {
    // Çeviri verisini al
    const currentLang = localStorage.getItem('lang') || 'tr';
    const langData = translations[currentLang] || {};
    const buttonText = langData.btn_load_more || 'Daha Fazla Göster';
    
    loaderContainer.innerHTML = `<button class="btn" id="load-more-btn" onclick="loadMorePropertyImages()">${buttonText}</button>`;
  }
}
// === FONKSİYON 1 SONU ===


// === YENİ FONKSİYON 2: Restorasyon Galerisi Kurulumu ===
function setupRestorationGalleries() {
  // İndeksleri sıfırla
  globalRestorationBeforeIndex = 0;
  globalRestorationAfterIndex = 0;
  
  // Galerileri temizle (sayfa önbellekten yüklenmişse dolu olabilir)
  const beforeGallery = document.getElementById('restoration-gallery-before');
  const afterGallery = document.getElementById('restoration-gallery-after');
  const beforeLoader = document.getElementById('restoration-loader-before');
  const afterLoader = document.getElementById('restoration-loader-after');

  if (beforeGallery) beforeGallery.innerHTML = '';
  if (afterGallery) afterGallery.innerHTML = '';
  if (beforeLoader) beforeLoader.innerHTML = '';
  if (afterLoader) afterLoader.innerHTML = '';

  // İlk resim gruarını yükle
  loadMoreRestorationImages('before');
  loadMoreRestorationImages('after');
}
// === FONKSİYON 2 SONU ===


// === YENİ FONKSİYON 3: Restorasyon Resim Yükleyici ===
function loadMoreRestorationImages(galleryType) {
  let galleryContainer, loaderContainer, imagesArray, currentIndex;
  let altText = "Restorasyon - ";
  let placeholderText = "";

  // Hangi galeri (Önce/Sonra) için işlem yapacağımızı belirle
  if (galleryType === 'before') {
    galleryContainer = document.getElementById('restoration-gallery-before');
    loaderContainer = document.getElementById('restoration-loader-before');
    imagesArray = restorationBeforePaths;
    currentIndex = globalRestorationBeforeIndex;
    altText += "Önce";
    placeholderText = "Önce";
  } else {
    galleryContainer = document.getElementById('restoration-gallery-after');
    loaderContainer = document.getElementById('restoration-loader-after');
    imagesArray = restorationAfterPaths;
    currentIndex = globalRestorationAfterIndex;
    altText += "Sonra";
    placeholderText = "Sonra";
  }

  if (!galleryContainer || !loaderContainer) {
    return;
  }

  // Yüklenecek resim dilimini al
  const imagesToLoad = imagesArray.slice(currentIndex, currentIndex + RESTORATION_IMAGES_PER_LOAD);

  if (imagesToLoad.length === 0 && currentIndex === 0) {
    galleryContainer.innerHTML = "<p>Bu galeri için resim bulunamadı.</p>";
    loaderContainer.innerHTML = "";
    return;
  }

  // Resimler için HTML oluştur
  const imagesHTML = imagesToLoad.map((img, index) => 
    `<img loading="lazy" src="${img}" alt="${altText} ${currentIndex + index + 1}" onerror="this.src='https://placehold.co/350x260/111/f59e0b?text=${placeholderText}+${currentIndex + index + 1}'">`
  ).join("");

  // Resimleri galeriye ekle
  galleryContainer.insertAdjacentHTML('beforeend', imagesHTML);

  // İndeksi güncelle
  if (galleryType === 'before') {
    globalRestorationBeforeIndex += RESTORATION_IMAGES_PER_LOAD;
  } else {
    globalRestorationAfterIndex += RESTORATION_IMAGES_PER_LOAD;
  }
  
  // Güncellenmiş indeksi tekrar al (bir sonraki kontrol için)
  currentIndex = (galleryType === 'before') ? globalRestorationBeforeIndex : globalRestorationAfterIndex;

  // Butonu temizle
  loaderContainer.innerHTML = '';

  // Hâlâ yüklenecek resim varsa, butonu tekrar ekle
  if (currentIndex < imagesArray.length) {
    // Çeviri verisini al
    const currentLang = localStorage.getItem('lang') || 'tr';
    const langData = translations[currentLang] || {};
    const buttonText = langData.btn_load_more || 'Daha Fazla Göster';
    
    // onclick fonksiyonuna hangi galeriyi yükleyeceğini ('before'/'after') parametre olarak ver
    loaderContainer.innerHTML = `<button class="btn" id="load-more-btn-${galleryType}" onclick="loadMoreRestorationImages('${galleryType}')">${buttonText}</button>`;
  }
}
// === FONKSİYON 3 SONU ===


async function setLanguage(lang) {
    let langData;

    if (translations[lang]) {
        langData = translations[lang];
    } else {
        try {
            const response = await fetch(`${lang}.json`);
            if (!response.ok) {
                throw new Error(`Dil dosyası ${lang}.json yüklenemedi`);
            }
            langData = await response.json(); 
            translations[lang] = langData; 
        } catch (error) {
            console.warn(`Dil dosyası ${lang}.json yüklenemedi veya işlenemedi:`, error);
            if (lang !== 'en') {
                return await setLanguage('en'); 
            }
            return;
        }
    }
    
    document.querySelector('title').textContent = langData['title'];
    document.documentElement.lang = lang; 
    
    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (langData[key]) {
            el.innerHTML = langData[key];
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
   
    localStorage.setItem('lang', lang);
}

// === showPage fonksiyonu MOBİL GERİ TUŞU için güncellendi ===
async function showPage(pageId) {
    
    // URL hash'i boşsa veya # ise 'hero' sayfasını varsay
    if (!pageId || pageId === '#') pageId = 'hero';

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    let newPage = document.getElementById(pageId);
    
    if (!newPage) {
        if (pageCache[pageId]) {
            document.getElementById('page-container').insertAdjacentHTML('beforeend', pageCache[pageId]);
        } else {
            try {
                let fileName = pageId;
                if (pageId === 'page-about') fileName = 'about';
                if (pageId === 'page-services') fileName = 'services';
                if (pageId === 'page-projects') fileName = 'projects';
                if (pageId === 'page-contact') fileName = 'contact';
                if (pageId === 'page-otel') fileName = 'otel';
                if (pageId === 'page-insaat') fileName = 'insaat';
                if (pageId === 'page-restorasyon') fileName = "restorasyon";
                if (pageId === 'page-satilik_kiralik') fileName = "satilik_kiralik";
                
                // === YENİ EKLEME (3. İSTEK): Yeni galeri sayfası rotası ===
                if (pageId === 'page-pruva-otel') fileName = "pruva-otel";
                // === YENİ EKLEME SONU ===

                if (fileName === pageId) { 
                   /* 'hero' zaten index.html'de */
                } else {
                      const response = await fetch(`${fileName}.html`);
                    if (!response.ok) throw new Error(`Sayfa yüklenemedi: ${fileName}.html`);
                    const html = await response.text();
                    pageCache[pageId] = html; 
                    document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
                }
            } catch (error) {
                console.error(error);
                location.hash = 'hero'; // Hata olursa anasayfaya dön
                return;
            }
        }
        newPage = document.getElementById(pageId);
    }

    if (newPage) {
        
        // URL hash'ini güncelle (sonsuz döngüye girmemek için kontrol et)
        if (location.hash.replace('#', '') !== pageId) {
            location.hash = pageId;
        }

        newPage.classList.add('active');
        window.scrollTo(0, 0); 
        
        const currentLang = localStorage.getItem('lang') || 'tr';
        if (translations[currentLang]) {
            newPage.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key];
                }
            });
        }

        // === GÜNCELLEME (3. İSTEK): Restorasyon galerisi artık 'page-pruva-otel' sayfasında yükleniyor ===
        if (pageId === 'page-pruva-otel') {
          setupRestorationGalleries();
        }
        // === GÜNCELLEME SONU ===

        newPage.classList.remove('visible');
        
        setTimeout(() => {
            const cards = newPage.querySelectorAll('.project-card, .latest-card, .service-card, .house-card, .restoration-card');
            cards.forEach(card => {
                card.classList.remove('card-fade-in');
                card.style.animationDelay = '';
            });
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 100}ms`;
                card.classList.add('card-fade-in');
            });
            newPage.classList.add('visible');
        }, 50);
        
    } else {
        console.error(`Sayfa bulunamadı: ${pageId}`);
        location.hash = 'hero'; // Sayfa bulunamazsa anasayfaya dön
    }
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const navbar = document.getElementById('navbar');
            if (navbar) {
                navbar.classList.toggle('open');
                const mobileLangSelector = navbar.querySelector('.language-selector.mobile-only');
                if (mobileLangSelector) {
                    mobileLangSelector.style.display = 'flex';
                }
            }
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const navbar = document.getElementById('navbar');
            if (navbar) {
                navbar.classList.remove('open');
                const mobileLangSelector = navbar.querySelector('.language-selector.mobile-only');
                if (mobileLangSelector) mobileLangSelector.style.display = 'none';
            }
        });
    });
}

function setupScrollReveal() {
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        heroSection.classList.add('visible');
    }
}

function setupCardAnimations() {
    // Bu fonksiyon artık showPage içinde çağrılıyor
}

const projects = {
  otel: [
    { name: "Lüks Kral Dairesi", price: " gecelik ₺15.000", img: "assets/otel1.webp" },
    { name: "Deniz Manzaralı Suit", price: " gecelik ₺8.500", img: "assets/otel2.webp" },
    { name: "Standart Oda", price: " gecelik ₺4.200", img: "assets/otel3.webp" },
    { name: "Aile Odası", price: " gecelik ₺6.800", img: "assets/otel4.webp" },
    { name: "Ekonomik Oda", price: " gecelik ₺3.500", img: "assets/otel5.webp" }
  ],
  insaat: [
    { name: "Modern Gökdelen", img: "assets/insaat1.webp" },
    { name: "Alışveriş Merkezi", img: "assets/insaat2.webp" },
    { name: "Lüks Konut Sitesi", img: "assets/insaat3.webp" },
    { name: "Ofis Kuleleri", img: "assets/insaat4.webp" },
    { name: "Endüstriyel Tesis", img: "assets/insaat5.webp" }
  ],
  restorasyon: [
    { name: "Tarihi Yalı Restorasyonu", img: "assets/restorasyon1.webp" },
    { name: "Eski Kilise Canlandırma", img: "assets/restorasyon2.webp" },
    { name: "Kervansaray Yenileme", img: "assets/restorasyon3.webp" },
    { name: "Tarihi Saat Kulesi", img: "assets/restorasyon4.webp" },
    { name: "Şehir Surları", img: "assets/restorasyon5.webp" }
  ],
  satilik_kiralik: [
    { name: "Satılık Lüks Villa", price: "₺45.000.000", img: "https://placehold.co/320x220/f59e0b/0a0a0a?text=Satılık+Ev" },
    { name: "Kiralık Rezidans", price: "aylık ₺80.000", img: "https://placehold.co/320x220/f59e0b/0a0a0a?text=Kiralık+Ev" }
  ]
};

function preloadProjectImages() {
    const allImageUrls = [
        ...projects.otel.map(p => p.img),
        ...projects.insaat.map(p => p.img),
        ...projects.restorasyon.map(p => p.img),
        ...projects.satilik_kiralik.map(p => p.img)
    ]; 
    allImageUrls.forEach(url => {
        if (url.startsWith('http')) return; 
        const img = new Image();
        img.src = url; 
    });
    console.log("Proje görselleri arka planda yükleniyor.");
}

function loadCategory(category, checkin = null, checkout = null) {
  if (category === 'satilik_kiralik') {
      return; 
  }
  const grid = document.getElementById("project-grid"); 
  if (!grid) {
      console.error("Proje grid'i bulunamadı (ID: project-grid)");
      return;
  }
  grid.style.opacity = "0";

  const titleEl = document.getElementById('projects-title'); 
  const currentLang = localStorage.getItem('lang') || 'tr';
  const langData = translations[currentLang] || {}; 
  
  const titles = {
        'otel': langData.page_otel_h1 || 'Otelimiz',
        'insaat': langData.page_insaat_h1 || 'İnşaat Projeleri',
        'restorasyon': langData.page_restorasyon_h1 || 'Restorasyon Projeleri',
        'satilik_kiralik': langData.page_satilik_h2 || 'Satılık/Kiralık Evler',
        'default_projects': langData.projects_title_featured || 'Öne Çıkan Projelerimiz'
  };
  
  if (titleEl) {
      if(category === 'otel' && checkin && checkout) {
          const dateTitle = (langData.no_rooms || 'Müsait Odalar').replace('Bu tarihlerde müsait oda bulunamadı.', '').trim();
          titleEl.textContent = `${titles['otel']} ${dateTitle} (${checkin} - ${checkout})`;
      } else {
          titleEl.textContent = titles[category] || titles['default_projects'];
      }
  }

  setTimeout(() => {
    grid.innerHTML = "";
    let itemsToDisplay = projects[category];
    
    if(category === 'otel' && checkin) {
        itemsToDisplay = projects.otel.filter(() => Math.random() > 0.3); 
        if (itemsToDisplay.length === 0) {
            grid.innerHTML = `<p data-key="no_rooms">${langData.no_rooms || 'Bu tarihlerde müsait oda bulunamadı.'}</p>`;
            grid.style.opacity = "1";
            return;
        }
    }

    if (!itemsToDisplay) {
        grid.innerHTML = `
            <div class="project-card">
              <img src="assets/for_konut.webp" alt="Konut Projesi" loading="lazy">
              <h3 data-key="project_h3_residence">${langData.project_h3_residence || 'Konut Projeleri'}</h3>
            </div>
            <div class="project-card">
              <img src="assets/for_ticari.webp" alt="Ticari Proje" loading="lazy">
              <h3 data-key="project_h3_commercial">${langData.project_h3_commercial || 'Ticari Projeler'}</h3>
            </div>
            <div class="project-card">
              <img src="assets/for_cok_amacli.webp" alt="Cok Amacli Proje" loading="lazy">
              <h3 data-key="project_h3_multipurpose">${langData.project_h3_multipurpose || 'Çok Amaçlı Alanlar'}</h3>
            </div>`;
        if (titleEl) titleEl.textContent = titles['default_projects'];
        grid.style.opacity = "1";
        return;
    }

    itemsToDisplay.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card";
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      
      const imgSrc = project.img.startsWith('http') ? project.img : `${project.img}`; 
      const priceHTML = project.price ? `<p class="project-price">${project.price}</p>` : '';
      
      card.innerHTML = `<img src="${imgSrc}" alt="${project.name}" loading="lazy" onerror="this.src='https://placehold.co/320x220/111/f59e0b?text=${project.name}'"><h3>${project.name}</h3>${priceHTML}`;
      grid.appendChild(card);
    });
    
    grid.style.opacity = "1";
  }, 300);
}

// === BU FONKSİYON KALDIRILDI ===
// function handleScrollEffects() { ... }
// === KALDIRMA SONU ===

function setupProjectReservation() {
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'project-search') {
            const checkin = document.getElementById('project-check-in').value;
            const checkout = document.getElementById('project-check-out').value;
            const currentLang = localStorage.getItem('lang') || 'tr';
            const langData = translations[currentLang] || {};
            
            if (!checkin || !checkout) {
                alert(langData.alert_dates || 'Lütfen giriş ve çıkış tarihlerini seçin.');
                return;
            }
            if (new Date(checkin) >= new Date(checkout)) {
                alert(langData.alert_invalid_date || 'Çıkış tarihi, giriş tarihinden sonra olmalıdır.');
                return;
            }
            loadCategory('otel', checkin, checkout);
        }
    });
}


document.body.addEventListener('click', (e) => {
    const reservationContainer = document.getElementById("otel-reservation-container");

    if (e.target && e.target.id === 'hero-reserve-btn') {
        if (reservationContainer) {
            reservationContainer.classList.add("show");
            reservationContainer.scrollIntoView({ behavior: "smooth" });
        }
    }
    
    if (e.target && e.target.id === 'otel-close') {
        if (reservationContainer) {
            reservationContainer.classList.remove("show");
            const heroOtel = document.getElementById('page-otel');
            if (heroOtel) {
                heroOtel.scrollIntoView({ behavior: "smooth" });
            }
        }
    }
});


document.body.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'otel-search') {
        const modal = document.getElementById("availability-modal");
        const message = document.getElementById("availability-message");
        if (!modal || !message) return;

        const currentLang = localStorage.getItem('lang') || 'tr';
        const langData = translations[currentLang] || {};

        const checkin = document.getElementById("otel-checkin").value;
        const checkout = document.getElementById("otel-checkout").value;

        if (!checkin || !checkout) {
            message.innerHTML = langData.modal_avail_alert_select || '⚠️ Lütfen giriş ve çıkış tarihlerini seçin.';
            modal.classList.add("show");
            return;
        }

        const oldMailBtn = message.parentElement.querySelector('.btn-mail');
        if (oldMailBtn) oldMailBtn.remove();

        const random = Math.random();
        if (random > 0.5) {
            message.innerHTML = langData.modal_avail_success || '✅ Müsait odalar bulundu!';
            
            const mailBtn = document.createElement("button");
            mailBtn.textContent = langData.btn_mail_reserve || 'E-posta ile Rezervasyon Yap';
            mailBtn.classList.add("btn", "btn-mail");
            mailBtn.style.marginTop = "15px";

            mailBtn.addEventListener("click", () => {
                const subject = encodeURIComponent("Rezervasyon Talebi - Golden Palace Otel");
                const body = encodeURIComponent(`Merhaba,%0A%0A${checkin} - ${checkout} tarihleri arasında rezervasyon yapmak istiyorum.%0A%0Aİyi günler.`);
                window.location.href = `mailto:info@goldenpalace.com?subject=${subject}&body=${body}`;
            });

            message.parentElement.appendChild(mailBtn);
        } else {
            message.innerHTML = langData.modal_avail_fail || '❌ Maalesef bu tarihlerde müsait oda bulunamadı.';
        }

        modal.classList.add("show");
    }

    if (e.target && e.target.id === 'close-modal-btn') {
        const modal = document.getElementById("availability-modal");
        if (modal) modal.classList.remove("show");
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0); 
    
    const desktopLangSelector = document.querySelector('.language-selector.desktop-only');
    const mobileLangSelector = document.querySelector('.language-selector.mobile-only');

    if (window.innerWidth <= 768) {
        if (desktopLangSelector) desktopLangSelector.style.display = 'none';
    } else {
        if (mobileLangSelector) mobileLangSelector.style.display = 'none';
    }
    
    let finalLang = 'tr'; 
    const supportedLangs = ['tr', 'en', 'zh', 'ar'];
    
    const savedLang = localStorage.getItem('lang');
    
    if (savedLang && supportedLangs.includes(savedLang)) {
        finalLang = savedLang;
    } else {
        const browserLang = navigator.language.split('-')[0]; 
        if (supportedLangs.includes(browserLang)) {
            finalLang = browserLang;
        }
    }

    try {
        await setLanguage(finalLang);
    } catch (e) {
        console.error("Dil yüklenemedi:", e);
        await setLanguage('tr'); 
    }
    
    setTimeout(preloadProjectImages, 1000); 
    setupMobileMenu();
    setupProjectReservation(); 

    // === KEŞFET BUTONU (CTA) İÇİN ===
    const cta = document.getElementById("discover-cta");
    if (cta) {
        const button = cta.querySelector(".btn");
        const dropdown = cta.querySelector(".dropdown");

        button.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            cta.classList.toggle("open");
        });

        document.addEventListener("click", e => {
            if (cta && !cta.contains(e.target)) cta.classList.remove("open");
        });

        dropdown.querySelectorAll("a[data-page]").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                const pageId = link.getAttribute("data-page");
                location.hash = pageId;
                cta.classList.remove("open");
            });
        });
    } else {
        console.error("CTA Grubu 'discover-cta' bulunamadı!");
    }

   // === Nav linkleri ve YENİ HERO LİNKLERİ artık hash'i değiştiriyor ===
    document.querySelectorAll('.nav-link[data-page], .btn-hero-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            location.hash = pageId; 
        });
    });  
  // === 'Geri' tuşu artık hash'i değiştiriyor ===
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('btn-page-back')) {
            e.preventDefault();
            const targetHash = e.target.getAttribute('href') || '#hero';
            location.hash = targetHash; 
        }
    });

    // === Hash değişimi ===
    window.addEventListener('hashchange', () => {
        const pageId = location.hash.replace('#', '') || 'hero';
        showPage(pageId);
    });

    const initialPage = location.hash.replace('#', '') || 'hero';
    showPage(initialPage);
}); // ✅ sadece bu bir tane kapanış olacak


let currentImages = [];
let currentIndex = 0;

document.addEventListener("click", function(e) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  
  if (!lightbox || !lightboxImg) return; 

  // SADECE .detail-gallery içindeki resimlere tıklandığında lightbox'ı aç
  const clickedDetailImg = e.target.closest(".detail-gallery img");
  if (clickedDetailImg) {
    const gallery = clickedDetailImg.closest(".detail-gallery");
    currentImages = Array.from(gallery.querySelectorAll("img"));
    currentIndex = currentImages.indexOf(clickedDetailImg);
    
    lightboxImg.src = clickedDetailImg.src;
    lightbox.style.display = "flex";

    updateLightboxNav(); 
  }

  // Lightbox'ın dışına (arka plana) tıklanırsa kapat
  if (e.target.id === "lightbox") {
    lightbox.style.display = "none";
  }
});

// YENİ FONKSİYON: Butonları gizle/göster
function updateLightboxNav() {
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  if (!prevBtn || !nextBtn) return;

  // Baştaysak 'Geri' butonunu gizle
  prevBtn.style.display = (currentIndex === 0) ? 'none' : 'block';
  
  // Sondaysak 'İleri' butonunu gizle
  nextBtn.style.display = (currentIndex === currentImages.length - 1) ? 'none' : 'block';
}

function showNextImage() {
  if (!currentImages.length) return;
  
  // Kapatma mantığı kaldırıldı, sadece ilerle
  if (currentIndex < currentImages.length - 1) { 
    currentIndex++;
  }
  
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightboxImg) {
    lightboxImg.src = currentImages[currentIndex].src;
    lightboxImg.style.transition = "transform 0s";
    lightboxImg.style.transform = "scale(1)";
    scale = 1;
  }
  updateLightboxNav(); // Butonların durumunu güncelle
}

function showPrevImage() {
  if (!currentImages.length) return;

  // Kapatma mantığı kaldırıldı, sadece gerile
  if (currentIndex > 0) {
    currentIndex--;
  } 
  
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightboxImg) {
    lightboxImg.src = currentImages[currentIndex].src;
    lightboxImg.style.transition = "transform 0s";
    lightboxImg.style.transform = "scale(1)";
    scale = 1;
  }
  updateLightboxNav(); // Butonların durumunu güncelle
}


document.addEventListener("keydown", function (e) {
  const lightbox = document.getElementById("lightbox");
  if (lightbox && lightbox.style.display === "flex") {
    if (e.key === "ArrowRight") {
      showNextImage();
    } else if (e.key === "ArrowLeft") {
      showPrevImage();
    } else if (e.key === "Escape") {
      lightbox.style.display = "none";
    }
  }
});

let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50;
const lightbox = document.getElementById("lightbox");

if (lightbox) {
    lightbox.addEventListener("touchstart", function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchEndX = 0;
      }
    }, { passive: true });

    lightbox.addEventListener("touchmove", function(e) {
      if (e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    }, { passive: true });

    lightbox.addEventListener("touchend", function(e) {
      const lightboxImg = document.getElementById("lightbox-img");
      if (!lightboxImg) return;
      const currentScale = lightboxImg.style.transform ? parseFloat(lightboxImg.style.transform.replace("scale(", "")) : 1;
      
      if (currentScale > 1 || e.touches.length > 0) return;
      if (touchStartX === 0 || touchEndX === 0) return; 
      
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > swipeThreshold) { 
        if (diff > 0) { 
          showNextImage();
        } else { 
          showPrevImage();
        }
      }
      touchStartX = 0;
      touchEndX = 0;
    });
}

let scale = 1;
let startDistance = 0;
const lightboxImg = document.getElementById("lightbox-img");

if (lightboxImg) {
    lightboxImg.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.hypot(dx, dy);
      }
    }, { passive: false });

    lightboxImg.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.hypot(dx, dy);
        let pinchScale = newDistance / startDistance;
        scale = Math.min(Math.max(1, pinchScale), 3);
        lightboxImg.style.transform = `scale(${scale})`;
      }
    }, { passive: false });

    lightboxImg.addEventListener("touchend", function () {
      if (scale !== 1) {
        lightboxImg.style.transition = "transform 0.3s ease";
        lightboxImg.style.transform = "scale(1)";
        scale = 1;
        setTimeout(() => lightboxImg.style.transition = "", 300);
      }
    });
}

document.body.addEventListener('click', (e) => {
    const modalOverlay = document.getElementById('restorationImageModal');
    if (!modalOverlay) return;

    if (e.target.closest('.image-modal-close-btn')) {
        closeImageModal();
    }
    if (e.target === modalOverlay) {
        closeImageModal();
    }

    const card = e.target.closest('.restoration-card');
    if (card && (e.target.closest('.img-wrapper') || e.target.closest('.img-comparison-container'))) {
        const modalBeforeImage = document.getElementById('modalBeforeImage');
        const modalAfterImage = document.getElementById('modalAfterImage');
        
        const beforeImg = card.querySelector('.img-wrapper:first-child img');
        const afterImg = card.querySelector('.img-wrapper:last-child img');

        if (beforeImg && afterImg && modalBeforeImage && modalAfterImage) {
            modalBeforeImage.src = beforeImg.src;
            modalAfterImage.src = afterImg.src;
            modalOverlay.classList.add('show');
        }
    }
});

function closeImageModal() {
    const modalOverlay = document.getElementById('restorationImageModal');
    const modalBeforeImage = document.getElementById('modalBeforeImage');
    const modalAfterImage = document.getElementById('modalAfterImage');
    
    if (modalOverlay) modalOverlay.classList.remove('show');
    if (modalBeforeImage) modalBeforeImage.src = '';
    if (modalAfterImage) modalAfterImage.src = '';
}

document.addEventListener('keydown', (event) => {
    const modalOverlay = document.getElementById('restorationImageModal');
    if (event.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('show')) {
        closeImageModal();
    }
});
