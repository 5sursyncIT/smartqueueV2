'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMonitoring } from '@/lib/hooks/use-superadmin';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Network,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';

export default function MonitoringPage() {
  const { data: monitoring, isLoading } = useMonitoring(30000); // Refresh toutes les 30 secondes
  
  const metrics = monitoring?.metrics || {
    cpu_usage: 0,
    memory_used: 0,
    memory_total: 0,
    disk_used: 0,
    disk_total: 0,
    network_in: 0,
    network_out: 0,
    uptime_days: 0,
  };
  
  const services = monitoring?.services || [];
  const database = monitoring?.database || {
    active_connections: 0,
    total_connections: 0,
    max_connections: 100,
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    const variants = {
      healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      degraded: { label: 'Degraded', className: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      down: { label: 'Down', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
    };

    const { label, className, icon: Icon } = variants[status];
    return (
      <Badge variant="secondary" className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    return `${bytes} GB`;
  };

  const formatBandwidth = (mbps: number) => {
    return `${mbps} MB/s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Surveillance Système</h1>
        <p className="text-gray-600 mt-2">
          Monitoring en temps réel de l'infrastructure
        </p>
      </div>

      {/* Métriques système principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.cpu_usage}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${metrics.cpu_usage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatBytes(metrics.memory_used)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              sur {formatBytes(metrics.memory_total)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(metrics.memory_used / metrics.memory_total) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Space
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatBytes(metrics.disk_used)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              sur {formatBytes(metrics.disk_total)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(metrics.disk_used / metrics.disk_total) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.uptime_days}</div>
            <div className="text-xs text-gray-500 mt-1">jours</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
              <CheckCircle className="h-3 w-3" />
              Aucune interruption
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Inbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatBandwidth(metrics.network_in)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <TrendingUp className="h-3 w-3" />
              Trafic normal
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Outbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatBandwidth(metrics.network_out)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <TrendingUp className="h-3 w-3" />
              Trafic normal
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            État des Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-gray-500">
                        Response time: {service.response_time}ms
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{service.uptime}%</div>
                    <div className="text-xs text-gray-500">Uptime</div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{database.active_connections}</div>
            <div className="text-xs text-gray-500 mt-1">
              Active sur {database.max_connections} max ({database.total_connections} total)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Query Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">12ms</div>
            <div className="text-xs text-gray-500 mt-1">Avg query time</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">94.5%</div>
            <div className="text-xs text-gray-500 mt-1">Redis cache</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
