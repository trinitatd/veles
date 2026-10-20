import React from "react";

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  confirmStyle = "danger", // "danger" | "primary"
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 text-gray-800 dark:text-[#E5E9E4]">
        <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-[#A5B0A7] leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#35443A]">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2e3f34] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              confirmStyle === "danger"
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                : "bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535]"
            }`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

