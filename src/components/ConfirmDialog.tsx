interface ConfirmDialogProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function ConfirmDialog({ title, onConfirm, onCancel, confirmText = "Confirm" }: ConfirmDialogProps) {
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] bg-[#1c1c1e] rounded-2xl z-[201] flex flex-col items-center overflow-hidden">
        <div className="p-6 text-center w-full">
          <h3 className="text-white font-semibold text-[17px]">{title}</h3>
        </div>
        <div className="flex w-full border-t border-gray-800">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 text-blue-500 font-normal text-[17px] active:bg-gray-800/50 transition-colors border-r border-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-4 text-red-500 font-semibold text-[17px] active:bg-gray-800/50 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}
