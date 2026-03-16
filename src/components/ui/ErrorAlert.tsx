import { AlertCircle, CheckCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  type?: 'error' | 'success' | 'warning';
}

export function ErrorAlert({ message, type = 'error' }: ErrorAlertProps) {
  const styles = {
    error: { bg: 'bg-red-50 border-red-200 text-red-700', Icon: AlertCircle },
    success: { bg: 'bg-green-50 border-green-200 text-green-700', Icon: CheckCircle },
    warning: { bg: 'bg-amber-50 border-amber-200 text-amber-700', Icon: AlertCircle },
  };
  const { bg, Icon } = styles[type];
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${bg}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
