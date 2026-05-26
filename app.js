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
    
    document.querySelector('title').textContent = langData['title'] || 'Kadlance';
    document.documentElement.lang = lang; 
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (langData[key]) {
            el.innerHTML = langData[key];
        }
    });

    // FIX — placeholder çevirilerini uygula
    document.querySelectorAll('[data-placeholder-key]').forEach(el => {
        const key = el.getAttribute('data-placeholder-key');
        if (langData[key]) {
            el.setAttribute('placeholder', langData[key]);
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
        if (pageCache[pageId]) {
            document.getElementById('page-container').insertAdjacentHTML('beforeend', pageCache[pageId]);
        } else {
            try {
                let fileName = pageId;
                
                if (pageId === 'page-about') fileName = 'about';
                if (pageId === 'page-services') fileName = 'services';
                if (pageId === 'page-projects') fileName = 'projects';
                if (pageId === 'page-contact') fileName = 'contact';
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
            // FIX — dinamik yüklenen sayfalarda da placeholder çevirisi uygula
            newPage.querySelectorAll('[data-placeholder-key]').forEach(el => {
                const key = el.getAttribute('data-placeholder-key');
                if (translations[currentLang][key]) {
                    el.setAttribute('placeholder', translations[currentLang][key]);
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

    // Sadece başlangıçta DOM'da olan nav-link'ler için listener
    // Dinamik yüklenen sayfaların nav-link'leri için aşağıdaki
    // event delegation (document click handler) devreye girer
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navbar) navbar.classList.remove('open');
        });
    });
}

// ==================== EVENT DELEGATION ====================
// Hem statik hem dinamik yüklenen sayfalardaki data-page linklerini yakalar
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

    // FIX — dinamik sayfalardaki [data-page] linkleri için event delegation
    // (services.html kartları, projects.html butonu vb.)
    const pageLink = e.target.closest('[data-page]');
    if (pageLink) {
        e.preventDefault();
        const pageId = pageLink.getAttribute('data-page');
        // Mobile menüyü kapat
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.classList.remove('open');
        location.hash = pageId;
    }
});

window.addEventListener('hashchange', () => {
    const pageId = location.hash.replace('#', '') || 'hero';
    showPage(pageId);
});

// ==================== CONTACT FORM ====================
// contact.html'den insertAdjacentHTML ile eklenen <script> taglari tarayici
// guvenlik politikasi geregi calistirilmaz. Bu yuzden AJAX handler burada tanimlanir.
function setupContactForm() {
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form || form.id !== 'contactForm') return;
        e.preventDefault();

        const btn      = form.querySelector('button[type="submit"]');
        const feedback = document.getElementById('form-feedback');
        const data     = new FormData(form);

        btn.disabled    = true;
        btn.textContent = '...';
        if (feedback) feedback.style.display = 'none';

        fetch('mail.php', { method: 'POST', body: data })
            .then(r => r.json())
            .then(res => {
                if (feedback) {
                    feedback.style.display = 'block';
                    if (res.success) {
                        feedback.style.color   = 'var(--gold-light)';
                        feedback.textContent   = res.message;
                        form.reset();
                    } else {
                        feedback.style.color   = '#f87171';
                        feedback.textContent   = res.message;
                    }
                }
            })
            .catch(() => {
                if (feedback) {
                    feedback.style.display = 'block';
                    feedback.style.color   = '#f87171';
                    feedback.textContent   = 'Bir hata oluştu. Lütfen tekrar deneyin.';
                }
            })
            .finally(() => {
                btn.disabled = false;
                // FIX 3 — Aktif dile göre buton metnini geri yaz, hardcoded değil
                const currentLang = localStorage.getItem('lang') || 'en';
                btn.textContent = translations[currentLang]?.btn_get_in_touch || 'Get in Touch';
            });
    });
}

// ==================== SCROLL — HEADER ====================
// FIX 2 — CSS'teki header.scrolled class'ini aktive eden scroll listener
function setupScrollHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });
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
    setupScrollHeader();

    // Statik sayfadaki nav-link'ler için click listener (hero içindekiler)
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
