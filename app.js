const translations = {}; 
const pageCache = {}; 

// === DİL AYARLAMA VE ÇEVİRİ FONKSİYONU ===
async function setLanguage(lang) {
    let langData;

    // Dil daha önce yüklendiyse önbellekten al, yüklenmediyse JSON dosyasını çek
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
            console.warn(`Dil dosyası ${lang}.json yüklenemedi:`, error);
            if (lang !== 'en') {
                return await setLanguage('en'); // Hata durumunda İngilizceye dön
            }
            return;
        }
    }
    
    // HTML dil etiketlerini ve yönünü (Arapça için RTL) ayarla
    document.querySelector('title').textContent = langData['title'] || 'Golden Palace';
    document.documentElement.lang = lang; 
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    // Sayfadaki data-key olan tüm elementleri çevir
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (langData[key]) {
            el.innerHTML = langData[key];
        }
    });

    // === YENİ DİL AÇILIR MENÜSÜ GÜNCELLEMESİ ===
    const langBtnText = document.getElementById('current-lang-text');
    if (langBtnText) {
      langBtnText.textContent = lang.toUpperCase(); // Örn: "TR", "EN"
    }
    
    const langDropdown = document.getElementById('lang-dropdown-list');
    if (langDropdown) {
      langDropdown.classList.remove('show'); // Seçim yapıldıktan sonra menüyü kapat
    }
   
    localStorage.setItem('lang', lang);
}

// === SAYFA GEÇİŞ VE YÜKLEME FONKSİYONU ===
async function showPage(pageId) {
    if (!pageId || pageId === '#') pageId = 'hero';

    // Tüm sayfaları gizle
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    let newPage = document.getElementById(pageId);
    
    // Sayfa DOM'da yoksa fetch ile yükle
    if (!newPage) {
        if (pageCache[pageId]) {
            document.getElementById('page-container').insertAdjacentHTML('beforeend', pageCache[pageId]);
        } else {
            try {
                let fileName = pageId;
                
                // === AKTİF DANIŞMANLIK SAYFALARI ===
                if (pageId === 'page-about') fileName = 'about';
                if (pageId === 'page-services') fileName = 'services';
                if (pageId === 'page-projects') fileName = 'projects';
                if (pageId === 'page-contact') fileName = 'contact';
                if (pageId === 'page-supplier') fileName = "supplier";
                if (pageId === 'page-market-entry') fileName = "market-entry";
                if (pageId === 'page-local-support') fileName = "local-support";
                if (pageId === 'page-risk-control') fileName = "risk-control";
                if (pageId === 'page-communication') fileName = "communication";

                if (fileName !== 'hero') { 
                    const response = await fetch(`${fileName}.html`);
                    if (!response.ok) throw new Error(`Sayfa yüklenemedi: ${fileName}.html`);
                    const html = await response.text();
                    pageCache[pageId] = html; 
                    document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
                }
            } catch (error) {
                console.error(error);
                location.hash = 'hero';
                return;
            }
        }
        newPage = document.getElementById(pageId);
    }

    // Sayfa başarıyla bulunduyse/yüklendiyse göster
    if (newPage) {
        if (location.hash.replace('#', '') !== pageId) {
            location.hash = pageId;
        }

        newPage.classList.add('active');
        window.scrollTo(0, 0); 
        
        // Yeni yüklenen sayfanın dil çevirilerini anında uygula
        const currentLang = localStorage.getItem('lang') || 'en';
        if (translations[currentLang]) {
            newPage.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key];
                }
            });
        }

        // Yumuşak geçiş animasyonları
        newPage.classList.remove('visible');
        setTimeout(() => {
            const cards = newPage.querySelectorAll('.service-card, .content');
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
        location.hash = 'hero';
    }
}

// === MOBİL MENÜ AYARLARI ===
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navbar = document.getElementById('navbar');
    
    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', function() {
            navbar.classList.toggle('open');
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navbar) navbar.classList.remove('open');
        });
    });
}

// === GLOBAL TIKLAMA OLAYLARI (Dropdown ve Geri Tuşu) ===
document.addEventListener('click', function(e) {
    // 1. Dil Açılır Menüsü Kontrolü
    const langBtn = document.getElementById('lang-menu-btn');
    const langDropdown = document.getElementById('lang-dropdown-list');
    
    if (langBtn && langDropdown) {
        if (langBtn.contains(e.target)) {
            langDropdown.classList.toggle('show');
        } else if (!langDropdown.contains(e.target)) {
            langDropdown.classList.remove('show');
        }
    }

    // 2. Sayfalardaki "Geri" tuşunun çalışması
    if (e.target && e.target.classList.contains('btn-page-back')) {
        e.preventDefault();
        const targetHash = e.target.getAttribute('href') || '#hero';
        location.hash = targetHash; 
    }
});

// === TARAYICI İLERİ/GERİ TUŞU KONTROLÜ ===
window.addEventListener('hashchange', () => {
    const pageId = location.hash.replace('#', '') || 'hero';
    showPage(pageId);
});

// === SİTE İLK AÇILDIĞINDA ÇALIŞACAK KODLAR ===
document.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0); 
    
    // Varsayılan dil ayarı (İngilizce)
    let finalLang = 'en'; 
    const supportedLangs = ['en', 'tr', 'ar', 'ru', 'de', 'es', 'zh']; 
    
    const savedLang = localStorage.getItem('lang');
    if (savedLang && supportedLangs.includes(savedLang)) {
        finalLang = savedLang;
    } else {
        const browserLang = navigator.language.split('-')[0]; 
        if (supportedLangs.includes(browserLang)) {
            finalLang = browserLang;
        }
    }

    await setLanguage(finalLang);
    setupMobileMenu();

    // Linklere tıklanınca sayfayı değiştirme özelliği ekle
    document.querySelectorAll('.nav-link[data-page], .btn-hero-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            location.hash = pageId; 
        });
    });

    // URL'deki hash'e göre ilk sayfayı aç
    const initialPage = location.hash.replace('#', '') || 'hero';
    showPage(initialPage);
});