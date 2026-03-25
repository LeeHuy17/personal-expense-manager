export function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }
  
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-orange-500'
  };
  const iconsMap = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle'
  };

  toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300 z-[100]`;
  toast.innerHTML = `
    <i data-lucide="${iconsMap[type]}" class="w-5 h-5"></i>
    <p class="font-bold text-sm">${message}</p>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-full');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}