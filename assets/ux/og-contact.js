/* OPEN GRAIN — validated contact form controller.
   REPLACE the old submit listener. Client validation is not server security.
   send(payload, {consent}) must resolve ONLY after a confirmed server write. */
(() => {
  'use strict';
  const controllers = new WeakMap();
  const i18n = {
    es: {
      submit: 'Enviar solicitud', pending: 'Enviando…',
      required: 'Completa este campo.', email: 'Introduce un correo electrónico válido.',
      consent: 'Debes aceptar la política de privacidad para enviar la solicitud.',
      summary: 'Revisa los campos indicados antes de enviar.', invalid: 'Revisa este valor.',
      success: 'Solicitud recibida. Nos pondremos en contacto contigo por correo electrónico.',
      failure: 'No hemos podido confirmar el envío. Tus datos siguen aquí. Antes de repetirlo, puedes contactarnos por correo o WhatsApp.'
    },
    en: {
      submit: 'Send request', pending: 'Sending…',
      required: 'Complete this field.', email: 'Enter a valid email address.',
      consent: 'Accept the privacy policy before sending your request.',
      summary: 'Check the highlighted fields before sending.', invalid: 'Check this value.',
      success: 'Request received. We will contact you by email.',
      failure: 'We could not confirm delivery. Your details are still here. Before sending again, you can contact us by email or WhatsApp.'
    }
  };
  function install(form, { send, getLang = () => 'en', requireMessage = true, getLabels = null } = {}) {
    if (!(form instanceof HTMLFormElement) || typeof send !== 'function') {
      throw new TypeError('OGContact needs a form and an async send function.');
    }
    if (controllers.has(form)) return controllers.get(form);
    const abort = new AbortController();
    const signal = abort.signal;
    // getLabels lets the site override individual strings (submit/success) with
    // its own editable copy without forking this module's error messages.
    const t = () => {
      const base = i18n[getLang()] || i18n.en;
      const overrides = typeof getLabels === 'function' ? getLabels() : null;
      return overrides ? { ...base, ...overrides } : base;
    };
    const button = form.querySelector('[type="submit"]');
    if (!button) throw new Error('Contact form needs a submit button.');
    const field = (name) => form.elements.namedItem(name);
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
    const summary = document.createElement('p');
    summary.className = 'og-form-summary';
    summary.id = 'og-contact-summary';
    summary.setAttribute('role', 'alert');
    summary.hidden = true;
    form.prepend(summary);
    const success = document.getElementById('form-success') || document.createElement('div');
    if (!success.isConnected) form.after(success);
    success.id = 'form-success';
    success.hidden = true;
    success.tabIndex = -1;
    success.setAttribute('role', 'status');
    success.setAttribute('aria-live', 'polite');
    const errorNodes = new Map();
    let busy = false;
    let completed = false;
    const noValidateBefore = form.noValidate;
    // We intentionally handle validation ourselves for inline ES/EN errors.
    // This must NOT be copied without the validate() calls below.
    form.noValidate = true;
    for (const name of ['name', 'email', 'consent']) {
      if (field(name)) field(name).required = true;
    }
    if (requireMessage && field('message')) field('message').required = true;
    const autocomplete = { name: 'name', email: 'email', phone: 'tel' };
    Object.entries(autocomplete).forEach(([key, value]) => {
      if (field(key)) field(key).autocomplete = value;
    });
    for (const [key, max] of [['name', 120], ['email', 254], ['phone', 40], ['message', 6000]]) {
      if (field(key)) field(key).maxLength = max;
    }
    fields.forEach((input, i) => {
      if (!input.id) input.id = `og-contact-field-${i}`;
      const error = document.createElement('span');
      error.id = `${input.id}-og-error`;
      error.className = 'og-field-error';
      error.hidden = true;
      // Do not append inside a translated label span that renderContact replaces.
      const label = input.closest('label');
      (label || input.parentElement).append(error);
      const previous = input.getAttribute('aria-describedby') || '';
      input.setAttribute('aria-describedby', [previous, error.id].filter(Boolean).join(' '));
      errorNodes.set(input, { node: error, describedBy: previous });
    });
    function errorFor(input) {
      input.setCustomValidity('');
      if (input.disabled || !input.willValidate) return '';
      if (input.name === 'consent' && !input.checked) return t().consent;
      if (input.required && input.type !== 'checkbox' && !String(input.value).trim()) return t().required;
      if (input.type === 'email' && input.validity.typeMismatch) return t().email;
      return input.checkValidity() ? '' : (input.validity.valueMissing ? t().required : t().invalid);
    }
    function validate(input) {
      const message = errorFor(input);
      const { node } = errorNodes.get(input);
      node.textContent = message;
      node.hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      return !message;
    }
    function refresh() {
      button.textContent = busy ? t().pending : t().submit;
      fields.filter(x => x.hasAttribute('aria-invalid')).forEach(validate);
      if (completed) success.textContent = t().success;
    }
    form.addEventListener('input', (e) => {
      if (errorNodes.has(e.target) && e.target.hasAttribute('aria-invalid')) validate(e.target);
    }, { signal });
    form.addEventListener('change', (e) => {
      if (errorNodes.has(e.target) && e.target.hasAttribute('aria-invalid')) validate(e.target);
    }, { signal });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy || completed) return;
      if (field('email')) field('email').value = field('email').value.trim();
      const invalid = fields.filter(x => !validate(x));
      if (invalid.length) {
        summary.textContent = t().summary;
        summary.hidden = false;
        invalid[0].focus();
        return;
      }
      const value = (key) => String(field(key)?.value || '').trim();
      const payload = {
        name: value('name'), email: value('email'), phone: value('phone') || null,
        service: value('service') || null, preferred_date: value('date') || null,
        budget_range: value('budget') || null, message: value('message') || null
      };
      busy = true;
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      summary.hidden = true;
      refresh();
      try {
        await send(payload, { consent: Boolean(field('consent')?.checked) });
        completed = true;
        form.hidden = true;
        success.textContent = t().success;
        success.hidden = false;
        success.focus();
      } catch {
        // Do not expose backend messages or credentials to the visitor.
        summary.textContent = t().failure;
        summary.hidden = false;
        summary.tabIndex = -1;
        summary.focus();
      } finally {
        busy = false;
        button.disabled = false;
        form.removeAttribute('aria-busy');
        refresh();
      }
    }, { signal });
    const controller = {
      refresh,
      destroy() {
        abort.abort();
        form.noValidate = noValidateBefore;
        errorNodes.forEach(({ node, describedBy }, input) => {
          node.remove();
          input.removeAttribute('aria-invalid');
          if (describedBy) input.setAttribute('aria-describedby', describedBy);
          else input.removeAttribute('aria-describedby');
        });
        summary.remove();
        controllers.delete(form);
      }
    };
    controllers.set(form, controller);
    refresh();
    return controller;
  }
  function setOptions(select, options, placeholder) {
    if (!(select instanceof HTMLSelectElement)) return;
    const selected = select.value;
    const first = new Option(placeholder, '');
    first.disabled = true;
    select.replaceChildren(first, ...options.map(x => new Option(x.label, x.value)));
    select.value = options.some(x => x.value === selected) ? selected : '';
    // Preserve existing stable values, never translate/reorder by selectedIndex.
  }
  window.OGContact = Object.freeze({ install, setOptions });
})();
