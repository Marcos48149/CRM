interface UsageBarProps {
  used: number;
  limit: number;
  percentage: number;
}

export function UsageBar({ used, limit, percentage }: UsageBarProps) {
  const isUnlimited = limit === -1;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-slate-600">
        <span>Mensajes usados este mes</span>
        <span>
          {isUnlimited ? `${used} / Ilimitado` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-3 w-full rounded-full bg-slate-200">
          <div
            className={`h-3 rounded-full transition-all ${
              percentage > 80
                ? 'bg-red-500'
                : percentage > 50
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {!isUnlimited && (
        <p className="text-xs text-slate-400">
          {percentage > 80
            ? 'Casi sin crédito. Considerá actualizar tu plan.'
            : `${percentage}% utilizado`}
        </p>
      )}
    </div>
  );
}
