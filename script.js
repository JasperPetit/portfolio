/**
 * =============================================================================
 * PORTFOLIO JASPER PETIT — script.js
 * Fonctionnalités :
 *   1. Navbar : transition pleine largeur → pilule au scroll
 *   2. Menu hamburger mobile
 *   3. Parcours : révélation au scroll (IntersectionObserver)
 *   4. Projets : génération dynamique des cartes
 *   5. Projets : recherche en temps réel + filtres multi-critères cumulatifs
 *   6. Projets : modale de détail
 *
 * Les barres de progression des compétences sont entièrement en CSS pur
 * (variable --pct + transition au :hover). Aucun JS nécessaire.
 * =============================================================================
 */

const $  = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));


/* ============================================================================
   1. NAVBAR — Transition vers pilule au scroll
   On bascule la classe .scrolled dès que window.scrollY > 50px.
============================================================================ */
(function initNavbarScroll() {
  const navbar = $('#navbar');
  if (!navbar) return;

  const SCROLL_THRESHOLD = 50;

  /**
   * Ajoute / retire la classe .scrolled selon la position de scroll.
   * Throttle simple via requestAnimationFrame pour éviter les calls inutiles.
   */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > SCROLL_THRESHOLD) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  /* Déclenche une première vérif au chargement (utile si l'utilisateur
     recharge la page déjà scrollée) */
  onScroll();
})();


/* ============================================================================
   1bis. HERO — EFFET DE PARTICULES BLANCHES
   Canvas en arrière-plan du .hero, particules qui dérivent doucement avec
   des lignes de connexion entre voisines proches (effet "constellation").
   Pure Canvas API, aucune dépendance.
============================================================================ */
(function initParticles() {
  const hero = $('.hero');
  if (!hero) return; /* Présent uniquement sur index.html */

  /* Respect des préférences d'accessibilité : pas d'animation si l'utilisateur
     a coché "Reduce motion" dans son OS */
  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  /* ----- Création et injection du canvas ----- */
  const canvas = document.createElement('canvas');
  canvas.className = 'particles-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);

  const ctx = canvas.getContext('2d', { alpha: true });

  /* ----- Paramètres ----- */
  const DENSITY        = 14000;  /* 1 particule par X pixels (plus petit = plus dense) */
  const MAX_PARTICLES  = 90;     /* Plafond pour éviter les surcharges sur grand écran */
  const LINK_DISTANCE  = 130;    /* Distance max pour relier 2 particules */
  const PARTICLE_SPEED = 0.35;   /* Vitesse de dérive (faible = doux) */

  let particles = [];
  let width = 0;
  let height = 0;
  let animationId = null;

  /**
   * Adapte la taille du canvas à celle du hero, avec gestion du devicePixelRatio
   * pour un rendu net sur écrans HiDPI.
   */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = hero.getBoundingClientRect();
    width  = rect.width;
    height = rect.height;

    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0); /* Reset avant scale */
    ctx.scale(dpr, dpr);
  }

  /**
   * Crée la nuée de particules en fonction de la surface du hero.
   */
  function createParticles() {
    const count = Math.min(
      Math.floor((width * height) / DENSITY),
      MAX_PARTICLES
    );

    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x:  Math.random() * width,
        y:  Math.random() * height,
        r:  Math.random() * 1.8 + 0.6,                    /* Rayon 0.6 → 2.4px */
        vx: (Math.random() - 0.5) * PARTICLE_SPEED,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED,
        opacity: Math.random() * 0.5 + 0.3,               /* Opacité 0.3 → 0.8 */
      });
    }
  }

  /**
   * Boucle d'animation — appelée à chaque frame.
   */
  function animate() {
    ctx.clearRect(0, 0, width, height);

    /* --- Met à jour et dessine chaque particule --- */
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      /* Rebouclage doux sur les bords (la particule réapparaît du côté opposé) */
      if (p.x < -10)       p.x = width  + 10;
      if (p.x > width + 10)  p.x = -10;
      if (p.y < -10)       p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      /* Petit point blanc */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    }

    /*
     * --- Lignes de connexion entre particules proches ---
     * Boucle imbriquée O(n²), mais n est plafonné à 90 donc ~4000 comparaisons
     * max par frame, ce qui reste largement performant.
     */
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < LINK_DISTANCE) {
          /* L'opacité diminue à mesure que la distance augmente */
          const alpha = 0.18 * (1 - dist / LINK_DISTANCE);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  /* ----- Init ----- */
  function init() {
    resize();
    createParticles();
    if (animationId) cancelAnimationFrame(animationId);
    animate();
  }

  init();

  /* ----- Adaptation au redimensionnement de la fenêtre (debounced) ----- */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  /* ----- Pause de l'animation quand l'onglet est en arrière-plan
     (économie de batterie / CPU) ----- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else if (!animationId) {
      animate();
    }
  });
})();


/* ============================================================================
   2. HAMBURGER MOBILE
============================================================================ */
(function initHamburger() {
  const btn  = $('#hamburger');
  const menu = $('#mobileMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = btn.classList.toggle('open');
    menu.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  /* Ferme le menu si l'utilisateur clique en dehors */
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      btn.classList.remove('open');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* Ferme le menu au clic sur un lien */
  $$('a', menu).forEach((link) => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
})();


/* ============================================================================
   3. PARCOURS — Révélation des items au scroll
============================================================================ */
(function initTimeline() {
  const items = $$('.timeline-item');
  if (items.length === 0) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((item, index) => {
      item.style.transitionDelay = `${index * 0.1}s`;
      observer.observe(item);
    });
  } else {
    items.forEach((item) => item.classList.add('visible'));
  }
})();


/* ============================================================================
   4. PROJETS — Données (Array of Objects)
   Chaque projet contient en plus un tableau `competencies` correspondant
   aux compétences du référentiel BUT Informatique qu'il mobilise.
============================================================================ */
const projects = [
  {
    id: 1,
    title: 'Gestion de Colis',
    type: 'Universitaire',
    hardSkills: ['PHP', 'HTML', 'CSS', 'UML', 'POO', 'Déploiement Docker', 'Gestion de base de données','Git'],
    softSkills: ['Travail en équipe', 'Gestion de projet', 'Gestion des délais et des ressources'],
    competencies: [
      'Réaliser un développement d\'application',
      'Administrer des systèmes informatiques communicants',
      'Gérer des données de l\'information',
      'Conduire un projet',
      'Travailler dans une équipe informatique',
    ],
    shortDesc:
      'Application web de suivi et de gestion de colis développée en équipe dans le cadre du BUT Informatique.',
    longDesc:
      'Ce projet universitaire consistait à concevoir et développer une application web complète de gestion de colis. L\'équipe a pris en charge l\'intégralité de la chaîne : modélisation de la base de données relationnelle, développement back-end en PHP, intégration front-end HTML/CSS et déploiement de l\'ensemble via Docker. L\'application permet l\'enregistrement de colis, leur suivi en temps réel par statut, la gestion des destinataires et des transporteurs, ainsi que la génération de récapitulatifs. Le projet a été réalisé en méthode agile avec des itérations hebdomadaires. \n\n Ce projet m\'a permis de grandement développer mes compétences en développement back-end, notamment sur l\'architecture MVC. J\'ai également pu mobiliser les compétences de gestion de projet et de collaboration dans une équipe informatique grâce à ma position de chef d\'équipe.',
    image: 'images/colis.png',
  },
  {
    id: 2,
    title: 'Nuit de l\'Informatique 2025',
    type: 'Personnel',
    hardSkills: ['HTML', 'CSS', 'Javascript','Git'],
    softSkills: ['Travail en équipe', 'Gestion des délais et des ressources', 'Esprit d\'analyse'],
    competencies: [
      'Réaliser un développement d\'application',
      'Conduire un projet',
      'Travailler dans une équipe informatique',
    ],
    shortDesc:
      'Challenge de développement front-end intensif réalisé en une nuit lors de la Nuit de l\'Informatique 2025.',
    longDesc:
      'La Nuit de l\'Informatique est un défi national durant lequel j\'ai dû réaliser un site web en seulement 16h, accompagné d\'une équipe d\'étudiants. En décembre 2025, j\'ai ainsi passé la nuit à développer une application web interactive entièrement en HTML, CSS et JavaScript Vanilla, sans framework. Le projet imposait des contraintes techniques strictes : code maintenable, interface responsive et expérience utilisateur soignée, tout en respectant des délais extrêmement serrés. \n\n Ce projet, bien que ludique, m\'a appris beaucoup de choses sur le respect des délais et m\'a permis de me tester en travaillant sous pression. J\'ai également pu développer mes compétences en communication spontanée car j\'ai travaillé avec des personnes qui m\'étaient inconnues avant cet événement mais avec qui j\'ai pu garder contact.',
    image: 'https://via.placeholder.com/600x300/2ecc71/ffffff?text=Nuit+de+l\'Informatique',
  },
  {
    id: 3,
    title: 'Développement d\'un Outil IA',
    type: 'Professionnel',
    hardSkills: ['Python', 'Docker', 'Cybersécurité', 'RAG', 'LLM','Git'],
    softSkills: ['Travail en équipe', 'Gestion des délais et des ressources'],
    competencies: [
      'Réaliser un développement d\'application',
      'Optimiser des applications informatiques',
      'Administrer des systèmes informatiques communicants',
      'Conduire un projet',
      'Travailler dans une équipe informatique',
    ],
    shortDesc:
      'Outil IA interne basé sur une architecture RAG avec LLMs locaux, dans un environnement sécurisé.',
    longDesc:
      'Dans le cadre de mon stage de 8 à 9 semaines chez Infodip, j\'ai développé un outil d\'intelligence artificielle destiné à un usage interne. La solution repose sur une architecture RAG (Retrieval-Augmented Generation) combinant un modèle LLM déployé localement pour garantir la confidentialité des données et un moteur de recherche sémantique. L\'ensemble de l\'infrastructure a été conteneurisé avec Docker. J\'ai également mis en place des mesures de cybersécurité adaptées : isolation réseau des conteneurs, chiffrement des communications internes et gestion des secrets.',
    image: 'images/infodip-groupe-logo.png',
  },
  {
    id: 4,
    title: 'Enquête et Recueil de Besoin',
    type: 'Universitaire',
    hardSkills: ['UML', 'Modélisation', 'Analyse fonctionnelle', 'Rédaction technique'],
    softSkills: ['Communication', 'Esprit d\'analyse', 'Gestion de projet', 'Travail en équipe'],
    competencies: [
      'Conduire un projet',
      'Travailler dans une équipe informatique',
    ],
    shortDesc:
      'Projet de recueil et d\'analyse des besoins d\'un commanditaire fictif, avec livraison d\'un dossier fonctionnel complet.',
    longDesc:
      'Ce projet universitaire avait pour objectif de simuler une mission de maîtrise d\'ouvrage. Il s\'agissait d\'interviewer un commanditaire fictif, de formaliser ses besoins métier, puis de produire un dossier fonctionnel complet incluant diagrammes UML (cas d\'utilisation, séquence, classes), maquettes d\'interface et cahier des charges. Ce travail m\'a permis de développer des compétences solides en communication client, en modélisation fonctionnelle et en rédaction technique.',
    image: 'images/besoins.png',
  },
  {
    id: 5,
    title: 'Jeu d\'Échecs en Java',
    type: 'Universitaire',
    hardSkills: ['Java', 'POO', 'Algorithmes', 'Structures de données','Git'],
    softSkills: ['Esprit d\'analyse', 'Autonomie'],
    competencies: [
      'Réaliser un développement d\'application',
      'Optimiser des applications informatiques',
    ],
    shortDesc:
      'Implémentation complète d\'un jeu d\'échecs en console développé en Java orienté objet.',
    longDesc:
      'Ce projet personnel visait à développer un jeu d\'échecs complet et fonctionnel sous la forme d\'une application logicielle en Java natif. L\'enjeu principal était de concevoir un système capable de gérer des règles métiers complexes, de valider des déplacements et de maintenir l\'état d\'une partie en temps réel. Pour y parvenir, mon camarade et moi avons commencé par une phase de modélisation UML approfondie afin de cartographier l\'architecture du logiciel, les héritages et les interactions entre les différentes pièces et le plateau. Cette démarche a fait appel à un fort esprit d\'analyse et à une grande autonomie dans la recherche de solutions. La difficulté principale a résidé dans l\'implémentation de règles spécifiques nécessitant d\'anticiper plusieurs états du jeu, comme le roque ou la détection des échecs et mats. L\'effort de modélisation réalisé en amont s\'est avéré salvateur et m\'a permis de gagner un temps précieux lors du développement, m\'aidant à améliorer considérablement ma maîtrise de la programmation orientée objet pour rendre mon code plus modulaire.',
    image: 'images/echec.webp',
  },
    {
    id: 6,
    title: 'Trésor de banlieue',
    type: 'Universitaire',
    hardSkills: ['Java', 'POO', 'Algorithmes', 'Structures de données'],
    softSkills: ['Esprit d\'analyse', 'Travail en equipe','Gestion de projet'],
    competencies: [
      'Réaliser un développement d\'application',
      'Optimiser des applications informatiques',
    ],
    shortDesc:
      'Création d\'un site vitrine pour une exposition d\'art urbain.',
    longDesc:
      'Ce projet personnel consiste en le développement d\'un jeu d\'échecs entièrement fonctionnel en Java. L\'architecture s\'appuie sur les principes de la programmation orientée objet : héritage pour modéliser les pièces, design pattern Strategy pour les règles de déplacement, et pattern Observer pour la synchronisation entre modèle et vue. La logique de jeu inclut la détection des échecs et échec-et-mat, le roque, la prise en passant et la promotion des pions. Ce projet m\'a permis d\'approfondir ma maîtrise de Java et des algorithmes de recherche appliqués à l\'IA.',
    image: 'images/tresor-de-banlieu.webp',
  },
  {
    id: 7,
    title: 'Jeu de puissance 4',
    type: 'Personnel',
    hardSkills: ['Javascript','vue.js','HTML','CSS'],
    softSkills: ['Esprit d\'analyse', 'Autonomie'],
    competencies: [
        'Gérer des données de l\'information'
    ],
    shortDesc:
      'Écriture d\'un petit jeu de puissance 4 en utilisant Vue.js',
    longDesc:
      'J\'ai développé ce jeu de puissance 4 pour mettre en pratique Vue.js après l\'avoir abordé en cours. L\'interface repose sur des composants Vue, du HTML et du CSS. La principale difficulté a été de concevoir l\'algorithme de vérification des victoires, notamment pour détecter les alignements en diagonale après chaque jeton joué. J\'ai résolu le problème en modélisant la grille sous forme de tableau multidimensionnel et en exploitant le système de réactivité du framework. Ce projet m\'a permis de mieux comprendre le cycle de vie des composants Vue et de consolider ma logique sur les structures de données en JavaScript.',
    image: 'images/puissance.png',
  },
  
];


/* ============================================================================
   5. PROJETS — Génération dynamique + filtres + modale
============================================================================ */
(function initProjects() {

  const grid = $('#projectsGrid');
  if (!grid) return; /* Pas sur la page projets */

  const searchInput  = $('#searchInput');
  const noResults    = $('#noResults');
  const countVisible = $('#countVisible');
  const resetBtn     = $('#resetFilters');

  /* ------- État des filtres actifs ------- */
  const activeFilters = {
    type: new Set(),
    hard: new Set(),
    soft: new Set(),
    comp: new Set(), /* Compétences du référentiel BUT Informatique */
  };

  /* ------- 5.1 Rendu d'une carte ------- */
  function createCard(project) {
    const article = document.createElement('article');
    article.className = 'project-card';
    article.setAttribute('role', 'listitem');
    article.setAttribute('data-id', project.id);
    article.setAttribute('data-type', project.type);
    article.setAttribute('data-hard', project.hardSkills.join(',').toLowerCase());
    article.setAttribute('data-soft', project.softSkills.join(',').toLowerCase());
    /* On stocke aussi les compétences BUT pour le filtrage */
    article.setAttribute('data-comp', (project.competencies || []).join(',').toLowerCase());
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', `Voir le projet : ${project.title}`);

    article.innerHTML = `
      <img class="project-card-img" src="${project.image}"
           alt="Illustration du projet ${project.title}" loading="lazy" />
      <div class="project-card-body">
        <span class="project-type-badge badge-${project.type}">${project.type}</span>
        <h2 class="project-card-title">${project.title}</h2>
        <p class="project-card-desc">${project.shortDesc}</p>
        <span class="project-card-cta" aria-hidden="true">Voir le détail →</span>
      </div>
    `;

    article.addEventListener('click', () => openModal(project));
    article.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(project);
      }
    });

    return article;
  }

  /* ------- 5.2 Rendu initial ------- */
  function renderAllCards() {
    grid.innerHTML = '';
    projects.forEach((p) => grid.appendChild(createCard(p)));
    updateCount();
  }

  /* ------- 5.3 Compteur (compte les cartes affichées par style.display) ------- */
  function updateCount() {
    const visible = $$('.project-card', grid).filter(
      (c) => c.style.display !== 'none'
    ).length;
    if (countVisible) countVisible.textContent = visible;
    if (noResults) noResults.classList.toggle('visible', visible === 0);
  }

  /* ------- 5.4 Logique de filtrage cumulatif ------- */
  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const hasTypeFilter = activeFilters.type.size > 0;
    const hasHardFilter = activeFilters.hard.size > 0;
    const hasSoftFilter = activeFilters.soft.size > 0;
    const hasCompFilter = activeFilters.comp.size > 0;

    $$('.project-card', grid).forEach((card) => {
      const cardType  = card.getAttribute('data-type');
      const cardHard  = card.getAttribute('data-hard').split(',');
      const cardSoft  = card.getAttribute('data-soft').split(',');
      const cardComp  = card.getAttribute('data-comp').split(',');
      const cardTitle = card.querySelector('.project-card-title').textContent.toLowerCase();
      const cardDesc  = card.querySelector('.project-card-desc').textContent.toLowerCase();

      /* Recherche textuelle (titre, description, hard, soft, compétences) */
      const matchesSearch =
        !query ||
        cardTitle.includes(query) ||
        cardDesc.includes(query) ||
        cardHard.some((h) => h.includes(query)) ||
        cardSoft.some((s) => s.includes(query)) ||
        cardComp.some((c) => c.includes(query));

      /* Type (OU dans le groupe) */
      const matchesType =
        !hasTypeFilter ||
        activeFilters.type.has(cardType);

      /*
       * Hard Skills (ET : toutes les valeurs sélectionnées doivent être
       * présentes). Correspondance partielle pour gérer "Déploiement Docker"
       * trouvé par le filtre "Docker".
       */
      const matchesHard =
        !hasHardFilter ||
        [...activeFilters.hard].every((filterVal) =>
          cardHard.some((h) => h.includes(filterVal.toLowerCase()))
        );

      /* Soft Skills (même règle ET) */
      const matchesSoft =
        !hasSoftFilter ||
        [...activeFilters.soft].every((filterVal) =>
          cardSoft.some((s) => s.includes(filterVal.toLowerCase()))
        );

      /*
       * Compétences BUT (ET : toutes les compétences sélectionnées doivent
       * être présentes dans la carte). Match exact via .includes après
       * normalisation en minuscule.
       */
      const matchesComp =
        !hasCompFilter ||
        [...activeFilters.comp].every((filterVal) =>
          cardComp.some((c) => c.includes(filterVal.toLowerCase()))
        );

      /*
       * On agit sur style.display car la règle CSS .project-card { display: flex }
       * l'emporte sur l'attribut HTML `hidden` (qui ne fait que mettre display: none).
       */
      const show = matchesSearch && matchesType && matchesHard && matchesSoft && matchesComp;
      card.style.display = show ? '' : 'none';
    });

    updateCount();
  }

  /* ------- 5.5 Boutons filtre (toggle) ------- */
  $$('.filter-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const group = btn.getAttribute('data-filter-group');
      const value = btn.getAttribute('data-filter-value');

      if (activeFilters[group].has(value)) {
        activeFilters[group].delete(value);
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        activeFilters[group].add(value);
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      applyFilters();
    });
  });

  /* ------- 5.6 Bouton reset ------- */
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.keys(activeFilters).forEach((k) => activeFilters[k].clear());
      $$('.filter-btn').forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      if (searchInput) searchInput.value = '';
      applyFilters();
    });
  }

  /* ------- 5.7 Recherche en temps réel ------- */
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  /* ------- Rendu initial ------- */
  renderAllCards();


  /* =========================================================================
     6. MODALE
  ========================================================================= */
  const overlay    = $('#modalOverlay');
  const modal      = $('#modal');
  const closeBtn   = $('#modalClose');
  const modalTitle = $('#modalTitle');
  const modalBadge = $('#modalTypeBadge');
  const modalImg   = $('#modalImg');
  const modalDesc  = $('#modalDesc');
  const modalHard  = $('#modalHardTags');
  const modalSoft  = $('#modalSoftTags');

  let previousFocus = null;

  function openModal(project) {
    if (!overlay || !modal) return;
    previousFocus = document.activeElement;

    if (modalTitle) modalTitle.textContent = project.title;

    if (modalBadge) {
      modalBadge.textContent = project.type;
      modalBadge.className = `modal-type-badge badge-${project.type}`;
    }

    if (modalImg) {
      modalImg.src = project.image;
      modalImg.alt = `Illustration du projet ${project.title}`;
    }

    if (modalDesc) modalDesc.textContent = project.longDesc;

    if (modalHard) {
      modalHard.innerHTML = project.hardSkills
        .map((s) => `<span class="tag-hard">${s}</span>`)
        .join('');
    }

    if (modalSoft) {
      modalSoft.innerHTML = project.softSkills
        .map((s) => `<span class="tag-soft">${s}</span>`)
        .join('');
    }

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  /* Focus trap pour accessibilité */
  if (modal) {
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

})();
