/* =====================================================
   SCRIPT QUESTIONNAIRE
   - Gestion mode anonyme
   - Envoi Netlify Forms + Function
   - UI d'erreur et indicateur scroll
===================================================== */

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    const anonymCheckbox = document.getElementById("anonyme-checkbox");
    const infosPerso = document.getElementById("infos-perso");

    if (anonymCheckbox && infosPerso) {
      const fields = infosPerso.querySelectorAll("input:not(#anonyme-checkbox), textarea");

      anonymCheckbox.addEventListener("change", () => {
        if (anonymCheckbox.checked) {
          infosPerso.classList.add("is-anonyme");
          fields.forEach((field) => {
            field.disabled = true;
            if (field.type === "radio") field.checked = false;
            else field.value = "";
          });
        } else {
          infosPerso.classList.remove("is-anonyme");
          fields.forEach((field) => {
            field.disabled = false;
          });
        }
      });
    }

    const form = document.getElementById("questionnaire-form");
    const submitBtn = document.getElementById("q-submit-btn");
    const errorDiv = document.getElementById("q-error");

    if (form && submitBtn && errorDiv) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorDiv.style.display = "none";

        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi en cours...";

        const formData = new FormData(form);

        if (formData.get("bot-field")) {
          window.location.href = "/merci.html";
          return;
        }

        const jsonData = {};
        formData.forEach((value, key) => {
          if (key !== "bot-field" && key !== "form-name" && key !== "subject") {
            jsonData[key] = value;
          }
        });

        const netlifyFormsPromise = fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(formData).toString(),
        });

        const functionPromise = fetch("/.netlify/functions/submit-questionnaire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonData),
        });

        Promise.allSettled([netlifyFormsPromise, functionPromise])
          .then((results) => {
            const formsOk = results[0].status === "fulfilled" && results[0].value.ok;
            const fnOk = results[1].status === "fulfilled" && results[1].value.ok;

            if (formsOk || fnOk) {
              window.location.href = "/merci.html";
              return;
            }

            throw new Error("Erreur serveur");
          })
          .catch(() => {
            errorDiv.style.display = "block";
            submitBtn.disabled = false;
            submitBtn.textContent = "Soumettre mes réponses";
          });
      });
    }

    const indicator = document.getElementById("scroll-indicator");
    if (indicator) {
      const hide = () => indicator.classList.add("is-hidden");
      if (window.scrollY > 10) hide();
      window.addEventListener("scroll", hide, { once: true, passive: true });
    }
  });
})();
