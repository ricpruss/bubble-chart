/**
 * TypeScript notification utility for bubble chart examples
 * Replaces blocking alert() calls with non-blocking notifications
 */

export interface NotificationOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  backgroundColor?: string;
  textColor?: string;
  maxWidth?: string;
}

export function showNotification(title: string, data: any, options: NotificationOptions = {}): HTMLElement {
    const {
        duration = 4000,
        position = 'top-right',
        backgroundColor = 'rgba(0, 0, 0, 0.9)',
        textColor = 'white',
        maxWidth = '300px'
    } = options;

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        ${position === 'top-right' ? 'top: 20px; right: 20px;' : ''}
        ${position === 'top-left' ? 'top: 20px; left: 20px;' : ''}
        ${position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : ''}
        ${position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : ''}
        background: ${backgroundColor};
        color: ${textColor};
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: ${maxWidth};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: opacity 0.3s ease;
        cursor: pointer;
    `;
    
    // Format content based on data type
    let content: string;
    if (typeof data === 'string') {
        content = data;
    } else if (typeof data === 'object') {
        content = `<pre style="margin: 8px 0 0 0; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>`;
    } else {
        content = String(data);
    }
    
    notification.innerHTML = `
        <strong>${title}</strong><br>
        ${content}
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after specified duration
    const fadeOut = () => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    };
    
    const timeout = setTimeout(fadeOut, duration);
    
    // Allow manual dismissal by clicking
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        fadeOut();
    });
    
    return notification;
}

/**
 * Show a click notification for bubble chart interactions
 */
export function showClickNotification(label: string, data: any): HTMLElement {
    return showNotification(`Clicked: ${label}`, data);
}

/**
 * Show a simple message notification
 */
export function showMessage(message: string, options: NotificationOptions = {}): HTMLElement {
    return showNotification('Info', message, options);
}