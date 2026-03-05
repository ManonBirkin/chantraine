/* =====================================================
   SCRIPT RICH MEDIA — Chantraine À-Venir
   - Lightbox images (zoom/pan)
   - Carrousels vidéo
   - Popup nouvelle vidéo + modale
   - Bouton d'ouverture YouTube mobile
===================================================== */

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    let savedScrollY = 0;

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

    const oldLightbox = document.getElementById("lightbox");
    if (oldLightbox) oldLightbox.remove();
    const oldLightboxPro = document.getElementById("lightbox-pro");
    if (oldLightboxPro) oldLightboxPro.remove();

    const galleryImages = Array.from(document.querySelectorAll('img[data-zoom="1"]'));

    if (galleryImages.length > 0) {
      const lb = document.createElement("div");
      lb.id = "lightbox-pro";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "Galerie d'images en plein écran");
      lb.innerHTML = `
        <button class="lightbox-pro-close" type="button" aria-label="Fermer (Échap)">&#10005;</button>
        <button class="lightbox-pro-nav lightbox-pro-prev" type="button" aria-label="Image précédente">&#8249;</button>
        <button class="lightbox-pro-nav lightbox-pro-next" type="button" aria-label="Image suivante">&#8250;</button>
        <div class="lightbox-pro-nav-zone lightbox-pro-nav-zone-prev" aria-hidden="true"></div>
        <div class="lightbox-pro-nav-zone lightbox-pro-nav-zone-next" aria-hidden="true"></div>
        <div class="lightbox-pro-counter" aria-live="polite">1 / ${galleryImages.length}</div>
        <div class="lightbox-pro-viewport">
          <img class="lightbox-pro-img" alt="" draggable="false">
        </div>
        <p class="lightbox-pro-hint">Double-clic pour zoomer • ← → pour naviguer • Échap pour fermer</p>
        <div class="lightbox-pro-controls" role="group" aria-label="Contrôles de zoom">
          <button class="lightbox-pro-zoom-btn lightbox-pro-zoom-out" type="button" data-action="out" aria-label="Dézoomer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <span class="lightbox-pro-zoom-level">100%</span>
          <button class="lightbox-pro-zoom-btn lightbox-pro-zoom-in" type="button" data-action="in" aria-label="Zoomer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      `;
      document.body.appendChild(lb);

      const lbViewport = lb.querySelector(".lightbox-pro-viewport");
      const lbImg = lb.querySelector(".lightbox-pro-img");
      const lbClose = lb.querySelector(".lightbox-pro-close");
      const lbPrev = lb.querySelector(".lightbox-pro-prev");
      const lbNext = lb.querySelector(".lightbox-pro-next");
      const lbZonePrev = lb.querySelector(".lightbox-pro-nav-zone-prev");
      const lbZoneNext = lb.querySelector(".lightbox-pro-nav-zone-next");
      const lbCounter = lb.querySelector(".lightbox-pro-counter");
      const lbZoomLevel = lb.querySelector(".lightbox-pro-zoom-level");
      const lbZoomBtns = lb.querySelectorAll(".lightbox-pro-zoom-btn");

      let isOpen = false;
      let currentIndex = 0;
      let lastFocused = null;

      let scale = 1;
      let translateX = 0;
      let translateY = 0;
      const MIN_SCALE = 1;
      const MAX_SCALE = 3;

      let isPanning = false;
      let panStartX = 0;
      let panStartY = 0;
      let startTranslateX = 0;
      let startTranslateY = 0;

      let swipeStartX = 0;
      let swipeStartY = 0;
      let swipeDeltaX = 0;
      let isSwipe = false;

      let lastTapTime = 0;

      function updateTransform(animate = true) {
        lbImg.style.transition = animate ? "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)" : "none";
        lbImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

        lbZoomLevel.textContent = Math.round(scale * 100) + "%";

        if (scale > 1) lbImg.classList.add("can-pan");
        else lbImg.classList.remove("can-pan");

        lbZoomBtns.forEach((btn) => {
          if (btn.dataset.action === "out") btn.disabled = scale <= MIN_SCALE;
          if (btn.dataset.action === "in") btn.disabled = scale >= MAX_SCALE;
        });
      }

      function clampPan() {
        const imgRect = lbImg.getBoundingClientRect();
        const viewportRect = lbViewport.getBoundingClientRect();

        const baseWidth = imgRect.width / scale;
        const baseHeight = imgRect.height / scale;

        const overflowX = Math.max(0, (baseWidth * scale - viewportRect.width) / 2);
        const overflowY = Math.max(0, (baseHeight * scale - viewportRect.height) / 2);

        translateX = Math.max(-overflowX, Math.min(overflowX, translateX));
        translateY = Math.max(-overflowY, Math.min(overflowY, translateY));
      }

      function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform(true);
      }

      function zoomTo(newScale, centerX = null, centerY = null) {
        const oldScale = scale;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        if (scale === oldScale) return;

        if (scale === 1) {
          translateX = 0;
          translateY = 0;
        } else if (centerX !== null && centerY !== null) {
          const imgRect = lbImg.getBoundingClientRect();
          const imgCenterX = imgRect.left + imgRect.width / 2;
          const imgCenterY = imgRect.top + imgRect.height / 2;
          const offsetX = centerX - imgCenterX;
          const offsetY = centerY - imgCenterY;

          const scaleFactor = scale / oldScale;
          translateX = translateX - offsetX * (scaleFactor - 1);
          translateY = translateY - offsetY * (scaleFactor - 1);
        }

        clampPan();
        updateTransform(true);
      }

      function updateCounter() {
        lbCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
        lbPrev.disabled = galleryImages.length <= 1;
        lbNext.disabled = galleryImages.length <= 1;
      }

      function loadImage(index) {
        currentIndex = index;
        resetZoom();

        const img = galleryImages[index];
        lbImg.classList.add("is-entering");
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || "Image agrandie";

        setTimeout(() => lbImg.classList.remove("is-entering"), 200);
        updateCounter();
      }

      function goToNext() {
        if (galleryImages.length <= 1) return;
        resetZoom();
        loadImage((currentIndex + 1) % galleryImages.length);
      }

      function goToPrev() {
        if (galleryImages.length <= 1) return;
        resetZoom();
        loadImage((currentIndex - 1 + galleryImages.length) % galleryImages.length);
      }

      function openLightbox(index) {
        lastFocused = document.activeElement;
        isOpen = true;
        lb.classList.add("is-open");
        loadImage(index);
        lockScroll();
        setTimeout(() => lbClose.focus(), 100);
      }

      function closeLightbox() {
        isOpen = false;
        lb.classList.remove("is-open");
        resetZoom();
        unlockScroll();
        if (lastFocused) {
          lastFocused.focus();
          lastFocused = null;
        }
      }

      galleryImages.forEach((img, idx) => {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", (e) => {
          e.preventDefault();
          openLightbox(idx);
        });
      });

      lbClose.addEventListener("click", closeLightbox);

      lb.addEventListener("click", (e) => {
        if (e.target === lb || e.target === lbViewport) closeLightbox();
      });

      lbPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        goToPrev();
      });
      lbNext.addEventListener("click", (e) => {
        e.stopPropagation();
        goToNext();
      });
      lbZonePrev.addEventListener("click", (e) => {
        e.stopPropagation();
        goToPrev();
      });
      lbZoneNext.addEventListener("click", (e) => {
        e.stopPropagation();
        goToNext();
      });

      lbZoomBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === "in") zoomTo(scale + 0.2);
          if (action === "out") zoomTo(scale - 0.2);
        });
      });

      lbImg.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (scale === 1) zoomTo(2, e.clientX, e.clientY);
        else resetZoom();
      });

      lbViewport.addEventListener(
        "wheel",
        (e) => {
          if (!isOpen) return;
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.2 : 0.2;
          zoomTo(scale + delta, e.clientX, e.clientY);
        },
        { passive: false }
      );

      lbImg.addEventListener("mousedown", (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        lbImg.classList.add("is-panning");
      });

      window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        clampPan();
        updateTransform(false);
      });

      window.addEventListener("mouseup", () => {
        if (isPanning) {
          isPanning = false;
          lbImg.classList.remove("is-panning");
        }
      });

      let touchStartDistance = 0;
      let touchStartScale = 1;
      let touchStartCenter = { x: 0, y: 0 };

      lbViewport.addEventListener(
        "touchstart",
        (e) => {
          if (!isOpen) return;

          const now = Date.now();
          if (e.touches.length === 1) {
            if (now - lastTapTime < 300) {
              e.preventDefault();
              if (scale === 1) zoomTo(2, e.touches[0].clientX, e.touches[0].clientY);
              else resetZoom();
              lastTapTime = 0;
              return;
            }
            lastTapTime = now;
          }

          if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (scale > 1) {
              isPanning = true;
              panStartX = touch.clientX;
              panStartY = touch.clientY;
              startTranslateX = translateX;
              startTranslateY = translateY;
              lbImg.classList.add("is-panning");
            } else {
              isSwipe = true;
              swipeStartX = touch.clientX;
              swipeStartY = touch.clientY;
              swipeDeltaX = 0;
            }
          } else if (e.touches.length === 2) {
            isPanning = false;
            isSwipe = false;
            touchStartDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            touchStartScale = scale;
            touchStartCenter = {
              x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
              y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
          }
        },
        { passive: false }
      );

      lbViewport.addEventListener(
        "touchmove",
        (e) => {
          if (!isOpen) return;

          if (e.touches.length === 2) {
            e.preventDefault();
            const distance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = touchStartScale * (distance / touchStartDistance);
            zoomTo(newScale, touchStartCenter.x, touchStartCenter.y);
          } else if (e.touches.length === 1) {
            if (isPanning && scale > 1) {
              e.preventDefault();
              const touch = e.touches[0];
              const dx = touch.clientX - panStartX;
              const dy = touch.clientY - panStartY;
              translateX = startTranslateX + dx;
              translateY = startTranslateY + dy;
              clampPan();
              updateTransform(false);
            } else if (isSwipe && scale === 1) {
              const touch = e.touches[0];
              swipeDeltaX = touch.clientX - swipeStartX;
              const swipeDeltaY = touch.clientY - swipeStartY;

              if (Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY) && Math.abs(swipeDeltaX) > 10) {
                e.preventDefault();
              }
            }
          }
        },
        { passive: false }
      );

      lbViewport.addEventListener("touchend", () => {
        if (isPanning) {
          isPanning = false;
          lbImg.classList.remove("is-panning");
        }

        if (isSwipe && scale === 1) {
          if (Math.abs(swipeDeltaX) > 50) {
            if (swipeDeltaX > 0) goToPrev();
            else goToNext();
          }
          isSwipe = false;
          swipeDeltaX = 0;
        }
      });

      document.addEventListener("keydown", (e) => {
        if (!isOpen) return;

        switch (e.key) {
          case "Escape":
            closeLightbox();
            break;
          case "ArrowLeft":
            e.preventDefault();
            goToPrev();
            break;
          case "ArrowRight":
            e.preventDefault();
            goToNext();
            break;
          case "+":
          case "=":
            e.preventDefault();
            zoomTo(scale + 0.2);
            break;
          case "-":
          case "_":
            e.preventDefault();
            zoomTo(scale - 0.2);
            break;
          case "0":
            e.preventDefault();
            resetZoom();
            break;
        }
      });

      lb.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && isOpen) {
          const focusable = lb.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    (function initVideoCarousels() {
      const carousels = document.querySelectorAll("[data-video-carousel]");
      if (!carousels.length) return;

      carousels.forEach((carousel) => {
        const track = carousel.querySelector("[data-vc-track]");
        const prev = carousel.querySelector("[data-vc-prev]");
        const next = carousel.querySelector("[data-vc-next]");
        if (!track || !prev || !next) return;

        const step = () => {
          const card = track.querySelector(".vc-card");
          if (!card) return 280;
          const gap = parseFloat(getComputedStyle(track).gap || "12") || 12;
          return card.getBoundingClientRect().width + gap;
        };

        prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
        next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

        const vids = track.querySelectorAll("video");
        vids.forEach((v) =>
          v.addEventListener("play", () => {
            vids.forEach((o) => {
              if (o !== v) o.pause();
            });
          })
        );
      });
    })();

    (function initNewVideoPopup() {
      const VIDEO_ID = "3toHL175wg8";
      const POPUP_DURATION_MS = 9000;
      const STORAGE_KEY = "nv_newvideo_seen_v1";

      const popup = document.getElementById("newvideo-popup");
      const modal = document.getElementById("video-modal");
      const modalFrame = document.getElementById("video-modal-frame");

      if (!popup) return;

      const btnClosePopup = popup.querySelector("[data-nv-close]");
      const btnOpenVideo = popup.querySelector("[data-open-video]");
      const btnCloseVideo = modal ? modal.querySelector("[data-close-video]") : null;

      let timer = null;

      function showPopup() {
        popup.hidden = false;
        popup.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => popup.classList.add("is-open"));
        timer = setTimeout(hidePopup, POPUP_DURATION_MS);
      }

      function hidePopup() {
        if (timer) clearTimeout(timer);

        popup.classList.remove("is-open");
        popup.setAttribute("aria-hidden", "true");
        setTimeout(() => {
          popup.hidden = true;
        }, 250);

        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch (_err) {
          // noop
        }
      }

      function openVideoModal() {
        hidePopup();

        if (!modal || !modalFrame) return;

        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");

        modalFrame.innerHTML = `
          <iframe
            src="https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0"
            title="Lecture vidéo"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
          ></iframe>
        `;

        lockScroll();
      }

      function closeVideoModal() {
        if (!modal || !modalFrame) return;

        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        modalFrame.innerHTML = "";
        unlockScroll();
      }

      btnClosePopup?.addEventListener("click", hidePopup);
      btnOpenVideo?.addEventListener("click", openVideoModal);

      popup.addEventListener("click", (e) => {
        if (e.target === popup) hidePopup();
      });

      if (modal) {
        btnCloseVideo?.addEventListener("click", closeVideoModal);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeVideoModal();
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (modal && !modal.hidden) closeVideoModal();
          if (!popup.hidden) hidePopup();
        }
      });

      if (window.__nv_popup_shown__) return;
      window.__nv_popup_shown__ = true;

      let seen = false;
      try {
        seen = localStorage.getItem(STORAGE_KEY) === "1";
      } catch (_err) {
        seen = false;
      }

      if (!seen) showPopup();
    })();

    const isAndroid = /Android/i.test(navigator.userAgent || "");
    document.documentElement.classList.toggle("is-android", isAndroid);

    document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]').forEach((iframe) => {
      const src = iframe.getAttribute("src") || "";
      const match = src.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (!match) return;

      const videoId = match[1];
      const watchUrl = `https://youtu.be/${videoId}`;
      const container = iframe.parentElement;
      if (!container) return;

      if (container.querySelector(".yt-open-btn")) return;

      container.classList.add("yt-embed-wrap");

      const btn = document.createElement("a");
      btn.href = watchUrl;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.className = "yt-open-btn";
      btn.textContent = isAndroid ? "YouTube (Android)" : "YouTube";
      btn.setAttribute(
        "aria-label",
        isAndroid ? "Ouvrir la vidéo dans l’application YouTube" : "Ouvrir la vidéo sur YouTube"
      );

      container.appendChild(btn);
    });
  });
})();
