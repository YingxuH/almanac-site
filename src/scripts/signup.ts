/**
 * Almanac Email Signup Handler
 *
 * Sends email submissions to a Google Apps Script webhook.
 * The webhook stores emails in a Google Sheet.
 *
 * To set up the backend:
 * 1. Create a Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste the following code:
 *
 * function doPost(e) {
 *   var sheet = SpreadsheetApp.getActiveSheet();
 *   var data = JSON.parse(e.postData.contents);
 *   sheet.appendRow([new Date(), data.email, data.source || 'website']);
 *   return ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 *
 * 4. Deploy > New deployment > Web app > Anyone can access
 * 5. Copy the URL and set it as SIGNUP_ENDPOINT below
 */

// Replace with your deployed Google Apps Script URL
const SIGNUP_ENDPOINT = 'https://script.google.com/macros/s/PLACEHOLDER/exec';

export function initSignupForms() {
  document.querySelectorAll('.signup-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.target as HTMLFormElement;
      const container = formEl.closest('.signup-container')!;
      const input = formEl.querySelector('input[type="email"]') as HTMLInputElement;
      const btn = formEl.querySelector('.signup-btn') as HTMLButtonElement;
      const btnText = btn.querySelector('.btn-text')!;
      const spinner = btn.querySelector('.btn-spinner')!;
      const success = container.querySelector('.signup-success')!;
      const error = container.querySelector('.signup-error')!;
      const meta = container.querySelectorAll('.signup-meta');

      const email = input.value.trim();
      if (!email) return;

      // Loading state
      btnText.textContent = 'Subscribing...';
      spinner.classList.remove('hidden');
      btn.disabled = true;
      error.classList.add('hidden');

      try {
        const res = await fetch(SIGNUP_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: container.getAttribute('data-form-id') }),
          mode: 'no-cors', // Google Apps Script requires this
        });

        // no-cors always returns opaque response, so we assume success
        formEl.classList.add('hidden');
        meta.forEach(el => el.classList.add('hidden'));
        success.classList.remove('hidden');
      } catch (err) {
        btnText.textContent = 'Try again';
        spinner.classList.add('hidden');
        btn.disabled = false;
        error.classList.remove('hidden');
      }
    });
  });
}
