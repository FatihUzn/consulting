const translations = {}; 
const pageCache = {}; 

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
            console.warn(`Dil dosyası ${lang}.json yüklenemedi:`, error);
            if (lang !== 'en') {
                return await setLanguage('en'); 
            }
            return;
        }
    }
    
    document.querySelector('title').textContent = langData['title'] || 'Meridian Turkey';
    document.documentElement.lang = lang; 
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (langData[key]) {
            el.innerHTML = langData[key];
        }
    });

    const langBtnText = document.getElementById('current-lang-text');
    if (langBtnText) {
      langBtnText.textContent = lang.toUpperCase(); 
    }
    
    const langDropdown = document.getElementById('lang-dropdown-list');
    if (langDropdown) {
      langDropdown.classList.remove('show'); 
    }
   
    localStorage.setItem('lang', lang);
}

async function showPage(pageId) {
    if (!pageId || pageId === '#') pageId = 'hero';

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    let newPage = document.getElementById(pageId);
    
    if (!newPage) {
        // pageCache varsa DOM'a TEKRAR ekleme — sayfa zaten ilk yüklemede eklendi,
        // newPage = document.getElementById(pageId) ile bulunur.
        if (!pageCache[pageId]) {
            try {
                let fileName = pageId;
                
                // === ÜST MENÜ (ANA SAYFALAR) ===
                if (pageId === 'page-about') fileName = 'about';
                if (pageId === 'page-services') fileName = 'services';
                if (pageId === 'page-projects') fileName = 'projects';
                if (pageId === 'page-contact') fileName = 'contact';

                // === PATRONUN İSTEDİĞİ 5 YENİ DETAY SAYFASI ===
                if (pageId === 'page-supplier') fileName = "supplier";
                if (pageId === 'page-market-entry') fileName = "market-entry";
                if (pageId === 'page-local-rep') fileName = "local-rep";
                if (pageId === 'page-on-ground') fileName = "on-ground";
                if (pageId === 'page-remote') fileName = "remote";

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
        // pageCache veya fetch sonrası DOM'dan bul
        newPage = document.getElementById(pageId);
    }

    if (newPage) {
        if (location.hash.replace('#', '') !== pageId) {
            location.hash = pageId;
        }

        newPage.classList.add('active');
        window.scrollTo(0, 0); 
        
        const currentLang = localStorage.getItem('lang') || 'en';
        if (translations[currentLang]) {
            newPage.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key];
                }
            });
        }

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

document.addEventListener('click', function(e) {
    const langBtn = document.getElementById('lang-menu-btn');
    const langDropdown = document.getElementById('lang-dropdown-list');
    
    if (langBtn && langDropdown) {
        if (langBtn.contains(e.target)) {
            langDropdown.classList.toggle('show');
        } else if (!langDropdown.contains(e.target)) {
            langDropdown.classList.remove('show');
        }
    }

    if (e.target && e.target.classList.contains('btn-page-back')) {
        e.preventDefault();
        const targetHash = e.target.getAttribute('href') || '#hero';
        location.hash = targetHash; 
    }
});

window.addEventListener('hashchange', () => {
    const pageId = location.hash.replace('#', '') || 'hero';
    showPage(pageId);
});

// ==================== CONTACT FORM ====================
function setupContactForm() {
    // contact.html dinamik yüklendiğinde form bulunamayabilir,
    // bu yüzden document event delegation kullanıyoruz
    document.addEventListener('submit', function(e) {
        if (e.target && e.target.id === 'contactForm') {
            e.preventDefault();
            const name = e.target.querySelector('[data-name="name"]')?.value?.trim()
                      || e.target.querySelectorAll('input')[0]?.value?.trim() || '';
            const email = e.target.querySelector('[data-name="email"]')?.value?.trim()
                       || e.target.querySelectorAll('input')[1]?.value?.trim() || '';
            const message = e.target.querySelector('textarea')?.value?.trim() || '';

            if (!name || !email || !message) {
                alert('Lütfen tüm alanları doldurun.');
                return;
            }

            const waText = encodeURIComponent(`Merhaba,\n\nAdım: ${name}\nE-posta: ${email}\n\nMesaj:\n${message}`);
            window.open(`https://wa.me/905320000000?text=${waText}`, '_blank');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0); 
    
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
    setupContactForm();

    document.querySelectorAll('.nav-link[data-page], .btn-hero-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            location.hash = pageId; 
        });
    });

    const initialPage = location.hash.replace('#', '') || 'hero';
    showPage(initialPage);
});