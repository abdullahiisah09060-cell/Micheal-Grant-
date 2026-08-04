/* --- ADD THIS TO YOUR EXISTING app.js --- */

/**
 * FORM VALIDATOR: Regex patterns for Federal compliance
 */
export const validators = {
    ssn: (val) => /^\d{4}$/.test(val), // Last 4 only
    ein: (val) => /^\d{2}-\d{7}$/.test(val), // XX-XXXXXXX
    routing: (val) => /^\d{9}$/.test(val), // 9 digits
    phone: (val) => /^\+?1?\d{9,15}$/.test(val),
    amount: (val, min = 1000) => parseFloat(val) >= min
};

/**
 * UI FEEDBACK: Visual validation cues
 */
export const markField = (element, isValid, message = "") => {
    const parent = element.closest('.form-group');
    if (!parent) return;

    // Remove existing errors
    const existing = parent.querySelector('.error-msg');
    if (existing) existing.remove();

    if (isValid) {
        element.style.borderColor = 'var(--success)';
        element.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.1)';
    } else {
        element.style.borderColor = 'var(--sba-red)';
        element.style.boxShadow = '0 0 0 3px rgba(200, 16, 46, 0.1)';
        
        const err = document.createElement('small');
        err.className = 'error-msg';
        err.style.cssText = 'color: var(--sba-red); font-size: 11px; font-weight: 700; margin-top: 5px; display: block;';
        err.innerText = message;
        parent.appendChild(err);
    }
};

/**
 * SUBMIT PROTECTION: Prevents double-clicks
 */
export const toggleSubmit = (btn, isProcessing) => {
    btn.disabled = isProcessing;
    btn.style.opacity = isProcessing ? '0.6' : '1';
    btn.style.cursor = isProcessing ? 'not-allowed' : 'pointer';
    btn.innerHTML = isProcessing ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...' : btn.dataset.originalText;
};
