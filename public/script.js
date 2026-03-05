/* =====================================================
   SCRIPT CORE — Chantraine À-Venir
   - Menu latéral glissant
   - Animations de reveal
   - Mots rotatifs
   - Titres segmentés
===================================================== */

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    const revealElements = document.querySelectorAll(
      ".reveal, .reveal-stagger, .line-reveal, .split-heading, .scale-in, .slide-in-left, .slide-in-right, .video-wrapper"
    );

    if (revealElements.length > 0 && "IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.15,
          rootMargin: "0px 0px -50px 0px",
        }
      );

      revealElements.forEach((el) => revealObserver.observe(el));
    } else {
      revealElements.forEach((el) => el.classList.add("is-visible"));
    }

    const electionCountdown = document.getElementById("election-countdown");
    if (electionCountdown) {
      const targetDate = new Date(2026, 2, 15);
      targetDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / 86400000);

      if (diffDays > 1) {
        electionCountdown.textContent = `J-${diffDays} avant le vote du 15 mars 2026`;
      } else if (diffDays === 1) {
        electionCountdown.textContent = "Demain : vote du 15 mars 2026";
      } else if (diffDays === 0) {
        electionCountdown.textContent = "Aujourd'hui : vote du 15 mars 2026";
      } else {
        electionCountdown.textContent = `Le vote du 15 mars 2026 est passé (J+${Math.abs(diffDays)})`;
      }
    }

    const introOverlay = document.getElementById("intro-overlay");
    const introEnter = document.getElementById("intro-enter");
    if (introOverlay && introEnter) {
      document.body.classList.add("is-intro-open");

      const closeIntro = () => {
        if (introOverlay.hidden) return;
        introOverlay.setAttribute("aria-hidden", "true");
        introOverlay.hidden = true;
        introOverlay.style.display = "none";
        document.body.classList.remove("is-intro-open");
        document.dispatchEvent(new Event("intro-closed"));
      };

      introEnter.addEventListener("click", (event) => {
        event.preventDefault();
        closeIntro();
      });
      introOverlay.addEventListener("click", (event) => {
        if (event.target === introOverlay) closeIntro();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeIntro();
      });
    }

    const heroCarousel = document.querySelector(".hero-photo-carousel");
    if (heroCarousel) {
      const slides = Array.from(heroCarousel.querySelectorAll(".hero-photo-slide"));
      const dots = Array.from(heroCarousel.querySelectorAll(".hero-photo-dot"));
      const autoMs = Number(heroCarousel.getAttribute("data-auto-ms") || 4200);
      let current = 0;
      let autoStarted = false;

      const setActiveSlide = (nextIndex) => {
        const safeIndex = (nextIndex + slides.length) % slides.length;
        slides.forEach((slide, index) => slide.classList.toggle("is-active", index === safeIndex));
        dots.forEach((dot, index) => dot.classList.toggle("is-active", index === safeIndex));
        current = safeIndex;
      };

      const startAutoCarousel = () => {
        if (autoStarted || slides.length <= 1) return;
        autoStarted = true;

        const firstHoldMs = autoMs * 2;
        window.setTimeout(() => {
          setActiveSlide(current + 1);
          window.setInterval(() => setActiveSlide(current + 1), autoMs);
        }, firstHoldMs);
      };

      dots.forEach((dot, index) => {
        dot.addEventListener("click", () => setActiveSlide(index));
      });

      if (introOverlay && !introOverlay.hidden) {
        document.addEventListener("intro-closed", startAutoCarousel, { once: true });
      } else {
        startAutoCarousel();
      }
    }

    const rotatingContainers = document.querySelectorAll(".rotating-words");
    rotatingContainers.forEach((container) => {
      const words = container.querySelectorAll(".word");
      if (words.length === 0) return;

      let currentIndex = 0;
      words[0].classList.add("is-active");

      setInterval(() => {
        const current = words[currentIndex];
        const nextIndex = (currentIndex + 1) % words.length;
        const next = words[nextIndex];

        current.classList.remove("is-active");
        current.classList.add("is-exiting");

        setTimeout(() => {
          current.classList.remove("is-exiting");
        }, 500);

        next.classList.add("is-active");
        currentIndex = nextIndex;
      }, 2500);
    });

    document.querySelectorAll(".split-heading").forEach((heading) => {
      if (heading.querySelector(".word")) return;

      const text = heading.textContent || "";
      const words = text.split(" ").filter((w) => w.length > 0);
      heading.innerHTML = words.map((word) => `<span class="word">${word}</span>`).join(" ");
    });

    const menuBtn = document.getElementById("menu-btn");
    const menu = document.getElementById("side-menu");
    const overlay = document.getElementById("menu-overlay");
    const menuClose = document.getElementById("menu-close");

    let savedScrollY = 0;
    let menuOpen = false;

    function lockScroll() {
      savedScrollY = window.scrollY || document.documentElement.scrollTop;
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }

    function unlockScroll() {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, savedScrollY);
    }

    function openMenu() {
      if (!menu || !overlay) return;
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      menuBtn?.setAttribute("aria-expanded", "true");
      overlay.hidden = false;
      lockScroll();
      menuOpen = true;
    }

    function closeMenu() {
      if (!menu || !overlay) return;
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      menuBtn?.setAttribute("aria-expanded", "false");
      overlay.hidden = true;
      unlockScroll();
      menuOpen = false;
    }

    menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      menuOpen ? closeMenu() : openMenu();
    });

    menuClose?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
    });

    overlay?.addEventListener("click", closeMenu);

    menu?.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuOpen) closeMenu();
    });
  });
})();
