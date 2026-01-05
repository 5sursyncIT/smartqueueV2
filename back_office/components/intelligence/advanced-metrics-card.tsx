'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AdvancedMetricsCardProps {
  title: string;
  description?: string;
  value: number | null;
  unit?: string;
  percentage?: number;
  target?: number;
  format?: 'number' | 'percentage' | 'time';
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export function AdvancedMetricsCard({
  title,
  description,
  value,
  unit = '',
  percentage,
  target,
  format = 'number',
  trend,
  icon,
}: AdvancedMetricsCardProps) {
  const formatValue = (val: number | null) => {
    if (val === null) return 'N/A';

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'time':
        // Convert seconds to readable format
        if (val < 60) return `${val}s`;
        if (val < 3600) return `${Math.floor(val / 60)}min`;
        return `${(val / 3600).toFixed(1)}h`;
      default:
        return val.toFixed(0);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getProgressColor = () => {
    if (!target || value === null) return 'bg-blue-500';
    const progress = (value / target) * 100;
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatValue(value)}
              {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
            </span>
            {trend && getTrendIcon()}
          </div>

          {percentage !== undefined && (
            <div className="text-xs text-gray-500">
              {percentage > 0 ? '+' : ''}
              {percentage.toFixed(1)}% vs période précédente
            </div>
          )}

          {target !== undefined && value !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Objectif: {formatValue(target)}</span>
                <span>{((value / target) * 100).toFixed(0)}%</span>
              </div>
              <Progress
                value={(value / target) * 100}
                className="h-2"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
