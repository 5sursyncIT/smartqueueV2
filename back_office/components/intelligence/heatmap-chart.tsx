'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HourlyHeatmapData } from '@/lib/hooks/use-queue-intelligence';

interface HeatmapChartProps {
  data: HourlyHeatmapData;
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const hours = Object.keys(data.heatmap)
    .map(Number)
    .sort((a, b) => a - b);

  const maxVolume = Math.max(...Object.values(data.heatmap));

  const getIntensityColor = (volume: number) => {
    if (maxVolume === 0) return 'bg-gray-100';

    const intensity = volume / maxVolume;
    if (intensity >= 0.8) return 'bg-red-500';
    if (intensity >= 0.6) return 'bg-orange-400';
    if (intensity >= 0.4) return 'bg-yellow-400';
    if (intensity >= 0.2) return 'bg-green-400';
    return 'bg-blue-200';
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap Horaire</CardTitle>
        <CardDescription>
          Volume moyen de tickets par heure sur {data.period_days} jours
          <br />
          Heure de pointe: {formatHour(data.peak_hour)} ({data.peak_volume.toFixed(1)} tickets/jour)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
            <span>Faible</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-blue-200 rounded" />
              <div className="w-4 h-4 bg-green-400 rounded" />
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <div className="w-4 h-4 bg-orange-400 rounded" />
              <div className="w-4 h-4 bg-red-500 rounded" />
            </div>
            <span>Élevé</span>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-12 gap-2">
            {hours.map((hour) => {
              const volume = data.heatmap[hour];
              const isPeak = hour === data.peak_hour;

              return (
                <div
                  key={hour}
                  className="relative group"
                  title={`${formatHour(hour)}: ${volume.toFixed(1)} tickets`}
                >
                  <div
                    className={`
                      ${getIntensityColor(volume)}
                      h-12 rounded flex items-center justify-center
                      transition-transform hover:scale-110
                      ${isPeak ? 'ring-2 ring-purple-600' : ''}
                    `}
                  >
                    <span className="text-xs font-semibold text-gray-700">
                      {hour}h
                    </span>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {formatHour(hour)}: {volume.toFixed(1)} tickets
                      {isPeak && ' 🔥'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Heure de pointe:</span>
                <span className="ml-2 font-semibold">{formatHour(data.peak_hour)}</span>
              </div>
              <div>
                <span className="text-gray-600">Volume max:</span>
                <span className="ml-2 font-semibold">{data.peak_volume.toFixed(1)} tickets/jour</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
