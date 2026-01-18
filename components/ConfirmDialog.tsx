import React, { useState } from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    requireTextConfirmation?: boolean;
    confirmationText?: string;
    confirmationPlaceholder?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    requireTextConfirmation = false,
    confirmationText = '',
    confirmationPlaceholder = 'Type to confirm'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (requireTextConfirmation && inputValue !== confirmationText) {
            return;
        }

        setIsLoading(true);
        try {
            await onConfirm();
            setInputValue('');
            onClose();
        } catch (error) {
            console.error('Confirmation error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setInputValue('');
        onClose();
    };

    const variantStyles = {
        danger: {
            icon: AlertCircle,
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconColor: 'text-red-600 dark:text-red-500',
            button: 'bg-red-600 hover:bg-red-700 text-white'
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-600 dark:text-orange-500',
            button: 'bg-orange-600 hover:bg-orange-700 text-white'
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    };

    const { icon: Icon, iconBg, iconColor, button } = variantStyles[variant];
    const isConfirmDisabled = requireTextConfirmation && inputValue !== confirmationText;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`${iconBg} p-3 rounded-full`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {message}
                    </p>

                    {requireTextConfirmation && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                                Type "<span className="text-gray-900 dark:text-white">{confirmationText}</span>" to confirm
                            </label>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={confirmationPlaceholder}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-dark-card transition-all"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex gap-3">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled || isLoading}
                        className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${button}`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
