const STYLES = {
  success: 'bg-[#213d2f]',
  error: 'bg-[#8a2f1f]',
  info: 'bg-[#2c3a33]'
};

const Toast = ({ toast }) => {
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-6 max-sm:bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-toast px-4 w-max max-w-full"
    >
      <div className={`${STYLES[toast.type] || STYLES.info} text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium`}>
        {toast.message}
      </div>
    </div>
  );
};

export default Toast;
